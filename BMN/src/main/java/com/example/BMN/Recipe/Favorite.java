package com.example.BMN.Recipe;

import com.example.BMN.User.SiteUser;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "recipe_favorite",
        uniqueConstraints = @UniqueConstraint(name = "uk_favorite_user_recipe", columnNames = {"user_id","recipe_id"})
)
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Favorite {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private SiteUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipe_id")
    private Recipe recipe;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public Favorite(SiteUser user, Recipe recipe) {
        this.user = user;
        this.recipe = recipe;
        this.createdAt = LocalDateTime.now();
    }
}
