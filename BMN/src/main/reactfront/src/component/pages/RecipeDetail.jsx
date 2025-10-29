// src/component/pages/RecipeDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { onImgError } from "../lib/placeholder";
import RecipeComments from "../blocks/RecipeComments";

axios.defaults.baseURL = "http://localhost:8080";

const MY_PAGE_URL = "http://localhost:8080/mypage";

/* ---------- helpers ---------- */
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
function authHeaders() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function RecipeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [recipe, setRecipe] = useState(null);
    const [err, setErr] = useState(null);
    const [loading, setLoading] = useState(true);

    // 별점
    const [avgRating, setAvgRating] = useState(null);

    // 즐겨찾기
    const [isFav, setIsFav] = useState(false);
    const [favCount, setFavCount] = useState(0);

    const { username: currentUsername, userId: currentUserIdFromToken } =
        getCurrentUserFromToken();

    function calcAvgFrom(list) {
        if (!Array.isArray(list) || list.length === 0) return null;
        const valid = list
            .map((c) => Number(c?.rating || 0))
            .filter((n) => Number.isFinite(n) && n > 0);
        if (valid.length === 0) return null;
        const sum = valid.reduce((a, b) => a + b, 0);
        return (sum / valid.length).toFixed(1);
    }

    // 최초 진입: 본문 + 즐겨찾기 상태/카운트 + 조회수
    useEffect(() => {
        let alive = true;
        setLoading(true);

        const headers = authHeaders();

        // 상세
        axios
            .get(`/recipe/api/${id}`, { headers })
            .then((res) => {
                if (!alive) return;
                setRecipe(res.data);
                if (res.data?.averageRating != null) {
                    const v = Number(res.data.averageRating);
                    setAvgRating(Number.isFinite(v) ? v.toFixed(1) : null);
                } else if (Array.isArray(res.data?.commentList)) {
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

        // 즐겨찾기 상태 + 카운트 (로그인 시)
        axios
            .get(`/recipe/api/${id}/favorite`, { headers })
            .then((res) => {
                if (!alive || !res?.data) return;
                setIsFav(!!res.data.favorited);
                setFavCount(Number(res.data.favoriteCount || 0));
            })
            .catch(() => {
                // 비로그인/권한 없음 등은 무시
                setIsFav(false);
            });

        // 조회수 +1
        axios.post(`/recipe/api/${id}/view`).catch(() => {});

        return () => {
            alive = false;
        };
    }, [id]);

    // 평균 별점 보강(댓글 별도 fetch 백엔드일 때)
    useEffect(() => {
        let alive = true;
        if (avgRating != null || !id) return;
        axios
            .get(`/recipe/api/${id}/comments`)
            .then((res) => {
                if (!alive) return;
                setAvgRating(calcAvgFrom(res.data || []));
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [id, avgRating]);

    const cookMinutes = recipe?.cookingTimeMinutes ?? null;
    const estPrice = recipe?.estimatedPrice ?? null;

    const authorName =
        recipe?.authorDisplayName ?? recipe?.authorUsername ?? null;
    const authorUsername = recipe?.authorUsername ?? null;

    const thumbSrc =
        recipe?.thumbnailUrl ||
        (recipe?.id
            ? `http://localhost:8080/recipe/thumbnail/${recipe.id}`
            : undefined);

    const ingredientRows = useMemo(() => {
        const arr = Array.isArray(recipe?.ingredientRows)
            ? recipe.ingredientRows
            : [];
        return [...arr].sort((a, b) => {
            const ap = a?.position ?? a?.order ?? 0;
            const bp = b?.position ?? b?.order ?? 0;
            return ap - bp;
        });
    }, [recipe]);

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
        if (
            currentUsername &&
            recipe.authorUsername &&
            currentUsername === recipe.authorUsername
        )
            return true;
        if (
            currentUserIdFromToken &&
            recipe.authorId &&
            String(currentUserIdFromToken) === String(recipe.authorId)
        )
            return true;
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

    // 즐겨찾기 토글
    async function handleToggleFavorite(e) {
        e?.preventDefault?.();
        const token = localStorage.getItem("token");
        if (!token) {
            const to = window.location.pathname || `/recipes/${id}`;
            navigate(`/user/login?from=${encodeURIComponent(to)}`, { replace: true });
            return;
        }
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const url = `/recipe/api/${id}/favorite`;
            const res = isFav
                ? await axios.delete(url, { headers })
                : await axios.post(url, null, { headers });

            if (res?.data) {
                setIsFav(!!res.data.favorited);
                setFavCount(Number(res.data.favoriteCount || 0));
            }
        } catch (err) {
            console.error(err);
            alert("즐겨찾기 처리 중 오류가 발생했습니다.");
        }
    }

    if (loading)
        return <div className="sx-3l sx-3m"  >불러오는 중…</div>;
    if (err)
        return (
            <div >
                에러: {String(err)}
            </div>
        );
    if (!recipe) return null;

    // 작성자 배지/링크: 본인이면 외부 마이페이지 URL, 타인이면 SPA 프로필
    const authorInitials = (authorName || authorUsername || "U")
        .trim()
        .slice(0, 2)
        .toUpperCase();
    const isOwnAuthor =
        !!(currentUsername && authorUsername && currentUsername === authorUsername) ||
        !!(currentUserIdFromToken &&
            recipe.authorId &&
            String(currentUserIdFromToken) === String(recipe.authorId));
    const authorTo = isOwnAuthor
        ? MY_PAGE_URL
        : authorUsername
            ? `/profile/${encodeURIComponent(authorUsername)}`
            : undefined;

    // 장보기 페이로드
    const ingredientPayload = (Array.isArray(recipe?.ingredientRows) ? recipe.ingredientRows : [])
        .map((it) => ({ name: it?.name ?? "", link: it?.link ?? "" }))
        .filter((x) => x.name && x.name.trim().length > 0);

    return (
        <div className="recipe-detail-page"  >
            <div
                >
                <Link to="/recipes" >
                    ← 목록으로
                </Link>
            </div>

            {/* 우하단: 담기 + 즐겨찾기 */}
            <div className="sx-3t"
                 >
                <Link className="sx-3u"
                    to="/ingredient"
                    state={{
                        recipeId: recipe.id,          // ✅ 식단 반영을 위해 반드시 전달
                        subject: recipe.subject ?? "",// (선택) 제목 표시 용
                        cost: recipe.estimatedPrice,
                        ingredients: ingredientPayload,
                        thumbnail: thumbSrc,
                    }}
                     >
                    담기
                </Link>

                <button
                    onClick={handleToggleFavorite}
                    aria-label={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                    title={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                    className={`favorite-btn ${isFav ? "favorited" : ""}`}
                >
                    <span className="sx-3v sx-3w"  >{isFav ? "♥" : "♡"}</span>
                    <span >{favCount ?? 0}</span>
                </button>
            </div>

            {/* 제목 + 작성자 배지 + 수정/삭제 버튼 */}
            <div className="sx-3x sx-3y"
                 >
                <h1 >{recipe.subject ?? "(제목 없음)"}</h1>

                {(authorName || authorUsername) &&
                    (isOwnAuthor ? (
                        <a className="sx-3z"
                            href={authorTo}
                            title="내 마이페이지로 이동"
                             >
              <span className="sx-40 sx-41"
                  aria-hidden
                   >
                {authorInitials}
              </span>
                            <span >
                {authorName || authorUsername}
              </span>
                            <span className="sx-42"  >(내 프로필)</span>
                        </a>
                    ) : (
                        <Link className="sx-43"
                            to={authorTo}
                            title="작성자 프로필로 이동"
                             >
              <span className="sx-40 sx-41"
                  aria-hidden
                   >
                {authorInitials}
              </span>
                            <span >
                {authorName || authorUsername}
              </span>
                        </Link>
                    ))}
                {canEditOrDelete && (
                    <div className="sx-3q"  >
                        <button className="sx-3r"
                            type="button"
                            onClick={() => navigate(`/recipes/edit/${recipe.id}`)}
                             >
                            수정
                        </button>
                        <button className="sx-3s"
                            type="button"
                            onClick={handleDelete}
                             >
                            삭제
                        </button>
                    </div>
                )}
            </div>

            {/* 메타 줄 */}
            <div className="sx-44"  >
                {cookMinutes != null && <>조리시간 {cookMinutes}분</>}
                {cookMinutes != null && estPrice != null ? " · " : null}
                {estPrice != null && <>예상비용 {estPrice}원</>}
                {avgRating != null && (
                    <>
                        {(cookMinutes != null || estPrice != null) ? " · " : null}
                        ⭐ 평균평점 {avgRating}/5
                    </>
                )}
            </div>

            {thumbSrc && (
                <img className="sx-45"
                    src={thumbSrc}
                    alt="thumbnail"
                     loading="lazy"
                    onError={onImgError}
                />
            )}

            {(recipe.description || ingredientRows.length > 0 || (recipe.tools && recipe.tools.trim())) && (
                <div className="content-card">
                    {recipe.description && (
                        <div className="card-section">
                            <h3 className="sx-46 sx-47"  >설명</h3>
                            <p >{recipe.description}</p>
                        </div>
                    )}

                    {ingredientRows.length > 0 && (
                        <div className="card-section">
                            <h3>재료</h3>
                            <ul className="sx-48"  >
                                {ingredientRows.map((it) => {
                                    const hasLink = !!(it.link && it.link.trim());
                                    const href = hasLink ? normalizeLink(it.link.trim()) : null;
                                    return (
                                        <li className="sx-49"
                                            key={it.id ?? `${it.name}-${it.position ?? it.order ?? 0}`}
                                             >
                                            <span>{it.name}</span>
                                            {hasLink && (
                                                <>
                                                    <span className="sx-4a"  >·</span>
                                                    <a className="sx-4b"
                                                        href={href}
                                                        target="_blank"
                                                        rel="noreferrer"
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
                        </div>
                    )}

                    {recipe.tools && recipe.tools.trim() && (
                        <div className="card-section">
                            <h3>도구</h3>
                            <p className="sx-4c"  >{recipe.tools}</p>
                        </div>
                    )}
                </div>
            )}

            {Array.isArray(steps) && steps.length > 0 && (
                <>
                    <h3>조리 단계</h3>
                    <ol className="sx-4d"  >
                        {steps.map((s, idx) => {
                            const order = s?.stepOrder ?? s?.stepIndex ?? idx + 1;
                            const src =
                                s?.imageUrl ||
                                (s?.imageBase64 ? `data:image/jpeg;base64,${s.imageBase64}` : undefined);
                            const caption = s?.description ?? s?.caption ?? "";
                            return (
                                <li className="sx-4e sx-4f" key={`${order}-${s?.id ?? idx}`}  >
                                    <div >
                                        Step {order}
                                    </div>
                                    {caption && <div className="sx-4g"  >{caption}</div>}
                                    {src && (
                                        <img className="sx-4h"
                                            src={src}
                                            alt={`step-${order}`}
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

            <RecipeComments recipeId={recipe.id} onAvgChange={setAvgRating} />
        </div>
    );
}