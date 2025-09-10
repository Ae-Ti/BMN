package com.example.BMN.Recipe;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeUpdateRequest {
    private String title;           // null이면 변경 안 함
    private String description;     // null이면 변경 안 함
    private String tools;           // null이면 변경 안 함
    private Integer estimatedPrice; // null이면 변경 안 함
    private String content;         // null이면 변경 안 함
}
