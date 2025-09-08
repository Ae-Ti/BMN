// src/main/java/com/example/BMN/fridge/Ingredient.java
package com.example.BMN.fridge;

import com.example.BMN.User.SiteUser;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter @Setter
@Entity
@Table(name = "ingredient")
public class Ingredient {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false)
    private String name;

    private Integer quantity;  // 기본 1
    private String unit;       // g, 개, 묶음 등

    @Enumerated(EnumType.STRING)
    @Column(nullable=false)
    private IngredientCategory category;

    private LocalDate expireDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private SiteUser owner;
}