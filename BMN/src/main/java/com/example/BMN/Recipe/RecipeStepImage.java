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
    @Column(columnDefinition = "LONGBLOB")
    private byte[] image;

    // 선택: 이미지 대신 유튜브 링크를 저장할 수 있다.
    @Column(length = 500)
    private String videoUrl;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipe_id", nullable = false, foreignKey = @ForeignKey(name = "fk_step_recipe"))
    private Recipe recipe;
}
