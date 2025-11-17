// src/component/pages/ProfilePage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from '../../config';
import { onImgError } from "../lib/placeholder";
import "./ProfilePage.css"; // Import the new CSS file

axios.defaults.baseURL = API_BASE;

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

const ProfilePage = () => {
    const { username } = useParams();
    const nav = useNavigate();

    const [tab, setTab] = useState("my");
    const [profile, setProfile] = useState({
        username: "",
        nickname: "",
        email: "",
        followingCount: 0,
        followerCount: 0,
        followedByMe: false,
    });
    const [loading, setLoading] = useState(false);
    const [myRecipes, setMyRecipes] = useState([]);
    const [favRecipes, setFavRecipes] = useState([]);

    const myName = usernameFromToken();
    const isMyProfile = myName && myName === username;

    const fetchProfile = useCallback(async () => {
        try {
            const { data } = await axios.get(`/user/profile/${encodeURIComponent(username)}`, {
                headers: authHeaders(),
            });
            setProfile({
                username: data?.username ?? username,
                nickname: data?.nickname ?? "",
                email: data?.email ?? "",
                followingCount: data?.followingCount ?? 0,
                followerCount: data?.followerCount ?? 0,
                followedByMe: !!data?.followedByMe,
            });
        } catch {
            setProfile({
                username,
                nickname: "",
                email: "",
                followingCount: 0,
                followerCount: 0,
                followedByMe: false,
            });
        }
    }, [username]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleFollowToggle = async () => {
        if (!myName) {
            nav(`/user/login?from=${encodeURIComponent(window.location.pathname)}`, { replace: true });
            return;
        }
        try {
            if (profile.followedByMe) {
                await axios.delete(`/user/profile/${encodeURIComponent(username)}/follow`, {
                    headers: authHeaders(),
                });
                setProfile((p) => ({
                    ...p,
                    followedByMe: false,
                    followerCount: Math.max(0, (p.followerCount ?? 1) - 1),
                }));
            } else {
                await axios.post(`/user/profile/${encodeURIComponent(username)}/follow`, null, {
                    headers: authHeaders(),
                });
                setProfile((p) => ({
                    ...p,
                    followedByMe: true,
                    followerCount: (p.followerCount ?? 0) + 1,
                }));
            }
        } catch (e) {
            console.error(e);
            alert("팔로우 작업 중 오류가 발생했습니다.");
        }
    };

    const fetchUserRecipes = useCallback(async () => {
        const { data } = await axios.get(`/user/profile/${encodeURIComponent(username)}/recipes`);
        return Array.isArray(data) ? data : [];
    }, [username]);
    const fetchUserFavorites = useCallback(async () => {
        const { data } = await axios.get(`/user/profile/${encodeURIComponent(username)}/favorites`);
        return Array.isArray(data) ? data : [];
    }, [username]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [user, favs] = await Promise.all([
                    fetchUserRecipes(),
                    fetchUserFavorites(),
                ]);
                setMyRecipes(user);
                setFavRecipes(favs);
            } finally {
                setLoading(false);
            }
        })();
    }, [fetchUserRecipes, fetchUserFavorites]);

    const activeList = tab === "my" ? myRecipes : favRecipes;

    const initials = useMemo(() => {
        const base = (profile.nickname || profile.username || "").trim();
        return base ? base.slice(0, 2).toUpperCase() : "U";
    }, [profile]);

    const goFollowList = () => nav(`/profile/${encodeURIComponent(username)}/followers`);

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
            <h1>{profile.username}의 프로필</h1>

            <div className="profile-card">
                <div className="profile-header">
                    <div className="profile-avatar" aria-hidden>{initials}</div>
                    <div className="profile-info">
                        <div className="profile-nickname">
                            {profile.nickname || profile.username}
                        </div>
                        <div className="profile-details">
                            <div><b>아이디</b>: {profile.username || "-"}</div>
                            <div><b>닉네임</b>: {profile.nickname || "-"}</div>
                            <div><b>이메일</b>: {profile.email || "-"}</div>
                            <div><b>팔로잉</b>: {profile.followingCount ?? 0} · <b>팔로워</b>: {profile.followerCount ?? 0}</div>
                        </div>
                    </div>
                </div>

                <div className="profile-actions">
                    <div className="button-group">
                    {!isMyProfile && (
                        <button
                            onClick={handleFollowToggle}
                            className="green-btn"
                            disabled={!myName}
                        >
                            {profile.followedByMe ? "언팔로우" : "팔로우"}
                        </button>
                    )}
                    <button
                        onClick={goFollowList}
                        className="green-btn-outline"
                    >
                        팔로워/팔로잉 확인
                    </button>
                    </div>
                </div>
            </div>

            <div className="sx-3h sx-3i section-spacing-top button-group-spacing-bottom">
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
                    >
                        작성한 레시피 ({myRecipes.length})
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
                    >
                        즐겨찾기한 레시피 ({favRecipes.length})
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="sx-39 sx-39">불러오는 중...</p>
            ) : !activeList?.length ? (
                <p>표시할 레시피가 없습니다.</p>
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

export default ProfilePage;
