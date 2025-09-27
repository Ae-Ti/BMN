package com.example.BMN.Ingredient;

import java.util.List;

/**
 * 프론트엔드에서 넘어오는 요청 DTO
 */
public class CompareRequestDTO {
    public List<String> ingredients; // ["양파 1개", "대파 10g", ...]
    public Integer perIngredient;    // 기본 5
    public Boolean excludeUsed;      // 기본 true
    public Boolean sortAsc;          // 기본 true
}