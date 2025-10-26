// src/main/java/com/example/BMN/mealplan/MealPlanService.java
package com.example.BMN.mealplan;

import com.example.BMN.Recipe.Recipe;
import com.example.BMN.Recipe.RecipeRepository;
import com.example.BMN.User.SiteUser;
import com.example.BMN.User.UserRepository; // ✅ 여기!
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MealPlanService {

    private final MealPlanRepository mealPlanRepo;
    private final UserRepository userRepo;      // ✅ 변경됨
    private final RecipeRepository recipeRepo;

    /* ===================== Mapper ===================== */
    private MealPlanDTO toDTO(MealPlan e) {
        Long rid = e.getRecipe() != null ? e.getRecipe().getId() : null;
        String rtitle = e.getRecipe() != null ? e.getRecipe().getSubject() : null;
        String thumb = rid != null ? "/recipe/thumbnail/" + rid : null;

        return MealPlanDTO.builder()
                .id(e.getId())
                .planDate(e.getPlanDate())
                .title(e.getTitle())
                .note(e.getNote())
                .recipeId(rid)
                .recipeTitle(rtitle)
                .thumbnailUrl(thumb)
                .quantity(e.getQuantity())
                .position(e.getPosition())
                .build();
    }

    /* ===================== Query ===================== */
    @Transactional(readOnly = true)
    public List<MealPlanDTO> listByDay(String username, LocalDate date) {
        SiteUser user = userRepo.findByUserName(username)
                .orElseThrow(() -> new IllegalArgumentException("user not found: " + username));
        return mealPlanRepo.findByUserAndPlanDateOrderByTitleAscPositionAscIdAsc(user, date)
                .stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<MealPlanDTO> listByRange(String username, LocalDate start, LocalDate end) {
        SiteUser user = userRepo.findByUserName(username)
                .orElseThrow(() -> new IllegalArgumentException("user not found: " + username));
        return mealPlanRepo.findByUserAndPlanDateBetweenOrderByPlanDateAscTitleAscPositionAscIdAsc(user, start, end)
                .stream().map(this::toDTO).toList();
    }

    /* ===================== Upsert (옵션 C) ===================== */
    @Transactional
    public MealPlanDTO upsertIncreaseQuantity(String username, MealPlanDTO req) {
        SiteUser user = userRepo.findByUserName(username)
                .orElseThrow(() -> new IllegalArgumentException("user not found: " + username));

        LocalDate day = req.getPlanDate();
        String slot = req.getTitle();
        Long recipeId = req.getRecipeId();

        Recipe recipe = null;
        if (recipeId != null) {
            recipe = recipeRepo.findById(recipeId)
                    .orElseThrow(() -> new IllegalArgumentException("recipe not found: " + recipeId));
        }

        // 동일 (user, date, slot, recipe) 존재 → 수량 +1
        if (recipe != null) {
            var dup = mealPlanRepo.findByUserAndPlanDateAndTitleAndRecipe_Id(user, day, slot, recipeId);
            if (dup.isPresent()) {
                MealPlan m = dup.get();
                m.setQuantity(m.getQuantity() + 1);
                if (req.getNote() != null && !req.getNote().isBlank()) m.setNote(req.getNote());
                return toDTO(m);
            }
        }

        // 처음 등록 → position = 같은 슬롯 최대 + 1
        MealPlan m = new MealPlan();
        m.setUser(user);
        m.setPlanDate(day);
        m.setTitle(slot);
        m.setRecipe(recipe);
        m.setNote(req.getNote());

        Integer maxPos = mealPlanRepo.findMaxPosition(user, day, slot);
        m.setPosition((maxPos == null ? 0 : maxPos) + 1);

        m = mealPlanRepo.save(m);
        return toDTO(m);
    }

    /* ===================== Delete ===================== */
    @Transactional
    public void deleteHard(String username, Long id) {
        SiteUser user = userRepo.findByUserName(username)
                .orElseThrow(() -> new IllegalArgumentException("user not found: " + username));
        MealPlan m = mealPlanRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("meal not found: " + id));
        if (!m.getUser().getId().equals(user.getId()))
            throw new IllegalArgumentException("forbidden");

        mealPlanRepo.delete(m);
    }

    /* (선택) 수량만 -1 하고 0이면 삭제 */
    @Transactional
    public MealPlanDTO decrementOrDelete(String username, Long id) {
        SiteUser user = userRepo.findByUserName(username)
                .orElseThrow(() -> new IllegalArgumentException("user not found: " + username));
        MealPlan m = mealPlanRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("meal not found: " + id));
        if (!m.getUser().getId().equals(user.getId()))
            throw new IllegalArgumentException("forbidden");

        int q = m.getQuantity() == null ? 1 : m.getQuantity();
        if (q > 1) {
            m.setQuantity(q - 1);
            return toDTO(m);
        } else {
            mealPlanRepo.delete(m);
            return null;
        }
    }
}