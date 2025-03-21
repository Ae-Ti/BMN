package com.example.BMN.User;

import com.example.BMN.Recipe.Recipe;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public SiteUser create(String userName, String email, String password, String introduction,
                           String nickname, Long age, String sex) {
        if (userRepository.existsByUserName(userName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 존재하는 아이디입니다.");
        }

        SiteUser user = new SiteUser();
        user.setUserName(userName);
        user.setEmail(email);

        // ✅ 비밀번호 암호화는 여기에서 한 번만 수행!
        user.setPassword(passwordEncoder.encode(password));

        user.setIntroduction(introduction);
        user.setNickname(nickname);
        user.setAge(age);
        user.setSex(sex);
        userRepository.save(user);
        return user;
    }

    public SiteUser getUser(String userName) {
        return userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
    }

    public UserDTO getUserDTO(String username) {
        SiteUser siteUser = getUser(username);
        return new UserDTO(siteUser);
    }

    public List<Long> getFavoriteRecipeIds(String username) {
        SiteUser user = getUser(username);
        return user.getFavorite().stream()
                .map(Recipe::getId)
                .collect(Collectors.toList());
    }
}