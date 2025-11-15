package com.example.BMN.User;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

/**
 * Dev-only endpoints to inspect SiteUser rows quickly during debugging.
 * Enabled only when the 'dev' profile is active.
 *
 * NOTE: returning raw JPA entities can cause Jackson serialization problems (lazy props, bidirectional
 * relations). Return a minimal Map/DTO to avoid 500 errors during debugging.
 */
@RestController
@RequestMapping("/__dev")
@Profile("dev")
public class DevUserDebugController {

    private final UserRepository userRepository;

    public DevUserDebugController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // List all users (development convenience) as minimal maps
    @GetMapping("/users")
    public List<Map<String, Object>> listAllUsers() {
        return userRepository.findAll().stream().map(this::toMap).collect(Collectors.toList());
    }

    // Find by email (username) and return minimal map or null
    @GetMapping("/users/by-email")
    public Map<String, Object> findByEmail(@RequestParam("email") String email) {
        return userRepository.findByUserName(email).map(this::toMap).orElse(null);
    }

    private Map<String, Object> toMap(SiteUser u) {
        if (u == null) return null;
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());
        m.put("userName", u.getUserName());
        m.put("email", u.getEmail());
        m.put("nickname", u.getNickname());
        m.put("provider", u.getProvider());
        m.put("providerId", u.getProviderId());
        m.put("profileComplete", u.getProfileComplete());
        return m;
    }
}
