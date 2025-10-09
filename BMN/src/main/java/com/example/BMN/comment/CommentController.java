package com.example.BMN.comment;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
@RequiredArgsConstructor
@RestController
@RequestMapping("/recipe/api") // 기존 프론트 호환 유지
public class CommentController {

    private final CommentService service;
    private final CommentSecuritySupport securitySupport;

    // 댓글 목록
    @GetMapping("/{recipeId}/comments")
    public ResponseEntity<List<CommentDTO>> list(@PathVariable Long recipeId) {
        return ResponseEntity.ok(service.list(recipeId));
    }

    // 댓글 작성
    @PostMapping("/{recipeId}/comments")
    public ResponseEntity<CommentDTO> create(
            @PathVariable Long recipeId,
            @Valid @RequestBody CommentCreateRequest req,
            Authentication auth
    ) {
        Long userId = securitySupport.currentUserId(auth);
        CommentDTO dto = service.create(recipeId, userId, req.getContent(), req.getRating());
        return ResponseEntity.created(URI.create("/recipe/api/comments/" + dto.getId())).body(dto);
    }

    // 댓글 수정
    @PutMapping("/comments/{commentId}")
    public ResponseEntity<CommentDTO> update(
            @PathVariable Long commentId,
            @Valid @RequestBody CommentCreateRequest req,
            Authentication auth
    ) {
        Long userId = securitySupport.currentUserId(auth);
        CommentDTO dto = service.update(commentId, userId, req.getContent(), req.getRating());
        return ResponseEntity.ok(dto);
    }

    // 댓글 삭제
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> delete(@PathVariable Long commentId, Authentication auth) {
        Long userId = securitySupport.currentUserId(auth);
        service.delete(commentId, userId);
        return ResponseEntity.noContent().build();
    }
}