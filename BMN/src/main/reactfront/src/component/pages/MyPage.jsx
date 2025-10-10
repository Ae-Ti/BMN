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

// URL-safe base64 디코드
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

const styles = {
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
    thumb: {
        width: "100%",
        aspectRatio: "4 / 3",
        objectFit: "cover",
        background: "#f8f8f8",
    },
    body: {
        padding: "10px 12px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
    },
    meta: {
        fontSize: 12,
        color: "#666",
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
    },
    tabs: {
        wrapper: {
            display: "inline-flex",
            border: "1px solid #e5e7eb",
            borderRadius: 999,
            overflow: "hidden",
            background: "#fff",
        },
        btn(base, active) {
            return {
                padding: "8px 14px",
                fontWeight: 700,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
                background: active ? "#111827" : "transparent",
                color: active ? "#fff" : "#111827",
                ...base,
            };
        },
    },
};

const MyPage = () => {
    const nav = useNavigate();

    // 탭: 'my' | 'fav'
    const [tab, setTab] = useState("my");

    // 목록들
    const [myRecipes, setMyRecipes] = useState([]);
    const [favRecipes, setFavRecipes] = useState([]);

    // 로딩/에러
    const [loading, setLoading] = useState(false);

    // 프로필(아이디만)
    const [myId, setMyId] = useState("");
    const [meLoading, setMeLoading] = useState(true);

    // 토큰 자동 헤더
    useEffect(() => {
        const t = localStorage.getItem(TOKEN_KEY);
        if (t) axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    }, []);

    // 내 아이디 불러오기: /user/info → 실패 시 토큰 fallback
    useEffect(() => {
        (async () => {
            setMeLoading(true);
            try {
                const { data } = await axios.get("/user/info");
                const id = data?.username ?? data?.userName ?? data?.id ?? data?.loginId ?? "";
                if (id) setMyId(String(id));
                else setMyId(usernameFromToken());
            } catch {
                setMyId(usernameFromToken());
            } finally {
                setMeLoading(false);
            }
        })();
    }, []);

    const fetchMyRecipes = useCallback(async () => {
        const { data } = await axios.get("/recipe/api/me/recipes");
        return Array.isArray(data) ? data : [];
    }, []);
    const fetchFavRecipes = useCallback(async () => {
        const { data } = await axios.get("/recipe/api/me/favorites");
        return Array.isArray(data) ? data : [];
    }, []);

    // 첫 진입 시 내 레시피 로드
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const list = await fetchMyRecipes();
                setMyRecipes(list);
            } catch (e) {
                console.error(e);
                alert("내 레시피를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        })();
    }, [fetchMyRecipes]);

    // 탭 변경 시 해당 데이터 없으면 불러오기
    useEffect(() => {
        (async () => {
            if (tab !== "fav" || favRecipes.length > 0) return;
            setLoading(true);
            try {
                const list = await fetchFavRecipes();
                setFavRecipes(list);
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

    // 아이디 첫 글자 2개로 원형 아바타 표기
    const initials = useMemo(() => {
        const s = (myId || "").trim();
        if (!s) return "U";
        return s.slice(0, 2).toUpperCase();
    }, [myId]);

    return (
        <div style={{ padding: 16 }}>
            <h1>마이페이지</h1>

            {/* 상단: 내 정보(아이디만) */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: 16,
                    border: "1px solid #e7e7e7",
                    borderRadius: 12,
                    background: "#fff",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                    marginBottom: 16,
                }}
            >
                <div
                    aria-hidden
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "#eef2ff",
                        color: "#3b82f6",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        fontSize: 20,
                        flex: "0 0 auto",
                    }}
                >
                    {initials}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
                        {meLoading ? "정보 불러오는 중…" : myId || "알 수 없음"}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13, color: "#333" }}>
                        {tab === "my" ? "내가 작성한 레시피" : "내 즐겨찾기"}:{" "}
                        <b>{totalCount.toLocaleString()}개</b>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => nav("/fridge")}>🥕 냉장고 관리</button>
                    <button onClick={() => nav("/recipes")}>📖 레시피 목록</button>
                </div>
            </div>

            {/* 탭 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={styles.tabs.wrapper}>
                    <button
                        type="button"
                        onClick={() => setTab("my")}
                        style={styles.tabs.btn({}, tab === "my")}
                    >
                        내가 작성한 레시피
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("fav")}
                        style={styles.tabs.btn({ borderLeft: "1px solid #e5e7eb" }, tab === "fav")}
                    >
                        즐겨찾기한 레시피
                    </button>
                </div>
                <span style={{ color: "#666" }}>({totalCount.toLocaleString()}개)</span>
            </div>

            {/* 리스트 */}
            {loading ? (
                <p style={{ marginTop: 12 }}>불러오는 중...</p>
            ) : !hasItems ? (
                <p style={{ marginTop: 12 }}>
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
                                    <div style={{ fontWeight: 700, lineHeight: 1.3 }}>{subject}</div>
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