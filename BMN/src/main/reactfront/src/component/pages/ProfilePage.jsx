// src/component/pages/ProfilePage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

axios.defaults.baseURL = "http://localhost:8080";

const TOKEN_KEY = "token";
const placeHolder =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='480'>
      <rect width='100%' height='100%' fill='#f1f1f1'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#999' font-size='16'>No Image</text>
    </svg>`
    );

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

/* ================= COMMON STYLES ================= */
const styles = {
    pageWrap: {
        padding: 16,
        maxWidth: 1200,
        margin: "0 auto",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 16,
        marginTop: 12,
    },
    card: {
        display: "flex",
        flexDirection: "column",
        border: "1px solid #e7e7e7",
        borderRadius: 12,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        textDecoration: "none",
        color: "inherit",
        transition: "transform .1s ease, box-shadow .1s ease",
    },
    thumb: { width: "100%", aspectRatio: "4 / 3", objectFit: "cover", background: "#f8f8f8" },
    body: { padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 6 },
    meta: { fontSize: 12, color: "#666", display: "flex", gap: 8, flexWrap: "wrap" },
    greenBtn: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 36,
        padding: "0 14px",
        borderRadius: 999,
        border: "1px solid #16a34a",
        background: "#22c55e",
        color: "#fff",
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
    },
    greenBtnOutline: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 36,
        padding: "0 14px",
        borderRadius: 999,
        border: "1px solid #16a34a",
        background: "#fff",
        color: "#16a34a",
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
    },
};

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

    /* ---------- 프로필 정보 로드 ---------- */
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

    /* ---------- follow/unfollow ---------- */
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

    /* ---------- 레시피 ---------- */
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
                setMyRecipes(await fetchUserRecipes());
            } finally {
                setLoading(false);
            }
        })();
    }, [fetchUserRecipes]);

    useEffect(() => {
        if (tab !== "fav" || favRecipes.length > 0) return;
        (async () => {
            setLoading(true);
            try {
                setFavRecipes(await fetchUserFavorites());
            } finally {
                setLoading(false);
            }
        })();
    }, [tab, favRecipes.length, fetchUserFavorites]);

    const activeList = tab === "my" ? myRecipes : favRecipes;

    const initials = useMemo(() => {
        const base = (profile.nickname || profile.username || "").trim();
        return base ? base.slice(0, 2).toUpperCase() : "U";
    }, [profile]);

    const getThumbSrc = (r) =>
        r?.thumbnailUrl || (r?.id ? `http://localhost:8080/recipe/thumbnail/${r.id}` : placeHolder);

    const goFollowList = () => nav(`/profile/${encodeURIComponent(username)}/followers`);

    /* ======================= 렌더 ======================= */
    return (
        <div style={styles.pageWrap}>
            <h1>{profile.username}의 프로필</h1>

            {/* 프로필 카드 */}
            <div className="sx-2e sx-2f sx-3b"
                 >
                <div >
                    <div
                        aria-hidden
                        >
                        {initials}
                    </div>

                    <div className="sx-3c sx-3d sx-3e"  >
                        <div >
                            {profile.nickname || profile.username}
                        </div>
                        <div >
                            <div><b>아이디</b>: {profile.username || "-"}</div>
                            <div><b>닉네임</b>: {profile.nickname || "-"}</div>
                            <div><b>이메일</b>: {profile.email || "-"}</div>
                            <div className="sx-3f"  >
                                <b>팔로잉</b>: {profile.followingCount ?? 0} · <b>팔로워</b>: {profile.followerCount ?? 0}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 하단 버튼 - 양옆 배치 */}
                <div className="sx-3g"
                     >
                    {!isMyProfile && (
                        <button
                            onClick={handleFollowToggle}
                            style={styles.greenBtn}
                            disabled={!myName}
                        >
                            {profile.followedByMe ? "언팔로우" : "팔로우"}
                        </button>
                    )}
                    <button
                        onClick={goFollowList}
                        style={styles.greenBtnOutline}
                    >
                        팔로워/팔로잉 확인
                    </button>
                </div>
            </div>

            {/* 탭 */}
            <div className="sx-3h sx-3i"  >
                <div
                    >
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
                        작성한 레시피
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
                        즐겨찾기한 레시피
                    </button>
                </div>
            </div>

            {/* 레시피 리스트 */}
            {loading ? (
                <p className="sx-39 sx-39"  >불러오는 중...</p>
            ) : !activeList?.length ? (
                <p >표시할 레시피가 없습니다.</p>
            ) : (
                <div style={styles.grid}>
                    {activeList.map((r) => {
                        const created = r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : "";
                        const subject = r?.title ?? r?.subject ?? "(제목 없음)";
                        const to = `/recipes/${r.id}`;
                        return (
                            <Link
                                to={to}
                                key={r.id}
                                style={styles.card}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.08)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "none";
                                    e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)";
                                }}
                            >
                                <img
                                    src={getThumbSrc(r)}
                                    alt="thumbnail"
                                    style={styles.thumb}
                                    loading="lazy"
                                    onError={(e) => (e.currentTarget.src = placeHolder)}
                                />
                                <div style={styles.body}>
                                    <div className="sx-3j sx-3k"  >{subject}</div>
                                    {r?.createdAt && (
                                        <div >
                                            🗓 작성일: {new Date(r.createdAt).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ProfilePage;