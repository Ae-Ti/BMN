package com.example.BMN.Recipe;

import com.example.BMN.Review.Review;
import com.example.BMN.SiteUser.SiteUser;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Entity
@Getter
@Setter
public class Recipe {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 200)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String content;

    private LocalDateTime createDate;

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.REMOVE)
    private List<Review> reviewList;

    @ManyToOne
    private SiteUser author;

    @ManyToMany(mappedBy = "favorite")
    Set<SiteUser> favorite;

    @ManyToMany(mappedBy = "like")
    Set<SiteUser> like;

    private Integer view;

}
