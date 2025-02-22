package com.example.BMN.Review;

import com.example.BMN.Recipe.Recipe;
import com.example.BMN.User.SiteUser;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Set;

@Setter
@Getter
@Entity
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String content;

    private LocalDateTime createDate;

    @ManyToOne
    private Recipe recipe;

    @ManyToOne
    private SiteUser author;

    @ManyToMany
    Set<SiteUser> like;
}
