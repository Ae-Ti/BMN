// src/component/pages/RecipeDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { onImgError } from "../lib/placeholder";
import RecipeComments from "../blocks/RecipeComments";

axios.defaults.baseURL = "http://localhost:8080";

function b64urlDecode(str) {
    try {
        const pad = (s) => s + "===".slice((s.length + 3) % 4);
        const b64 = pad(str.replace(/-/g, "+").replace(/_/g, "/"));
        return decodeURIComponent(
            Array.prototype.map
                .call(atob(b64), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
    } catch {
        return "";
    }
}

function getCurrentUserFromToken() {
    const token = localStorage.getItem("token");
    if (!token) return { username: null, userId: null };
    const parts = token.split(".");
    if (parts.length < 2) return { username: null, userId: null };
    const payloadJson = b64urlDecode(parts[1]);
    try {
        const payload = JSON.parse(payloadJson || "{}");
        const username = payload.userName ?? payload.username ?? payload.sub ?? null;
        const userId = payload.userId ?? payload.uid ?? payload.id ?? payload.user_id ?? null;
        return { username, userId };
    } catch {
        return { username: null, userId: null };
    }
}

function normalizeLink(link) {
    if (!link) return "";
    return /^https?:\/\//i.test(link) ? link : `http://${link}`;
}

export default function RecipeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [recipe, setRecipe] = useState(null);
    const [err, setErr] = useState(null);
    const [loading, setLoading] = useState(true);

    // ⭐ 평균 별점 상태
    const [avgRating, setAvgRating] = useState(null);

    const { username: currentUsername, userId: currentUserIdFromToken } = getCurrentUserFromToken();

    // 평균 계산 유틸
    function calcAvgFrom(list) {
        if (!Array.isArray(list) || list.length === 0) return null;
        const valid = list.map((c) => Number(c?.rating || 0)).filter((n) => Number.isFinite(n) && n > 0);
        if (valid.length === 0) return null;
        const sum = valid.reduce((a, b) => a + b, 0);
        return (sum / valid.length).toFixed(1);
    }

    useEffect(() => {
        let alive = true;
        const token = localStorage.getItem("token");

        setLoading(true);
        axios
            .get(`/recipe/api/${id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            .then((res) => {
                if (!alive) return;
                setRecipe(res.data);

                // 1) 백엔드가 비정규화된 평균을 주는 경우 우선 사용
                if (res.data?.averageRating != null) {
                    const v = Number(res.data.averageRating);
                    setAvgRating(Number.isFinite(v) ? v.toFixed(1) : null);
                    return;
                }
                // 2) 응답에 commentList가 포함되어 있으면 계산
                if (Array.isArray(res.data?.commentList)) {
                    setAvgRating(calcAvgFrom(res.data.commentList));
                } else {
                    setAvgRating(null);
                }
            })
            .catch((e) => {
                if (!alive) return;
                setErr(e.response?.data?.message || e.message);
            })
            .finally(() => {
                if (!alive) return;
                setLoading(false);
            });

        return () => {
            alive = false;
        };
    }, [id]);

    // 응답에 댓글이 포함되지 않는 백엔드라면, 별도 호출로 평균 계산 (필요 시)
    useEffect(() => {
        let alive = true;
        if (avgRating != null) return; // 이미 계산된 경우 스킵
        if (!id) return;

        axios
            .get(`/recipe/api/${id}/comments`)
            .then((res) => {
                if (!alive) return;
                setAvgRating(calcAvgFrom(res.data || []));
            })
            .catch(() => {
                /* 평균은 부가정보라 에러 무시 */
            });

        return () => {
            alive = false;
        };
    }, [id, avgRating]);

    const cookMinutes = recipe?.cookingTimeMinutes ?? null;
    const estPrice = recipe?.estimatedPrice ?? null;
    const authorName = recipe?.authorDisplayName ?? recipe?.authorUsername ?? null;

    const thumbSrc =
        recipe?.thumbnailUrl || (recipe?.id ? `http://localhost:8080/recipe/thumbnail/${recipe.id}` : undefined);

    const ingredientRows = useMemo(() => {
        const arr = Array.isArray(recipe?.ingredientRows) ? recipe.ingredientRows : [];
        return [...arr].sort((a, b) => {
            const ap = a?.position ?? a?.order ?? 0;
            const bp = b?.position ?? b?.order ?? 0;
            return ap - bp;
        });
    }, [recipe]);

    const ingredientsFallbackText = typeof recipe?.ingredients === "string" ? recipe.ingredients : "";

    const steps = useMemo(() => {
        const arr = Array.isArray(recipe?.stepImages) ? recipe.stepImages : [];
        return [...arr].sort((a, b) => {
            const aa = a?.stepOrder ?? a?.stepIndex ?? 0;
            const bb = b?.stepOrder ?? b?.stepIndex ?? 0;
            return aa - bb;
        });
    }, [recipe]);

    const canEditOrDelete = useMemo(() => {
        if (!recipe) return false;
        if (currentUsername && recipe.authorUsername && currentUsername === recipe.authorUsername) return true;
        if (currentUserIdFromToken && recipe.authorId && String(currentUserIdFromToken) === String(recipe.authorId)) return true;
        return false;
    }, [recipe, currentUsername, currentUserIdFromToken]);

    async function handleDelete() {
        if (!recipe?.id) return;
        if (!canEditOrDelete) {
            alert("본인만 삭제할 수 있습니다.");
            return;
        }
        if (!window.confirm("정말 삭제하시겠어요? 삭제 후 되돌릴 수 없습니다.")) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/recipe/${recipe.id}/delete`, {
                method: "DELETE",
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!res.ok) throw new Error(`삭제 실패: ${res.status}`);
            alert("삭제되었습니다.");
            navigate("/recipes");
        } catch (e) {
            console.error(e);
            alert("삭제 중 오류가 발생했습니다.");
        }
    }

    if (loading) return <div style={{ maxWidth: 920, margin: "32px auto" }}>불러오는 중…</div>;
    if (err) return <div style={{ maxWidth: 920, margin: "32px auto" }}>에러: {String(err)}</div>;
    if (!recipe) return null;

    // 장보기 페이지로 넘길 페이로드
    const ingredientPayload = ingredientRows
        .map((it) => ({ name: it?.name ?? "", link: it?.link ?? "" }))
        .filter((x) => x.name && x.name.trim().length > 0);

    return (
        <div style={{ maxWidth: 920, margin: "32px auto", padding: "0 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <Link to="/recipes" style={{ textDecoration: "none" }}>
                    ← 목록으로
                </Link>

                {canEditOrDelete && (
                    <div style={{ display: "flex", gap: 8 }}>
                        {/* ✅ 초록색 수정 버튼 */}
                        <button
                            type="button"
                            onClick={() => navigate(`/recipes/edit/${recipe.id}`)}
                            style={{
                                padding: "8px 12px",
                                borderRadius: 8,
                                border: "none",
                                background: "#4caf50",
                                color: "#fff",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            수정
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            style={{
                                padding: "8px 12px",
                                borderRadius: 8,
                                border: "none",
                                background: "#ffe9e9",
                                color: "#b00020",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            삭제
                        </button>
                    </div>
                )}
            </div>

            <Link
                to="/ingredient"
                state={{
                    cost: recipe.estimatedPrice, // 예상비용
                    ingredients: ingredientPayload, // ✅ 배열로 전달
                    thumbnail: thumbSrc, // ✅ 썸네일도 전달(선택)
                }}
                style={{
                    position: "fixed",
                    bottom: "20px",
                    right: "20px",
                    background: "#007bff",
                    color: "#fff",
                    padding: "10px 20px",
                    borderRadius: "50px",
                    textDecoration: "none",
                }}
            >
                담기
            </Link>

            <h1 style={{ margin: "8px 0 12px" }}>{recipe.subject ?? "(제목 없음)"}</h1>

            <div style={{ color: "#666", marginBottom: 16 }}>
                {cookMinutes != null && <>조리시간 {cookMinutes}분</>}
                {cookMinutes != null && estPrice != null ? " · " : null}
                {estPrice != null && <>예상비용 {estPrice}원</>}
                {avgRating != null && (
                    <>
                        {(cookMinutes != null || estPrice != null) ? " · " : null}
                        ⭐ 평균평점 {avgRating}/5
                    </>
                )}
                {authorName ? (
                    <>
                        {(cookMinutes != null || estPrice != null || avgRating != null) ? " · " : null}
                        작성자 {authorName}
                    </>
                ) : null}
            </div>

            {thumbSrc && (
                <img
                    src={thumbSrc}
                    alt="thumbnail"
                    style={{ width: "100%", maxWidth: 860, borderRadius: 12, display: "block", marginBottom: 16 }}
                    loading="lazy"
                    onError={onImgError}
                />
            )}

            {recipe.description && (
                <>
                    <h3 style={{ marginTop: 16 }}>설명</h3>
                    <p style={{ lineHeight: 1.7 }}>{recipe.description}</p>
                </>
            )}

            {ingredientRows.length > 0 ? (
                <>
                    <h3>재료</h3>
                    <ul style={{ lineHeight: 1.9 }}>
                        {ingredientRows.map((it) => {
                            const hasLink = !!(it.link && it.link.trim());
                            const href = hasLink ? normalizeLink(it.link.trim()) : null;
                            return (
                                <li
                                    key={it.id ?? `${it.name}-${it.position ?? it.order ?? 0}`}
                                    style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
                                >
                                    <span>{it.name}</span>
                                    {hasLink && (
                                        <>
                                            <span style={{ color: "#999" }}>·</span>
                                            <a
                                                href={href}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                    padding: "2px 8px",
                                                    border: "1px solid #ddd",
                                                    borderRadius: 6,
                                                    textDecoration: "none",
                                                    fontSize: 13,
                                                }}
                                                title={href}
                                            >
                                                구매링크
                                            </a>
                                        </>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </>
            ) : (
                typeof recipe?.ingredients === "string" &&
                recipe.ingredients && (
                    <>
                        <h3>재료</h3>
                        <p style={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>{recipe.ingredients}</p>
                    </>
                )
            )}

            {recipe.tools && recipe.tools.trim() && (
                <>
                    <h3>도구</h3>
                    <p style={{ whiteSpace: "pre-line" }}>{recipe.tools}</p>
                </>
            )}

            {steps.length > 0 && (
                <>
                    <h3>조리 단계</h3>
                    <ol style={{ paddingLeft: 20 }}>
                        {steps.map((s, idx) => {
                            const order = s.stepOrder ?? s.stepIndex ?? idx + 1;
                            const src = s.imageUrl || (s.imageBase64 ? `data:image/jpeg;base64,${s.imageBase64}` : undefined);
                            const caption = s.description ?? s.caption ?? "";
                            return (
                                <li key={`${order}-${s.id ?? idx}`} style={{ marginBottom: 24 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Step {order}</div>
                                    {caption && <div style={{ marginBottom: 8 }}>{caption}</div>}
                                    {src && (
                                        <img
                                            src={src}
                                            alt={`step-${order}`}
                                            style={{ width: "100%", maxWidth: 860, borderRadius: 12, display: "block" }}
                                            loading="lazy"
                                            onError={onImgError}
                                        />
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                </>
            )}

            {/* ✅ 댓글 섹션 — 평균 갱신 콜백 연결 */}
            <RecipeComments recipeId={recipe.id} onAvgChange={setAvgRating} />
        </div>
    );
}