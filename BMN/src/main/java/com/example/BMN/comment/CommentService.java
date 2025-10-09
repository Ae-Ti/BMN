package com.example.BMN.comment;

import com.example.BMN.Recipe.Recipe;
import com.example.BMN.Recipe.RecipeRepository;
import com.example.BMN.User.SiteUser;
import com.example.BMN.User.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RequiredArgsConstructor
@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final RecipeRepository recipeRepository;
    private final UserRepository userRepository;

    // ✅ 댓글 목록 조회
    @Transactional(readOnly = true)
    public List<CommentDTO> list(Long recipeId) {
        return commentRepository.findByRecipeIdOrderByCreatedAtAsc(recipeId)
                .stream().map(CommentDTO::from).toList();
    }

    // ✅ 댓글 생성 + 평균 갱신
    @Transactional
    public CommentDTO create(Long recipeId, Long userId, String content, Integer rating) {
        Recipe recipe = recipeRepository.findById(recipeId)
                .orElseThrow(() -> new IllegalArgumentException("레시피가 존재하지 않습니다."));
        SiteUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자가 존재하지 않습니다."));

        Comment c = Comment.builder()
                .recipe(recipe)
                .author(user)
                .content(content)
                .rating(rating)
                .build();

        Comment saved = commentRepository.save(c);

        // ✅ 평균 평점 자동 갱신
        updateRecipeRating(recipe);

        return CommentDTO.from(saved);
    }

    // ✅ 댓글 수정 + 평균 갱신
    @Transactional
    public CommentDTO update(Long commentId, Long userId, String content, Integer rating) {
        Comment c = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글이 존재하지 않습니다."));

        if (!isOwner(c, userId))
            throw new AccessDeniedException("본인 댓글만 수정할 수 있습니다.");

        c.setContent(content);
        c.setRating(rating);
        Comment updated = commentRepository.save(c);

        // ✅ 평균 평점 갱신
        updateRecipeRating(c.getRecipe());

        return CommentDTO.from(updated);
    }

    // ✅ 댓글 삭제 + 평균 갱신
    @Transactional
    public void delete(Long commentId, Long userId) {
        Comment c = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글이 존재하지 않습니다."));

        if (!isOwner(c, userId))
            throw new AccessDeniedException("본인 댓글만 삭제할 수 있습니다.");

        Recipe recipe = c.getRecipe();
        commentRepository.delete(c);

        // ✅ 평균 평점 갱신
        updateRecipeRating(recipe);
    }

    // ✅ 소유자 확인
    private boolean isOwner(Comment c, Long userId) {
        if (c.getAuthor() == null || userId == null) return false;
        return c.getAuthor().getId().equals(userId);
    }

    // ✅ 평균 평점 자동 계산 후 저장
    private void updateRecipeRating(Recipe recipe) {
        List<Comment> comments = commentRepository.findByRecipe(recipe);

        if (comments.isEmpty()) {
            recipe.setAverageRating(0.0);
            recipe.setRatingCount(0);
        } else {
            double avg = comments.stream()
                    .filter(cc -> cc.getRating() != null)
                    .mapToInt(Comment::getRating)
                    .average()
                    .orElse(0.0);
            recipe.setAverageRating(avg);
            recipe.setRatingCount(comments.size());
        }

        recipeRepository.save(recipe);
    }
}