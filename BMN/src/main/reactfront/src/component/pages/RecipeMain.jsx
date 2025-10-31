// src/component/pages/RecipeMain.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { onImgError } from "../lib/placeholder";

axios.defaults.baseURL = "http://localhost:8080";

const TOKEN_KEY = "token";
const hasToken = () => {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return false;
    const t = String(raw).trim();
    return !(t === "" || t === "null" || t === "undefined");
};

/* ---------- format helpers (RecipesList와 동일) ---------- */
const formatMinutes = (mins) => {
    const n = Number(mins);
    if (!Number.isFinite(n) || n <= 0) return "-";
    if (n < 60) return `${n}분`;
    const h = Math.floor(n / 60);
    const m = n % 60;
    return m ? `${h}시간 ${m}분` : `${h}시간`;
};

const formatCurrencyKRW = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) return "-";
    try {
        return new Intl.NumberFormat("ko-KR", {
            style: "currency",
            currency: "KRW",
            maximumFractionDigits: 0,
        }).format(n);
    } catch {
        return `${Math.round(n).toLocaleString("ko-KR")}원`;
    }
};

const round1 = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 10) / 10;
};

const thumbUrl = (r) => r?.thumbnailUrl || (r?.id ? `/recipe/thumbnail/${r.id}` : "");

const RecipeMain = () => {
    const navigate = useNavigate();
    const [bestRecipes, setBestRecipes] = useState([]);
    const [favoriteRecipes, setFavoriteRecipes] = useState([]);
    const [loggedIn, setLoggedIn] = useState(hasToken());
    const [err, setErr] = useState(null);

    const authHeaders = () => {
        const token = localStorage.getItem(TOKEN_KEY);
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    /* ---------- 베스트(트렌딩 상위 4개) ---------- */
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                // ✅ 통합 엔드포인트: page 없이 size=4만 전달 → 상위 4개 리스트
                const res = await axios.get("/recipe/data", { params: { size: 4 }, headers: authHeaders() });
                const list = Array.isArray(res?.data) ? res.data : [];
                if (alive) setBestRecipes(list);
            } catch (e) {
                if (alive) {
                    setErr(e?.response?.data?.message || e.message);
                    setBestRecipes([]);
                }
            }
        })();
        return () => { alive = false; };
    }, []);

    /* ---------- 내 즐겨찾기(로그인 필요) ---------- */
    useEffect(() => {
        let alive = true;
        const t = hasToken();
        setLoggedIn(t);
        if (!t) {
            setFavoriteRecipes([]);
            return;
        }

        (async () => {
            try {
                // 내 프로필 확인 후 즐겨찾기 목록
                await axios.get("/user/profile/me", { headers: authHeaders() });
                const fav = await axios.get("/user/profile/me/favorites", { headers: authHeaders() });
                const d = fav?.data;
                const list = Array.isArray(d) ? d : Array.isArray(d?.content) ? d.content : [];
                if (alive) setFavoriteRecipes(list.slice(0, 4)); // 메인에는 최대 4개만
            } catch {
                if (alive) {
                    setLoggedIn(false);
                    setFavoriteRecipes([]);
                }
            }
        })();

        return () => { alive = false; };
    }, []);

    const handleCardClick = (id, e) => {
        e?.preventDefault();
        const to = `/recipes/${id}`;
        if (!hasToken()) {
            navigate(`/user/login?from=${encodeURIComponent(to)}`, { replace: true });
            return;
        }
        navigate(to);
    };

    const handleUploadClick = () => {
        const to = "/recipes/create";
        if (!hasToken()) {
            navigate(`/user/login?from=${encodeURIComponent(to)}`, { replace: true });
            return;
        }
        navigate(to);
    };

    const Card = ({ r }) => {
        const ratingRounded = round1(r?.averageRating);
        const ratingCount = r?.ratingCount ?? 0;
        const views = r?.viewCount ?? 0;
        const favCnt = r?.favoriteCount ?? 0;
        const author = r?.authorDisplayName || r?.authorUsername || "익명";

        return (
            <Link
                to={`/recipes/${r.id}`}
                onClick={(e) => handleCardClick(r.id, e)}
                className="recipe-card"
                aria-label={`${r.subject ?? "(제목 없음)"} 상세로 이동`}
            >
                <div className="thumb-wrap">
                    <img
                        src={thumbUrl(r)}
                        alt={r.subject}
                        className="thumb-img"
                        loading="lazy"
                        onError={onImgError}
                    />
                </div>
                <div className="card-body">
                    <p className="recipe-title">{r.subject ?? "(제목 없음)"}</p>

                    <div className="recipe-meta-compact">
                        <div className="line">
                            ⏱ {formatMinutes(r?.cookingTimeMinutes)} · 💰 {formatCurrencyKRW(r?.estimatedPrice)} · ⭐{" "}
                            {ratingRounded !== null ? `${ratingRounded.toFixed(1)} (${ratingCount})` : `- (0)`}
                        </div>
                        <div className="line">
                            👁 {Number(views).toLocaleString("ko-KR")} · ❤ {Number(favCnt).toLocaleString("ko-KR")} · ✍️ {author}
                        </div>
                    </div>
                </div>
            </Link>
        );
    };

    return (
        <div className="page-container">
            {/* 에러 노출(선택) */}
            {err && (
                <div >
                    에러: {String(err)}
                </div>
            )}

            {/* 베스트 섹션 */}
            <div className="section-header">
                <div className="section-left">
                    <h2 className="title">베스트 레시피</h2>
                    <button type="button" className="more-btn" onClick={() => navigate("/recipes")}>
                        <span>더보기</span>
                        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="recipe-list">
                {bestRecipes.length > 0 ? (
                    bestRecipes.map((r) => <Card key={r.id} r={r} />)
                ) : (
                    <p>등록된 베스트 레시피가 없습니다.</p>
                )}
            </div>

            {/* 즐겨찾기 섹션 */}
            <h2 className="title sx-3" >
                내 즐겨찾기
            </h2>
            <div className="recipe-list">
                {!loggedIn ? (
                    <p>로그인하면 이용할 수 있습니다.</p>
                ) : favoriteRecipes.length > 0 ? (
                    favoriteRecipes.map((r) => <Card key={r.id} r={r} />)
                ) : (
                    <p>즐겨찾기한 레시피가 없습니다.</p>
                )}
            </div>

            {/* 업로드 버튼 */}
            <button className="fab-upload" onClick={handleUploadClick}>
                레시피 업로드 +
            </button>
        </div>
    );
};

export default RecipeMain;