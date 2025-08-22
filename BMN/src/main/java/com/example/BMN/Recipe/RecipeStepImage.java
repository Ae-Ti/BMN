package com.example.BMN.Recipe;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class RecipeStepImage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 조리 순서 (0 또는 1부터 시작 — 서비스에서 넣어줌)
    @Column(nullable = false)
    private int stepIndex;

    // (선택) 설명 캡션
    @Column(length = 300)
    private String caption;

    @Lob
    @Basic(fetch = FetchType.LAZY)
    private byte[] image;

    @ManyToOne(fetch = FetchType.LAZY)
    private Recipe recipe;


}
