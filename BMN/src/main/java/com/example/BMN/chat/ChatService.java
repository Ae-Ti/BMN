package com.example.BMN.chat;

import com.example.BMN.User.JwtUtil;
import com.example.BMN.User.SiteUser;
import com.example.BMN.User.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    private static final long SSE_TIMEOUT_MS = 30 * 60 * 1000L;
    private final Map<Long, CopyOnWriteArrayList<SseEmitter>> emittersByUser = new ConcurrentHashMap<>();

    public ChatService(ChatMessageRepository chatMessageRepository, UserRepository userRepository, JwtUtil jwtUtil) {
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    /* ===== DTOs ===== */
    public record MessageDto(Long id, String sender, String receiver, String content, LocalDateTime createdAt, boolean fromMe, boolean read) {}
    public record MessageBrief(String text, LocalDateTime createdAt) {}
    public record ConversationSummaryDto(String partner, String nickname, MessageBrief latestMessage, long unreadCount) {}

    /* ===== Helpers ===== */
    private SiteUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || Objects.equals("anonymousUser", auth.getName())) {
            throw new AccessDeniedException("Unauthenticated");
        }
        return userRepository.findByUserName(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("User not found"));
    }

    private SiteUser resolveUser(String username) {
        return userRepository.findByUserName(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
    }

    private MessageDto toDto(ChatMessage m, String meUsername) {
        boolean fromMe = meUsername != null && meUsername.equals(m.getSender().getUserName());
        return new MessageDto(
                m.getId(),
                m.getSender().getUserName(),
                m.getReceiver().getUserName(),
                m.getContent(),
                m.getCreatedAt(),
                fromMe,
                m.getReadAt() != null
        );
    }

            private ConversationSummaryDto toSummary(ChatMessage m, SiteUser me) {
        SiteUser partner = Objects.equals(m.getSender().getId(), me.getId()) ? m.getReceiver() : m.getSender();
        String displayName = (partner.getNickname() != null && !partner.getNickname().isBlank())
            ? partner.getNickname()
            : partner.getUserName();
        return new ConversationSummaryDto(
            partner.getUserName(),
            displayName,
            new MessageBrief(m.getContent(), m.getCreatedAt()),
            0
        );
    }

    private void pushToUser(SiteUser target, SiteUser counterpart, MessageDto dto) {
        if (target == null) return;
        var list = emittersByUser.getOrDefault(target.getId(), new CopyOnWriteArrayList<>());
        if (list.isEmpty()) return;
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("partner", counterpart.getUserName());
        payload.put("message", dto);

        list.forEach(emitter -> {
            try {
                emitter.send(SseEmitter.event().name("message").data(payload));
            } catch (IOException e) {
                emitter.completeWithError(e);
                cleanup(target.getId(), emitter);
            }
        });
    }

    private boolean canSend(SiteUser me, SiteUser partner) {
        if (me == null || partner == null) return false;
        if (Objects.equals(me.getId(), partner.getId())) return true; // self-echo safety
        // Sender must follow target
        return userRepository.existsFollowing(me.getId(), partner.getId());
    }

    private boolean canViewThread(SiteUser me, SiteUser partner) {
        if (me == null || partner == null) return false;
        if (Objects.equals(me.getId(), partner.getId())) return true;
        // View allowed if either direction follows
        return userRepository.existsFollowing(me.getId(), partner.getId())
                || userRepository.existsFollowing(partner.getId(), me.getId());
    }

    private void ensureChatAllowed(SiteUser me, SiteUser partner) {
        if (!canSend(me, partner)) {
            throw new AccessDeniedException("팔로우한 사용자에게만 채팅을 보낼 수 있습니다.");
        }
    }

    /* ===== Public API ===== */

    @Transactional
    public MessageDto sendMessage(String partnerUsername, String content) {
        if (content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("content is required");
        }
        SiteUser me = currentUser();
        SiteUser partner = resolveUser(partnerUsername);
        ensureChatAllowed(me, partner);
        ChatMessage saved = new ChatMessage();
        saved.setSender(me);
        saved.setReceiver(partner);
        saved.setContent(content.trim());
        saved = chatMessageRepository.save(saved);

        MessageDto dto = toDto(saved, me.getUserName());
        pushToUser(partner, me, dto);
        pushToUser(me, partner, dto); // echo for sender if listening elsewhere
        return dto;
    }

    @Transactional
    public Page<MessageDto> listMessages(String partnerUsername, Pageable pageable) {
        SiteUser me = currentUser();
        SiteUser partner = resolveUser(partnerUsername);
        if (!canViewThread(me, partner)) {
            throw new AccessDeniedException("채팅 내역을 볼 수 없습니다.");
        }
        Page<ChatMessage> page = chatMessageRepository.findThread(me, partner, pageable);
        List<MessageDto> mapped = page.getContent().stream()
                .map(m -> toDto(m, me.getUserName()))
                .sorted((a, b) -> a.createdAt().compareTo(b.createdAt()))
                .toList();
        return new PageImpl<>(mapped, pageable, page.getTotalElements());
    }

    @Transactional
    public List<ConversationSummaryDto> listConversations(int page, int size) {
        SiteUser me = currentUser();
        PageRequest req = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ChatMessage> recent = chatMessageRepository.findRecentForUser(me, req);

        Map<String, ConversationSummaryDto> summaries = new LinkedHashMap<>();
        for (ChatMessage m : recent.getContent()) {
            SiteUser partner = Objects.equals(m.getSender().getId(), me.getId()) ? m.getReceiver() : m.getSender();
            if (partner == null) continue;
            if (!canViewThread(me, partner)) continue;
            String key = partner.getUserName();
            if (summaries.containsKey(key)) continue;
            summaries.put(key, toSummary(m, me));
        }

        Map<String, Long> unreadMap = chatMessageRepository.countUnreadByPartner(me).stream()
                .collect(Collectors.toMap(ChatMessageRepository.UnreadCount::getPartner, ChatMessageRepository.UnreadCount::getUnreadCount));

        return summaries.values().stream()
                .map(s -> new ConversationSummaryDto(
                        s.partner(),
                        s.nickname(),
                        s.latestMessage(),
                        unreadMap.getOrDefault(s.partner(), 0L)
                ))
                .toList();
    }

    @Transactional
    public void markAsRead(String partnerUsername) {
        SiteUser me = currentUser();
        SiteUser partner = resolveUser(partnerUsername);
        chatMessageRepository.markRead(me, partner);
    }

    public SseEmitter subscribe(String token) {
        SiteUser me = resolveFromTokenOrContext(token);
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        emittersByUser.computeIfAbsent(me.getId(), k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> cleanup(me.getId(), emitter));
        emitter.onTimeout(() -> cleanup(me.getId(), emitter));
        emitter.onError(e -> cleanup(me.getId(), emitter));

        try {
            emitter.send(SseEmitter.event().name("ping").data("connected"));
        } catch (IOException e) {
            emitter.completeWithError(e);
        }
        return emitter;
    }

    private SiteUser resolveFromTokenOrContext(String token) {
        if (token != null && !token.isBlank()) {
            if (!jwtUtil.validateToken(token)) {
                throw new AccessDeniedException("Invalid token");
            }
            String username = jwtUtil.extractUsername(token);
            return resolveUser(username);
        }
        return currentUser();
    }

    private void cleanup(Long userId, SseEmitter emitter) {
        if (userId == null) return;
        var list = emittersByUser.getOrDefault(userId, new CopyOnWriteArrayList<>());
        list.remove(emitter);
    }
}
