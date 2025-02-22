package com.example.BMN.User;

import com.example.BMN.Recipe.Recipe;
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
    private String username;

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

}
