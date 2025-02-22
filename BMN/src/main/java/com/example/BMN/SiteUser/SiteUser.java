package com.example.BMN.SiteUser;

import com.example.BMN.Recipe.Recipe;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Setter
@Getter
@Entity
public class SiteUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String username;

    @Column(unique = true)
    private String nickname;

    @Column(columnDefinition = "TEXT")
    private String introduction;

    @Column(unique = true)
    private String email;

    @Column
    private String password;

    @Column
    private Long age;

    @Column
    private Long sex;

    @ManyToMany
    @JoinTable(
            name = "user_follow",
            joinColumns = @JoinColumn(name = "follower_id"),
            inverseJoinColumns = @JoinColumn(name = "follow_id")
    )
    private Set<SiteUser> follow;

    @ManyToMany(mappedBy = "follow")
    Set<SiteUser> follower;

    @ManyToMany @JoinTable(
            name = "user_like_recipe",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "recipe_id")
    )
    Set<Recipe> like;

    @ManyToMany
    @JoinTable(
            name = "user_favorite_recipe",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "recipe_id")
    )
    List<Recipe> favorite;

    @OneToMany(mappedBy = "author")
    List<Recipe> post;
}
