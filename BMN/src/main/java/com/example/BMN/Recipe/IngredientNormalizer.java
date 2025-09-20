package com.example.BMN.Recipe;

import java.text.Normalizer;

public class IngredientNormalizer {

    /**
     * 재료명 정규화
     * - null/빈값 → ""
     * - 양쪽 공백 제거
     * - 소문자 변환
     * - 한글 자모 결합(NFC) 정규화
     * - 특수문자 제거 (숫자/한글/영문/공백만 남김)
     */
    public static String normalizeOne(String raw) {
        if (raw == null) return "";
        String s = raw.trim().toLowerCase();

        // 유니코드 정규화 (예: ᄀ + ᅡ → 가)
        s = Normalizer.normalize(s, Normalizer.Form.NFC);

        // 한글/영문/숫자/공백만 허용
        s = s.replaceAll("[^0-9a-z가-힣\\s]", "");

        // 연속 공백 하나로
        s = s.replaceAll("\\s+", " ");

        return s.trim();
    }
}