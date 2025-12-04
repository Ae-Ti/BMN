package com.example.BMN.comment;

import com.example.BMN.Recipe.Recipe;
import com.example.BMN.User.SiteUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByRecipeIdOrderByCreatedAtAsc(Long recipeId);
    List<Comment> findByRecipe(Recipe recipe);
    
    /** 특정 작성자의 모든 댓글 삭제 (회원 탈퇴 시 사용) */
    void deleteByAuthor(SiteUser author);
}