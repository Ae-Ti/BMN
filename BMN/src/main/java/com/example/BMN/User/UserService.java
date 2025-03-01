package com.example.BMN.User;

import com.example.BMN.DataNotFoundException;
import com.example.BMN.Recipe.Recipe;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public SiteUser create(String userName, String email, String password, String introduction
    ,String nickname, Long age, String sex) {
        SiteUser user = new SiteUser();
        user.setUserName(userName);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setIntroduction(introduction);
        user.setNickname(nickname);
        user.setAge(age);
        user.setSex(sex);
        this.userRepository.save(user);
        return user;
    }

    // 유저 조회 (엔티티 반환)
    public SiteUser getUser(String username) {
        return userRepository.findByUserName(username)
                .orElseThrow(() -> new DataNotFoundException("사용자를 찾을 수 없습니다."));
    }

    // 유저 조회 (DTO 반환)
    public UserDTO getUserDTO(String username) {
        SiteUser siteUser = getUser(username);
        return new UserDTO(siteUser);
    }

    // 사용자의 즐겨찾기 레시피 ID 목록 반환
    public List<Long> getFavoriteRecipeIds(String username) {
        SiteUser user = getUser(username);
        return user.getFavorite().stream()
                .map(Recipe::getId)
                .collect(Collectors.toList());
    }
}
