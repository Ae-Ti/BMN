package com.example.BMN.Ingredient;

import java.util.List;

/**
 * 네이버 쇼핑 API 응답 매핑용 DTO
 */
public class NaverShopResponseDTO {
    public String lastBuildDate;
    public int total;
    public int start;
    public int display;
    public List<Item> items;

    public static class Item {
        public String title;     // <b> 태그 포함 가능
        public String link;
        public String image;
        public String lprice;    // 문자열
        public String hprice;
        public String mallName;
        public String productId;
        public String productType;
        public String brand;
        public String maker;
        public String category1;
        public String category2;
        public String category3;
        public String category4;
    }
}