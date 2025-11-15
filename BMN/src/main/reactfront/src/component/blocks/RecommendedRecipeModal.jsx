
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onImgError } from "../lib/placeholder";
import "./RecommendedRecipeModal.css";

const RecommendedRecipeModal = ({
  show,
  onClose,
  loading,
  error,
  recipes,
}) => {
  const nav = useNavigate();

  // ESC로 모달 닫기
  useEffect(() => {
    if (!show) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  if (!show) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content recommended-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close-button"
          onClick={onClose}
          aria-label="닫기"
          title="닫기"
        >
          ×
        </button>

        <h2 className="modal-title">재료기반 추천 레시피</h2>

        {loading ? (
          <div>추천 불러오는 중…</div>
        ) : error ? (
          <div className="modal-error">오류: {String(error)}</div>
        ) : recipes.length === 0 ? (
          <div>추천 결과가 없습니다.</div>
        ) : (
          <div className="modal-recipe-list">
            {recipes.map((r) => {
              const rid =
                r?.id ?? r?.recipeId ?? r?.recipe_id ?? r?.recipeID ?? null;

              const go = () => {
                if (!rid) {
                  alert("이 레시피는 id 정보가 없어 이동할 수 없습니다.");
                  return;
                }
                onClose();
                nav(`/recipes/${rid}`);
              };

              const thumb = r?.thumbnailUrl || "/placeholder-recipe.png";

              const matchPct =
                typeof r?.matchPercent === "number"
                  ? r.matchPercent
                  : Math.round(
                      ((r?.matchedIngredients && r?.totalIngredients
                        ? r.matchedIngredients / r.totalIngredients
                        : 0) || 0) * 100
                    );

              const soonLabel =
                typeof r?.soonestExpiryDays === "number"
                  ? r.soonestExpiryDays <= 0
                    ? "D-day"
                    : `D-${r.soonestExpiryDays}`
                  : null;

              return (
                <div
                  className="recipe-item"
                  key={rid ?? r?.subject}
                  onClick={go}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" ? go() : null)}
                >
                  <div className="recipe-thumbnail-wrapper">
                    <img
                      className="recipe-thumbnail"
                      src={thumb}
                      alt={r?.subject}
                      onError={onImgError}
                    />
                    {soonLabel && (
                      <div className="recipe-expiry-badge">{soonLabel}</div>
                    )}
                  </div>
                  <div className="recipe-details">
                    <div className="recipe-title">
                      {r?.subject ?? "(제목 없음)"}
                    </div>

                    <div className="recipe-meta">
                      보유 재료와 {matchPct}% 일치
                      {typeof r?.matchedIngredients === "number" &&
                      typeof r?.totalIngredients === "number"
                        ? ` (${r.matchedIngredients}/${r.totalIngredients})`
                        : ""}
                      {typeof r?.expireSoonCount === "number"
                        ? ` · 임박 ${r.expireSoonCount}개`
                        : ""}
                      {soonLabel ? ` · ${soonLabel}` : ""}
                    </div>

                    <div className="recipe-info">
                      {r?.cookingTimeMinutes != null
                        ? `조리 ${r.cookingTimeMinutes}분`
                        : ""}
                      {r?.cookingTimeMinutes != null && r?.estimatedPrice != null
                        ? " · "
                        : ""}
                      {r?.estimatedPrice != null
                        ? `예상 ${r.estimatedPrice}원`
                        : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendedRecipeModal;
