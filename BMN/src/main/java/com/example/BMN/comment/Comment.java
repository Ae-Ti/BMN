package com.example.BMN.comment;

import com.example.BMN.Recipe.Recipe;
import com.example.BMN.User.SiteUser;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "comments") // 🔁 예약어 피하기 위해 복수형 사용
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 부모 레시피
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipe_id", nullable = false)
    @JsonIgnoreProperties({"commentList","ingredientRows","stepImages",
            "hibernateLazyInitializer","handler"})
    private Recipe recipe;

    // 작성자
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    @JsonIgnoreProperties({"post","follow","follower","like","favorite",
            "hibernateLazyInitializer","handler"})
    private SiteUser author;

    @NotBlank
    @Column(nullable = false, length = 2000)
    private String content;

    @Min(1) @Max(5)
    @Column(nullable = false)
    private Integer rating;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}