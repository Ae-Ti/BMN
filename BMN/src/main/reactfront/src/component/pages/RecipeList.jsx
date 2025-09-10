import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { onImgError } from "../lib/placeholder";

axios.defaults.baseURL = "http://localhost:8080";

const thumbUrl = (id) => `http://localhost:8080/recipe/thumbnail/${id}`;
const PAGE_SIZE_DEFAULT = 12;

export default function RecipesList() {
    const [params, setParams] = useSearchParams();
    const page = Number(params.get("page") ?? 0);
    const size = Number(params.get("size") ?? PAGE_SIZE_DEFAULT);

    const [raw, setRaw] = useState([]); // 배열 응답 대비
    const [pageData, setPageData] = useState(null); // Spring Page 응답 대비
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    useEffect(() => {
        let alive = true;
        const token = localStorage.getItem("token");
        setLoading(true);
        axios
            .get(`/recipe/data`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            .then((res) => {
                if (!alive) return;
                const d = res.data;
                if (d && typeof d === "object" && Array.isArray(d.content)) {
                    setPageData(d);
                    setRaw([]);
                } else if (Array.isArray(d)) {
                    setRaw(d);
                    setPageData(null);
                } else {
                    throw new Error("알 수 없는 목록 응답 형식");
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
    }, []);

    const { items, curPage, totalPages, totalCount } = useMemo(() => {
        if (pageData) {
            return {
                items: pageData.content ?? [],
                curPage: pageData.number ?? 0,
                totalPages: pageData.totalPages ?? 1,
                totalCount: pageData.totalElements ?? pageData.content?.length ?? 0,
            };
        }
        const total = raw.length;
        const start = page * size;
        const end = start + size;
        return {
            items: raw.slice(start, end),
            curPage: page,
            totalPages: Math.max(1, Math.ceil(total / size)),
            totalCount: total,
        };
    }, [pageData, raw, page, size]);

    const goPage = (p) => setParams({ page: String(p), size: String(size) });

    if (loading) return <div style={{ maxWidth: 1080, margin: "32px auto" }}>불러오는 중…</div>;
    if (err) return <div style={{ maxWidth: 1080, margin: "32px auto" }}>에러: {String(err)}</div>;

    return (
        <div style={{ maxWidth: 1080, margin: "24px auto", padding: "0 16px" }}>
            <h1 style={{ margin: "8px 0 16px" }}>레시피 목록</h1>
            <div style={{ color: "#666", marginBottom: 12 }}>총 {totalCount}건</div>

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
                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                onError={onImgError}
                            />
                        </div>
                        <div style={{ padding: 12 }}>
                            <div style={{ fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>
                                {r.subject ?? "(제목 없음)"}
                            </div>
                            <div style={{ fontSize: 13, color: "#666" }}>
                                {r.cookingTimeMinutes ? `조리시간 ${r.cookingTimeMinutes}분` : "조리시간 정보 없음"}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* 페이지네이션 */}
            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
                <button onClick={() => goPage(0)} disabled={curPage <= 0}>
                    처음
                </button>
                <button onClick={() => goPage(curPage - 1)} disabled={curPage <= 0}>
                    이전
                </button>
                <div style={{ alignSelf: "center" }}>
                    {curPage + 1} / {totalPages}
                </div>
                <button onClick={() => goPage(curPage + 1)} disabled={curPage >= totalPages - 1}>
                    다음
                </button>
                <button onClick={() => goPage(totalPages - 1)} disabled={curPage >= totalPages - 1}>
                    마지막
                </button>
            </div>
        </div>
    );
}