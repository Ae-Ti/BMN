package com.example.BMN.chat;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    public record SendRequest(String content) {}

    @GetMapping("/conversations")
    public List<ChatService.ConversationSummaryDto> conversations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "200") int size
    ) {
        return chatService.listConversations(page, size);
    }

    @GetMapping("/conversations/{partner}/messages")
    public Page<ChatService.MessageDto> messages(
            @PathVariable String partner,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return chatService.listMessages(partner, pageable);
    }

    @PostMapping("/conversations/{partner}/messages")
    public ChatService.MessageDto send(
            @PathVariable String partner,
            @RequestBody SendRequest req
    ) {
        String content = req != null ? req.content() : null;
        return chatService.sendMessage(partner, content);
    }

    @PostMapping("/conversations/{partner}/read")
    public ResponseEntity<Void> markRead(@PathVariable String partner) {
        chatService.markAsRead(partner);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stream")
    public SseEmitter stream(@RequestParam(name = "token", required = false) String token) {
        return chatService.subscribe(token);
    }
}
