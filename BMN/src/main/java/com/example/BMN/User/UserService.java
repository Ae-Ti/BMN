
package com.example.BMN.User;

import com.example.BMN.Notification.NotificationService;
import com.example.BMN.Recipe.Recipe;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class UserService {
        /**
         * Normalize the sex string to 'M', 'F', or null if invalid.
         */
        private String normalizeSex(String sex) {
            if (sex == null) return null;
            sex = sex.trim().toUpperCase();
            if (sex.equals("M") || sex.equals("F")) return sex;
            return null;
        }
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final FollowRequestRepository followRequestRepository;
    private final NotificationService notificationService;

    public SiteUser getById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. id=" + id));
    }

    /* ========================= 가입/조회 ========================= */

    @Transactional
    public SiteUser create(String userName, String email, String password, String introduction,
                           String nickname, java.time.LocalDate dateOfBirth, String sex) {
        org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(UserService.class);
        log.debug("UserService.create: start userName={}", userName);
        if (userRepository.existsByUserName(userName)) {
            log.warn("UserService.create: userName already exists={}", userName);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 존재하는 아이디입니다.");
        }

        SiteUser user = new SiteUser();
        user.setUserName(userName);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password)); // 비밀번호 해시 저장
        user.setIntroduction(introduction);
        user.setNickname(nickname);
        user.setDateOfBirth(dateOfBirth);
        user.setSex(normalizeSex(sex));
        // newly created users require email verification
        user.setEmailVerified(false);

        try {
            SiteUser saved = userRepository.saveAndFlush(user);
            log.info("UserService.create: saved id={} userName={}", saved.getId(), saved.getUserName());
            return saved;
        } catch (Exception ex) {
            log.error("UserService.create: failed to save userName={}, message={}", userName, ex.getMessage(), ex);
            // Re-throw as runtime to make failures visible during development and to trigger rollback
            throw new RuntimeException("Failed to create user: " + userName, ex);
        }
    }

    /** Create user when password is already hashed (used by pending-registration flow) */
    @Transactional
    public SiteUser createFromPending(PendingRegistration pr) {
        org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(UserService.class);
        String userName = pr.getUserName();
        log.debug("UserService.createFromPending: start userName={}", userName);
        if (userRepository.existsByUserName(userName) || userRepository.existsByEmail(pr.getEmail())) {
            log.warn("UserService.createFromPending: userName or email already exists userName={}", userName);
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "이미 존재하는 아이디입니다.");
        }

        SiteUser user = new SiteUser();
        user.setUserName(pr.getUserName());
        user.setEmail(pr.getEmail());
        user.setPassword(pr.getPasswordHash()); // already hashed
        user.setIntroduction(pr.getIntroduction());
        user.setNickname(pr.getNickname());
        user.setDateOfBirth(pr.getDateOfBirth());
        user.setSex(normalizeSex(pr.getSex()));
        user.setEmailVerified(true); // verified by token

        try {
            SiteUser saved = userRepository.saveAndFlush(user);
            log.info("UserService.createFromPending: saved id={} userName={}", saved.getId(), saved.getUserName());
            return saved;
        } catch (Exception ex) {
            log.error("UserService.createFromPending: failed to save userName={}, message={}", userName, ex.getMessage(), ex);
            throw new RuntimeException("Failed to create user from pending: " + userName, ex);
        }
    }

    public SiteUser getUser(String userName) {
        return userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
    }

    public UserDTO getUserDTO(String username) {
        SiteUser siteUser = getUser(username);
        return new UserDTO(siteUser);
    }

    /* ========================= 즐겨찾기 유틸 ========================= */

    public List<Long> getFavoriteRecipeIds(String username) {
        SiteUser user = getUser(username);
        return user.getFavorite().stream()
                .map(Recipe::getId)
                .collect(Collectors.toList());
    }

    /* ========================= 로그인 사용자 헬퍼 ========================= */

    public SiteUser currentUserOrThrow() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || "anonymousUser".equals(auth.getName())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return userRepository.findByUserName(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "사용자 인증 정보를 확인하세요."));
    }

    /* ========================= 팔로우 기능 ========================= */

    public enum FollowActionResult { FOLLOWED, REQUESTED }

    private boolean follows(SiteUser from, SiteUser to) {
        return userRepository.existsFollowing(from.getId(), to.getId());
    }

    /** 임의 사용자 기준 팔로우 여부 */
    @Transactional(readOnly = true)
    public boolean isFollowing(String fromUsername, String targetUsername) {
        SiteUser from = getUser(fromUsername);
        SiteUser target = getUser(targetUsername);
        return follows(from, target);
    }

    /** me가 target을 팔로우하거나 비공개 계정이면 요청 생성 */
    @Transactional
    public FollowActionResult follow(String targetUsername) {
        SiteUser me = currentUserOrThrow();
        if (me.getUserName().equals(targetUsername)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자기 자신은 팔로우할 수 없습니다.");
        }
        SiteUser target = getUser(targetUsername);

        Set<SiteUser> following = me.getFollow();
        if (following.contains(target)) {
            return FollowActionResult.FOLLOWED;
        }

        // 비공개 계정이면 팔로우 요청을 생성
        if (Boolean.TRUE.equals(target.getPrivateAccount())) {
            var existing = followRequestRepository.findByRequesterAndTargetAndStatus(me, target, FollowRequest.Status.PENDING);
            if (existing.isPresent()) {
                return FollowActionResult.REQUESTED;
            }
            FollowRequest fr = new FollowRequest();
            fr.setRequester(me);
            fr.setTarget(target);
            fr.setStatus(FollowRequest.Status.PENDING);
            followRequestRepository.save(fr);
            org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(UserService.class);
            System.out.println("[DEBUG] UserService.follow: targetId=" + (target != null ? target.getId() : "null") + ", targetUserName=" + (target != null ? target.getUserName() : "null") + ", meId=" + (me != null ? me.getId() : "null") + ", meUserName=" + (me != null ? me.getUserName() : "null") + ", frId=" + fr.getId() + ", frStatus=" + fr.getStatus());
            System.out.println("[DEBUG] UserService.follow: calling notificationService.notify for targetId=" + target.getId() + ", targetUserName=" + target.getUserName());
            log.info("[UserService] Calling notificationService.notify for targetId={}, targetUserName={}", target.getId(), target.getUserName());
            try {
                notificationService.notify(target, "FOLLOW_REQUEST", me.getNickname() + "님이 팔로우를 요청했습니다.", me.getId());
            } catch (Exception e) {
                log.error("[UserService] Error calling notificationService.notify: {}", e.getMessage(), e);
            }
            return FollowActionResult.REQUESTED;
        }

        following.add(target);
        userRepository.save(me);
        return FollowActionResult.FOLLOWED;
    }

    /** me가 target을 언팔로우(요청까지 제거) */
    @Transactional
    public void unfollow(String targetUsername) {
        SiteUser me = currentUserOrThrow();
        if (me.getUserName().equals(targetUsername)) {
            return;
        }
        SiteUser target = getUser(targetUsername);

        Set<SiteUser> following = me.getFollow();
        if (following.contains(target)) {
            following.remove(target);
            userRepository.save(me);
        }

        // 대기 중이던 요청도 함께 정리
        followRequestRepository.deleteByRequesterAndTargetAndStatus(me, target, FollowRequest.Status.PENDING);
    }

    /** me가 target을 팔로우 중인지 여부 (로그인 사용자 기준) */
    @Transactional(readOnly = true)
    public boolean isFollowing(String targetUsername) {
        SiteUser me = currentUserOrThrow();
        SiteUser target = getUser(targetUsername);
        return follows(me, target);
    }

    @Transactional(readOnly = true)
    public boolean isMutual(SiteUser a, SiteUser b) {
        return follows(a, b) && follows(b, a);
    }

    /* ========================= 팔로우 요청 처리 ========================= */

    @Transactional(readOnly = true)
    public List<FollowRequestDTO> pendingRequestsForMe() {
        SiteUser me = currentUserOrThrow();
        return followRequestRepository.findByTargetAndStatusOrderByCreatedAtDesc(me, FollowRequest.Status.PENDING)
                .stream()
                .map(FollowRequestDTO::fromEntity)
                .toList();
    }

    @Transactional
    public void approveRequest(String requesterUsername) {
        SiteUser me = currentUserOrThrow();
        SiteUser requester = getUser(requesterUsername);
        FollowRequest fr = followRequestRepository
            .findByRequesterAndTargetAndStatus(requester, me, FollowRequest.Status.PENDING)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "요청을 찾을 수 없습니다."));

        fr.setStatus(FollowRequest.Status.APPROVED);
        fr.setDecidedAt(java.time.LocalDateTime.now());
        followRequestRepository.save(fr);

        // 팔로우 관계 생성
        requester.getFollow().add(me);
        userRepository.save(requester);

        // 팔로우 승인 알림 생성 (followRequestId 포함)
        notificationService.notify(requester, "FOLLOW_APPROVED", me.getNickname() + "님이 팔로우 요청을 승인했습니다.", me.getId());
    }

    @Transactional
    public void rejectRequest(String requesterUsername) {
        SiteUser me = currentUserOrThrow();
        SiteUser requester = getUser(requesterUsername);
        FollowRequest fr = followRequestRepository
                .findByRequesterAndTargetAndStatus(requester, me, FollowRequest.Status.PENDING)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "요청을 찾을 수 없습니다."));
        fr.setStatus(FollowRequest.Status.REJECTED);
        fr.setDecidedAt(java.time.LocalDateTime.now());
        followRequestRepository.save(fr);
    }

    /* ========================= 팔로워/팔로잉 카운트 ========================= */

    @Transactional(readOnly = true)
    public long countFollowing(String username) {
        SiteUser user = getUser(username);
        return userRepository.countFollowing(user.getId());
    }

    @Transactional(readOnly = true)
    public long countFollowers(String username) {
        SiteUser user = getUser(username);
        return userRepository.countFollowers(user.getId());
    }

    /* ========================= 팔로워/팔로잉 목록 (페이징) ========================= */

    /** username 사용자가 팔로우하는 대상들(팔로잉) */
    @Transactional(readOnly = true)
    public Page<PublicUserDTO> findFollowing(String username, Pageable pageable) {
        return findFollowing(username, null, pageable);
    }

    public Page<PublicUserDTO> findFollowing(String username, String keyword, Pageable pageable) {
        Page<SiteUser> page;
        if (keyword == null || keyword.isBlank()) {
            page = userRepository.findFollowing(username, pageable);
        } else {
            page = userRepository.searchFollowing(username, keyword, pageable);
        }
        return page.map(PublicUserDTO::fromEntity);
    }

    /** username 사용자를 팔로우하는 사람들(팔로워) */
    @Transactional(readOnly = true)
    public Page<PublicUserDTO> findFollowers(String username, Pageable pageable) {
        Page<SiteUser> page = userRepository.findFollowers(username, pageable);
        return page.map(PublicUserDTO::fromEntity);
    }
}