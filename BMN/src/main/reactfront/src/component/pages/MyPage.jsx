// src/component/pages/MyPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
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
        maxWidth: 200,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
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
        maxWidth: 240,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        borderRadius: 999,
        border: "1px solid #16a34a",
        background: "#fff",
        color: "#16a34a",
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
    },
};

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

    /* ---------- 프로필 정보 로드 ---------- */
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

    /* ---------- 레시피 데이터 로드 ---------- */
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
                setMyRecipes(await fetchMyRecipes());
            } catch (e) {
                console.error(e);
                alert("내 레시피를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        })();
    }, [fetchMyRecipes]);

    useEffect(() => {
        (async () => {
            if (tab !== "fav" || favRecipes.length > 0) return;
            setLoading(true);
            try {
                setFavRecipes(await fetchFavRecipes());
            } catch (e) {
                console.error(e);
                alert("즐겨찾기한 레시피를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        })();
    }, [tab, favRecipes.length, fetchFavRecipes]);

    const activeList = tab === "my" ? myRecipes : favRecipes;
    const hasItems = Array.isArray(activeList) && activeList.length > 0;
    const totalCount = activeList?.length ?? 0;

    const getThumbSrc = (r) =>
        r?.thumbnailUrl || (r?.id ? `http://localhost:8080/recipe/thumbnail/${r.id}` : placeHolder);

    const initials = useMemo(() => {
        const base = (profile.nickname || profile.username || "").trim();
        return base ? base.slice(0, 2).toUpperCase() : "U";
    }, [profile]);

    /* ---------- 팔로워/팔로잉 확인 페이지 이동 ---------- */
    const goFollowers = () => {
        const uname = profile.username || usernameFromToken();
        if (!uname) return;
        nav(`/profile/${encodeURIComponent(uname)}/followers`);
    };

    /* ---------- RENDER ---------- */
    return (
        <div style={styles.pageWrap}>
            <h1>마이페이지</h1>

            {/* 프로필 카드 */}
            <div className="sx-2e sx-2f sx-2g"
                 >
                {/* 상단 정보 */}
                <div >
                    <div
                        aria-hidden
                        >
                        {initials}
                    </div>

                    <div className="sx-2h sx-2i"  >
                        <div >
                            {meLoading ? "정보 불러오는 중…" : profile.nickname || profile.username}
                        </div>
                        <div className="sx-2j"  >
                            <div>
                                <b>아이디</b>: {profile.username || "-"}
                            </div>
                            <div>
                                <b>닉네임</b>: {profile.nickname || "-"}
                            </div>
                            <div>
                                <b>이메일</b>: {profile.email || "-"}
                            </div>
                            <div className="sx-2k"  >
                                <b>팔로잉</b>: {profile.followingCount ?? 0} · <b>팔로워</b>: {profile.followerCount ?? 0}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 좌하단: 팔로워/팔로잉 확인 */}
                <div className="sx-2l"  >
                    <button onClick={goFollowers} style={styles.greenBtnOutline} title="팔로워/팔로잉 확인">
                        팔로워/팔로잉 확인
                    </button>
                </div>

                {/* 우하단: 냉장고 관리 / 식단 페이지 이동 (여기 변경) */}
                <div className="sx-2m"  >
                    <button onClick={() => nav("/fridge")} style={styles.greenBtn}>
                        🥕 냉장고 관리
                    </button>
                    {/* ▼ 변경: 레시피 목록 버튼 제거, 식단 페이지로 이동 버튼 추가 */}
                    <button onClick={() => nav("/meal")} style={styles.greenBtn}>
                        🍱 식단 페이지
                    </button>
                </div>
            </div>

            {/* 탭 */}
            <div className="sx-2n sx-2o"  >
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
                        aria-pressed={tab === "my"}
                    >
                        내가 작성한 레시피
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
                        즐겨찾기한 레시피
                    </button>
                </div>
                <span className="sx-2p sx-2q"  >({totalCount.toLocaleString()}개)</span>
            </div>

            {/* 레시피 리스트 */}
            {loading ? (
                <p >불러오는 중...</p>
            ) : !hasItems ? (
                <p className="sx-2r"  >
                    {tab === "my" ? "작성한 레시피가 없습니다." : "즐겨찾기한 레시피가 없습니다."}
                </p>
            ) : (
                <div style={styles.grid}>
                    {activeList.map((r) => {
                        const created = r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : "";
                        const cookMin = r?.cookingTimeMinutes ?? r?.cookMinutes ?? null;
                        const estPrice = r?.estimatedPrice ?? null;
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
                                    <div className="sx-2s"  >{subject}</div>
                                    <div style={styles.meta}>
                                        {cookMin != null && <span>⏱ {cookMin}분</span>}
                                        {estPrice != null && <span>💰 {Number(estPrice).toLocaleString()}원</span>}
                                        {created && <span>🗓 {created}</span>}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyPage;