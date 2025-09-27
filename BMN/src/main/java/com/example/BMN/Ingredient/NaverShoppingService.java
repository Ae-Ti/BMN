// src/main/java/com/example/BMN/Ingredient/NaverShoppingService.java
package com.example.BMN.Ingredient;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class NaverShoppingService {

    private final WebClient webClient;

    public NaverShoppingService(
            @Value("${naver.api.base-url}") String baseUrl,
            @Value("${naver.api.client-id}") String clientId,
            @Value("${naver.api.client-secret}") String clientSecret
    ) {
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-Naver-Client-Id", clientId)
                .defaultHeader("X-Naver-Client-Secret", clientSecret)
                .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public NaverShopResponseDTO searchOnce(String query, Integer display, String sort, String exclude) {
        try {
            WebClient.RequestHeadersSpec<?> req = webClient.get()
                    .uri(uri -> {
                        var b = uri.path("/shop.json")
                                .queryParam("query", query);
                        if (display != null) b = b.queryParam("display", Math.min(display, 100));
                        if (sort != null && !sort.isBlank()) b = b.queryParam("sort", sort);
                        if (exclude != null && !exclude.isBlank()) b = b.queryParam("exclude", exclude);
                        return b.build();
                    });

            return req.retrieve()
                    .onStatus(
                            status -> status.is4xxClientError() || status.is5xxServerError(),
                            resp -> resp.bodyToMono(String.class).defaultIfEmpty("")
                                    .flatMap(body -> {
                                        log.error("Naver API error {} - body: {}",
                                                resp.statusCode().value(),
                                                body);
                                        return Mono.error(new RuntimeException("Naver API error " + resp.statusCode().value()));
                                    })
                    )
                    .bodyToMono(NaverShopResponseDTO.class)
                    .timeout(Duration.ofSeconds(5))
                    .onErrorResume(e -> {
                        log.error("Naver API call failed: {}", e.getMessage());
                        return Mono.just(new NaverShopResponseDTO()); // 빈 객체 반환
                    })
                    .block();
        } catch (Exception e) {
            log.error("Naver API unexpected error: {}", e.getMessage(), e);
            return new NaverShopResponseDTO();
        }
    }

    /** 재료 리스트를 받아 각 재료별 '기본순(sim)' 상위 n개 반환 */
    public Map<String, List<NaverShopResponseDTO.Item>> compareByIngredients(
            List<String> ingredients, int perIngredient, boolean excludeUsed
    ) {
        final String exclude = excludeUsed ? "used:rental" : null;
        final String sort = "sim"; // ✅ 기본순(정확도/인기 가중) 고정

        Map<String, List<NaverShopResponseDTO.Item>> result = new LinkedHashMap<>();

        ingredients.stream()
                .filter(Objects::nonNull)
                .map(this::normalizeKeyword)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .forEach(kw -> {
                    NaverShopResponseDTO resp = searchOnce(kw, perIngredient * 3, sort, exclude);

                    // 기본순: 네이버 응답 순서를 유지한다. (가격으로 재정렬 X)
                    List<NaverShopResponseDTO.Item> items = Optional.ofNullable(resp != null ? resp.items : null)
                            .orElse(List.of())
                            .stream()
                            .filter(it -> it.lprice != null && !it.lprice.isBlank())
                            .limit(perIngredient) // 순서 유지한 채 상위 n개만
                            .collect(Collectors.toList());

                    result.put(kw, items);
                });

        return result;
    }

    private String normalizeKeyword(String ingredient) {
        // 괄호, 단위/수량, 특수문자 정리
        String s = ingredient.replaceAll("\\(.*?\\)", " ")
                .replaceAll("\\d+\\s*(g|kg|ml|L|개|큰술|작은술|컵)", " ")
                .replaceAll("[^가-힣a-zA-Z0-9\\s]", " ")
                .replaceAll("\\s{2,}", " ")
                .trim();
        return s.isBlank() ? ingredient : s;
    }

    private int parsePrice(String p) {
        try { return Integer.parseInt(p.trim()); }
        catch (Exception e) { return Integer.MAX_VALUE; }
    }
}