// src/component/pages/MyPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { onImgError } from "../lib/placeholder";
import "./ProfilePage.css"; // Import the new CSS file
import "./recipeMain.css";

axios.defaults.baseURL = "http://localhost:8080";

const TOKEN_KEY = "token";

/* ================= JWT / AUTH UTILS ================= */
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
function usernameFromToken() {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) return "";
    const parts = t.split(".");
    if (parts.length < 2) return "";
    try {
        const payload = JSON.parse(b64urlDecode(parts[1]) || "{}");
        return payload.username ?? payload.userName ?? payload.sub ?? "";
    } catch {
        return "";
    }
}
function authHeaders() {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? { Authorization: `Bearer ${t}` } : {};
}

/* ---------- format helpers (from RecipeMain) ---------- */
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

const MyPage = () => {
    const nav = useNavigate();
    const [tab, setTab] = useState("my");
    const [myRecipes, setMyRecipes] = useState([]);
    const [favRecipes, setFavRecipes] = useState([]);
    const [loading, setLoading] = useState(false);

    const [profile, setProfile] = useState({
        username: "",
        nickname: "",
        email: "",
        followingCount: 0,
        followerCount: 0,
    });
    const [meLoading, setMeLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setMeLoading(true);
            try {
                const { data } = await axios.get("/user/profile/me", { headers: authHeaders() });
                setProfile({
                    username: data?.username ?? data?.userName ?? usernameFromToken(),
                    nickname: data?.nickname ?? "",
                    email: data?.email ?? "",
                    followingCount: data?.followingCount ?? 0,
                    followerCount: data?.followerCount ?? 0,
                });
            } catch {
                setProfile({
                    username: usernameFromToken(),
                    nickname: "",
                    email: "",
                    followingCount: 0,
                    followerCount: 0,
                });
            } finally {
                setMeLoading(false);
            }
        })();
    }, []);

    const fetchMyRecipes = useCallback(async () => {
        const { data } = await axios.get("/user/profile/me/recipes", { headers: authHeaders() });
        return Array.isArray(data) ? data : [];
    }, []);
    const fetchFavRecipes = useCallback(async () => {
        const { data } = await axios.get("/user/profile/me/favorites", { headers: authHeaders() });
        return Array.isArray(data) ? data : [];
    }, []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [my, fav] = await Promise.all([
                    fetchMyRecipes(),
                    fetchFavRecipes(),
                ]);
                setMyRecipes(my);
                setFavRecipes(fav);
            } catch (e) {
                console.error(e);
                alert("레시피를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        })();
    }, [fetchMyRecipes, fetchFavRecipes]);

    const activeList = tab === "my" ? myRecipes : favRecipes;
    const hasItems = Array.isArray(activeList) && activeList.length > 0;

    const initials = useMemo(() => {
        const base = (profile.nickname || profile.username || "").trim();
        return base ? base.slice(0, 2).toUpperCase() : "U";
    }, [profile]);

    const goFollowers = () => {
        const uname = profile.username || usernameFromToken();
        if (!uname) return;
        nav(`/profile/${encodeURIComponent(uname)}/followers`);
    };

    const Card = ({ r, overrideAuthor }) => {
        const ratingRounded = round1(r?.averageRating);
        const ratingCount = r?.ratingCount ?? 0;
        const views = r?.viewCount ?? 0;
        const favCnt = r?.favoriteCount ?? 0;
        const author = overrideAuthor || r?.authorDisplayName || r?.authorUsername || "익명";

        return (
            <Link
                to={`/recipes/${r.id}`}
                className="recipe-card"
                aria-label={`${r.subject ?? r.title ?? "(제목 없음)"} 상세로 이동`}
            >
                <div className="thumb-wrap">
                    <img
                        src={thumbUrl(r)}
                        alt={r.subject ?? r.title}
                        className="thumb-img"
                        loading="lazy"
                        onError={onImgError}
                    />
                </div>
                <div className="card-body">
                    <p className="recipe-title">{r.subject ?? r.title ?? "(제목 없음)"}</p>

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
            <h1 className="ml-16-67pct">마이페이지</h1>

            <div className="profile-card">
                <div className="profile-header">
                    <div className="profile-avatar" aria-hidden>{initials}</div>
                    <div className="profile-info">
                        <div className="profile-nickname">
                            {meLoading ? "정보 불러오는 중…" : profile.nickname || profile.username}
                        </div>
                        <div className="profile-details">
                            <div><b>아이디</b>: {profile.username || "-"}</div>
                            <div><b>닉네임</b>: {profile.nickname || "-"}</div>
                            <div style={{display:'flex', alignItems:'center', gap:12}}>
                                <div><b>이메일</b>: {profile.email || "-"}</div>
                                {profile.email && profile.emailVerified === false && (
                                    <button onClick={() => nav(`/verify-instructions?email=${encodeURIComponent(profile.email)}`)} style={{padding:'6px 10px'}}>
                                        이메일 인증
                                    </button>
                                )}
                            </div>
                            <div><b>팔로잉</b>: {profile.followingCount ?? 0} · <b>팔로워</b>: {profile.followerCount ?? 0}</div>
                        </div>
                    </div>
                </div>

                <div className="profile-actions">
                    <div className="button-group">
                        <button onClick={goFollowers} className="green-btn-outline" title="팔로워/팔로잉 확인">
                            팔로워/팔로잉 확인
                        </button>
                    </div>
                    <div className="button-group">
                        <button onClick={() => nav("/fridge")} className="green-btn">
                            🥕 냉장고 관리
                        </button>
                        <button onClick={() => nav("/meal")} className="green-btn">
                            🍱 식단 페이지
                        </button>
                    </div>
                </div>
            </div>

            <div className="sx-2n sx-2o section-spacing-top button-group-spacing-bottom ml-16-67pct">
                <div>
                    <button
                        type="button"
                        onClick={() => setTab("my")}
                        style={{
                            padding: "10px 18px",
                            fontWeight: 800,
                            fontSize: 16,
                            border: "none",
                            cursor: "pointer",
                            background: tab === "my" ? "#111827" : "transparent",
                            color: tab === "my" ? "#fff" : "#111827",
                        }}
                        aria-pressed={tab === "my"}
                    >
                        내가 작성한 레시피 ({myRecipes.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("fav")}
                        style={{
                            padding: "10px 18px",
                            fontWeight: 800,
                            fontSize: 16,
                            border: "none",
                            borderLeft: "1px solid #e5e7eb",
                            cursor: "pointer",
                            background: tab === "fav" ? "#111827" : "transparent",
                            color: tab === "fav" ? "#fff" : "#111827",
                        }}
                        aria-pressed={tab === "fav"}
                    >
                        즐겨찾기한 레시피 ({favRecipes.length})
                    </button>
                </div>
            </div>

            {loading ? (
                <p>불러오는 중...</p>
            ) : !hasItems ? (
                <p className="sx-2r">
                    {tab === "my" ? "작성한 레시피가 없습니다." : "즐겨찾기한 레시피가 없습니다."}
                </p>
            ) : (
                <div className="recipe-list">
                    {activeList.map((r) => (
                        <Card
                            key={r.id}
                            r={r}
                            overrideAuthor={tab === "my" ? (profile.username || profile.nickname) : undefined}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyPage;
