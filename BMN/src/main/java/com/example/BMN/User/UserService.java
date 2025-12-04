package com.example.BMN.User;

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

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /** 성별을 영문(male/female)으로 정규화 */
    private String normalizeSex(String sex) {
        if (sex == null || sex.isBlank()) return null;
        String s = sex.trim().toLowerCase();
        if (s.equals("남") || s.equals("남성") || s.equals("male") || s.equals("m")) {
            return "male";
        } else if (s.equals("여") || s.equals("여성") || s.equals("female") || s.equals("f")) {
            return "female";
        } else if (s.equals("other") || s.equals("기타")) {
            return "other";
        }
        return sex; // 알 수 없는 값은 그대로 저장
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

    private SiteUser currentUserOrThrow() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || "anonymousUser".equals(auth.getName())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return userRepository.findByUserName(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "사용자 인증 정보를 확인하세요."));
    }

    /* ========================= 팔로우 기능 ========================= */

    /** me가 target을 팔로우(중복 허용 안 함) */
    @Transactional
    public void follow(String targetUsername) {
        SiteUser me = currentUserOrThrow();
        if (me.getUserName().equals(targetUsername)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자기 자신은 팔로우할 수 없습니다.");
        }
        SiteUser target = getUser(targetUsername);

        Set<SiteUser> following = me.getFollow();
        if (following.contains(target)) {
            // 이미 팔로우 중이면 무시(에러 대신 no-op)
            return;
        }
        following.add(target);
        // owning side는 me.follow 이므로 me만 저장해도 조인테이블 반영됨
        userRepository.save(me);
    }

    /** me가 target을 언팔로우(없는 관계면 no-op) */
    @Transactional
    public void unfollow(String targetUsername) {
        SiteUser me = currentUserOrThrow();
        if (me.getUserName().equals(targetUsername)) {
            // 자기 자신 언팔로우는 의미 없음. no-op
            return;
        }
        SiteUser target = getUser(targetUsername);

        Set<SiteUser> following = me.getFollow();
        if (!following.contains(target)) {
            // 팔로우하지 않았다면 no-op
            return;
        }
        following.remove(target);
        userRepository.save(me);
    }

    /** me가 target을 팔로우 중인지 여부 */
    @Transactional(readOnly = true)
    public boolean isFollowing(String targetUsername) {
        SiteUser me = currentUserOrThrow();
        SiteUser target = getUser(targetUsername);
        return userRepository.existsFollowing(me.getId(), target.getId());
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
        Page<SiteUser> page = userRepository.findFollowing(username, pageable);
        return page.map(PublicUserDTO::fromEntity);
    }

    /** username 사용자를 팔로우하는 사람들(팔로워) */
    @Transactional(readOnly = true)
    public Page<PublicUserDTO> findFollowers(String username, Pageable pageable) {
        Page<SiteUser> page = userRepository.findFollowers(username, pageable);
        return page.map(PublicUserDTO::fromEntity);
    }
}