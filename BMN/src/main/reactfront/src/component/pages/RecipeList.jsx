// src/component/pages/RecipesList.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { onImgError } from "../lib/placeholder";

axios.defaults.baseURL = "http://localhost:8080";

const thumbUrl = (id) => `http://localhost:8080/recipe/thumbnail/${id}`;
const PAGE_SIZE = 12;

function hasToken() {
    const raw = localStorage.getItem("token");
    if (!raw) return false;
    const t = String(raw).trim();
    return !(t === "" || t === "null" || t === "undefined");
}

export default function RecipesList() {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const loaderRef = useRef(null);
    const navigate = useNavigate();

    const fetchPage = useCallback(
        async (p) => {
            if (loading || !hasMore) return;

            setLoading(true);
            const token = localStorage.getItem("token");
            try {
                const res = await axios.get(`/recipe/data?page=${p}&size=${PAGE_SIZE}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                if (res.data?.content && Array.isArray(res.data.content)) {
                    // ✅ Page<Recipe> 응답
                    setItems((prev) => [...prev, ...res.data.content]);
                    setPage(res.data.number ?? p);
                    setHasMore(!res.data.last); // 마지막 페이지 여부 확인
                } else if (Array.isArray(res.data)) {
                    // ✅ 배열만 응답하면 한 번에 전부
                    if (p === 0) setItems(res.data);
                    setHasMore(false);
                } else {
                    throw new Error("알 수 없는 목록 응답 형식");
                }
            } catch (e) {
                setErr(e.response?.data?.message || e.message);
            } finally {
                setLoading(false);
            }
        },
        [loading, hasMore]
    );

    // 첫 페이지 로딩
    useEffect(() => {
        fetchPage(0);
    }, [fetchPage]);

    // 무한 스크롤
    useEffect(() => {
        if (!loaderRef.current) return;
        const io = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    fetchPage(page + 1);
                }
            },
            { threshold: 0.1 }
        );
        io.observe(loaderRef.current);
        return () => io.disconnect();
    }, [fetchPage, hasMore, loading, page]);

    const handleUploadClick = () => {
        const to = "/recipes/create";
        if (!hasToken()) {
            navigate(`/user/login?from=${encodeURIComponent(to)}`, { replace: true });
            return;
        }
        navigate(to);
    };

    if (err)
        return (
            <div style={{ maxWidth: 1080, margin: "32px auto" }}>
                에러: {String(err)}
            </div>
        );

    return (
        <div style={{ maxWidth: 1080, margin: "24px auto", padding: "0 16px" }}>
            <h1 style={{ margin: "8px 0 16px" }}>레시피 목록</h1>
            <div style={{ color: "#666", marginBottom: 12 }}>
                총 {items.length}
                {hasMore ? "+" : ""}건
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: 16,
                }}
            >
                {items.map((r) => (
                    <Link
                        key={r.id}
                        to={`/recipes/${r.id}`}
                        style={{
                            textDecoration: "none",
                            color: "inherit",
                            border: "1px solid #eee",
                            borderRadius: 12,
                            overflow: "hidden",
                            background: "#fff",
                        }}
                    >
                        <div style={{ aspectRatio: "4 / 3", background: "#f6f6f6" }}>
                            <img
                                src={thumbUrl(r.id)}
                                alt={r.subject}
                                loading="lazy"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                }}
                                onError={onImgError}
                            />
                        </div>
                        <div style={{ padding: 12 }}>
                            <div
                                style={{
                                    fontWeight: 700,
                                    marginBottom: 6,
                                    lineHeight: 1.3,
                                }}
                            >
                                {r.subject ?? "(제목 없음)"}
                            </div>
                            <div style={{ fontSize: 13, color: "#666" }}>
                                {r.cookingTimeMinutes
                                    ? `조리시간 ${r.cookingTimeMinutes}분`
                                    : "조리시간 정보 없음"}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* 바닥 sentinel */}
            <div
                ref={loaderRef}
                style={{ height: 60, display: hasMore ? "block" : "none" }}
            >
                {loading && (
                    <div style={{ textAlign: "center", marginTop: 20 }}>불러오는 중…</div>
                )}
            </div>

            {/* ✅ 우하단 고정 업로드 버튼 */}
            <button
                onClick={handleUploadClick}
                style={{
                    position: "fixed",
                    bottom: "20px",
                    right: "20px",
                    backgroundColor: "#e7c555",
                    color: "black",
                    border: "none",
                    height: "40px",
                    width: "100px",
                    fontSize: "16px",
                    borderRadius: "25px",
                    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                    cursor: "pointer",
                    zIndex: 1000,
                }}
                aria-label="레시피 업로드"
            >
                업로드
            </button>
        </div>
    );
}