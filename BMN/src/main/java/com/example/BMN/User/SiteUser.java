package com.example.BMN.User;

import com.example.BMN.Recipe.Recipe;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Set;

@Setter
@Getter
@Entity
public class SiteUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String userName;

    @Column(unique = true)
    private String nickname;

    @Column(columnDefinition = "TEXT")
    private String introduction;

    @Column(unique = true)
    private String email;

    private String password;

    @Column
    private Long age;

    @Column
    private String sex;

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
    Set<Recipe> favorite;

    @OneToMany(mappedBy = "author")
    List<Recipe> post;

}
