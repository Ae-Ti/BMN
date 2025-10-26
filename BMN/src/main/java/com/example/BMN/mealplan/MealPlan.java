// src/main/java/com/example/BMN/mealplan/MealPlan.java
package com.example.BMN.mealplan;

import com.example.BMN.Recipe.Recipe;
import com.example.BMN.User.SiteUser;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(
        name = "meal_plan",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_meal_user_date_slot_recipe",
                columnNames = {"user_id", "plan_date", "title", "recipe_id"}
        )
)
public class MealPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plan_date", nullable = false)
    private LocalDate planDate;

    /** 아침/점심/저녁/간식 */
    @Column(length = 20, nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private SiteUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_id")
    private Recipe recipe; // null 허용(메모만 등록 가능)

    @Column(length = 300)
    private String note;

    /** 같은 레시피를 또 담으면 이 수량이 증가 */
    @Column(nullable = false)
    private Integer quantity = 1;

    /** 같은 슬롯 내 정렬(작은 값이 먼저) */
    @Column(nullable = false)
    private Integer position = 0;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.quantity == null) this.quantity = 1;
        if (this.position == null) this.position = 0;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}