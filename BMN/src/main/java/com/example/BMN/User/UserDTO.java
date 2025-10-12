package com.example.BMN.User;

import com.example.BMN.Recipe.Recipe;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Getter
@Setter
public class UserDTO {
    private Long id;
    private String userName;
    private String nickname;
    private String email;
    private String password;
    private Long age;
    private String sex;
    private List<Long> followerIds;
    private List<Long> followingIds;
    private List<Long> likeRecipeIds;
    private List<Long> favoriteRecipeIds;
    private List<Long> postRecipeIds;

    public UserDTO(SiteUser siteUser) {
        this.id = siteUser.getId();
        this.userName = siteUser.getUserName();
        this.nickname = siteUser.getNickname();
        this.email = siteUser.getEmail();
        this.password = siteUser.getPassword();
        this.age = siteUser.getAge();
        this.sex = siteUser.getSex();
        this.followerIds = extractIds(siteUser.getFollower());
        this.followingIds = extractIds(siteUser.getFollow());
        this.likeRecipeIds = extractIds(siteUser.getLike());
        this.favoriteRecipeIds = extractIds(siteUser.getFavorite());
        this.postRecipeIds = extractIds(siteUser.getPost());
    }

    private static <T> List<Long> extractIds(Set<T> entities) {
        return entities.stream()
                .map(e -> (e instanceof SiteUser) ? ((SiteUser) e).getId() : ((Recipe) e).getId())
                .collect(Collectors.toList());
    }

    private static List<Long> extractIds(List<Recipe> recipes) {
        return recipes.stream()
                .map(Recipe::getId)
                .collect(Collectors.toList());
    }


}