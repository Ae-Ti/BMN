// src/component/pages/RecipesList.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./recipeMain.css";
import { onImgError } from "../lib/placeholder";

axios.defaults.baseURL = "http://localhost:8080";

const PAGE_SIZE = 12;

function hasToken() {
    const raw = localStorage.getItem("token");
    if (!raw) return false;
    const t = String(raw).trim();
    return !(t === "" || t === "null" || t === "undefined");
}

/* ---------- format helpers ---------- */
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

const thumbUrl = (r) =>
    r?.thumbnailUrl || (r?.id ? `/recipe/thumbnail/${r.id}` : "");

export default function RecipesList() {
    const navigate = useNavigate();
    const location = useLocation();

    // parse query parameter `q` for search
    const searchParams = new URLSearchParams(location.search);
    const qRaw = String(searchParams.get("q") || "").trim();
    const q = qRaw.toLowerCase();

    const [items, setItems] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);

    const pageRef = useRef(0);
    const loadingRef = useRef(false);
    const seenIdsRef = useRef(new Set());
    const loaderRef = useRef(null);
    const initRef = useRef({ q: null, done: false });
    const hasMoreRef = useRef(hasMore);

    useEffect(() => {
        hasMoreRef.current = hasMore;
    }, [hasMore]);

    const appendUnique = (arr) => {
        const seen = seenIdsRef.current;
        const filtered = [];
        for (const r of arr) {
            if (!r || r.id == null) continue;
            if (seen.has(r.id)) continue;
            seen.add(r.id);
            filtered.push(r);
        }
        if (filtered.length) setItems((prev) => [...prev, ...filtered]);
    };

    // When searching (q present), we still page through the same endpoints but
    // only append items that match the query. This lets the client attempt to
    // find matches across multiple pages even if the server doesn't provide a
    // dedicated search API.
    const MAX_SEARCH_PAGES = 20; // safety cap so we don't endlessly fetch

    const fetchTrendingPage = useCallback(async () => {
        if (loadingRef.current || !hasMoreRef.current) return;
        loadingRef.current = true;
        setLoading(true);

        const p = pageRef.current;
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            let res;
            if (q) {
                // server-side search endpoint returns PageEnvelope when page param provided
                res = await axios.get("/recipe/api/search", {
                    params: { q, page: p, size: PAGE_SIZE },
                    headers,
                });
            } else {
                res = await axios.get("/recipe/api/trending", {
                    params: { page: p, size: PAGE_SIZE },
                    headers,
                });
            }

            let list = [];
            let total = null;

            if (Array.isArray(res.data)) {
                list = res.data;
            } else if (res.data && Array.isArray(res.data.content)) {
                list = res.data.content;
                total = typeof res.data.total === "number" ? res.data.total : null;
            } else {
                throw new Error("알 수 없는 목록 응답 형식");
            }

            appendUnique(list);

            if (total != null) {
                const loaded = (p + 1) * PAGE_SIZE;
                setHasMore(loaded < total);
            } else {
                setHasMore(list.length === PAGE_SIZE);
            }

            if (list.length > 0) pageRef.current = p + 1;
        } catch (e) {
            try {
                const res2 = await axios.get("/recipe/data", {
                    params: { page: p, size: PAGE_SIZE },
                    headers,
                });

                if (res2.data?.content && Array.isArray(res2.data.content)) {
                    const pageList = res2.data.content;
                    if (q) {
                        const lower = q;
                        const matched = pageList.filter((r) => {
                            try {
                                return JSON.stringify(r).toLowerCase().includes(lower);
                            } catch {
                                return false;
                            }
                        });
                        appendUnique(matched);
                    } else {
                        appendUnique(pageList);
                    }
                    setHasMore(!res2.data.last);
                    if (pageList.length > 0) pageRef.current = p + 1;
                } else if (Array.isArray(res2.data)) {
                    const list2 = res2.data;
                    if (q) {
                        const lower = q;
                        const matched = list2.filter((r) => {
                            try {
                                return JSON.stringify(r).toLowerCase().includes(lower);
                            } catch {
                                return false;
                            }
                        });
                        appendUnique(matched);
                    } else {
                        appendUnique(list2);
                    }
                    setHasMore(list2.length === PAGE_SIZE);
                    if (list2.length > 0) pageRef.current = p + 1;
                } else {
                    throw new Error("알 수 없는 목록 응답 형식");
                }
            } catch (ee) {
                setErr(ee?.response?.data?.message || ee.message);
                setHasMore(false);
            }
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, [q]);

    // Infinite-scroll observer: call fetchTrendingPage when the bottom sentinel
    // comes into view. Using an IntersectionObserver prevents accidental
    // repeated immediate requests and centralizes the paging trigger.
    useEffect(() => {
        const el = loaderRef.current;
        if (!el) return;

        const obs = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        // trigger load for next page
                        fetchTrendingPage();
                    }
                }
            },
            {
                root: null,
                rootMargin: "200px",
                threshold: 0.1,
            }
        );

        obs.observe(el);
        return () => {
            try {
                obs.disconnect();
            } catch (e) {
                // ignore
            }
        };
    }, [fetchTrendingPage]);

    useEffect(() => {
        // On mount or when query changes: reset pagination when searching.
        pageRef.current = 0;
        seenIdsRef.current.clear();
        setItems([]);
        setHasMore(true);
        setErr(null);

        // ensure we only prime once per q to avoid duplicate initial requests
        initRef.current = { q, done: false };

        let cancelled = false;

        const primeSearch = async () => {
            if (cancelled) return;
            // guard: if already primed for this q, skip
            if (initRef.current.done && initRef.current.q === q) return;
            initRef.current.done = true;
            try {
                await fetchTrendingPage();
            } catch (e) {
                // swallow; fetchTrendingPage handles errors into state
            }
        };

        // start initial load
        primeSearch();

        return () => {
            cancelled = true;
        };
    }, [q]);

    const handleUploadClick = () => {
        const to = "/recipes/create";
        if (!hasToken()) {
            navigate(`/user/login?from=${encodeURIComponent(to)}`, { replace: true });
            return;
        }
        navigate(to);
    };

    if (err) {
        return (
            <div style={{ maxWidth: 1080, margin: "32px auto" }}>
                에러: {String(err)}
            </div>
        );
    }

    const Card = ({ r }) => {
        const ratingRounded = round1(r?.averageRating);
        const ratingCount = r?.ratingCount ?? 0;
        const views = r?.viewCount ?? 0;
        const favCnt = r?.favoriteCount ?? 0;
        const author = r?.authorDisplayName || r?.authorUsername || "익명";

        return (
            <Link
                to={`/recipes/${r.id}`}
                className="recipe-card"
                aria-label={`${r.subject} 상세로 이동`}
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
                            ⏱ {formatMinutes(r?.cookingTimeMinutes)} · 💰{" "}
                            {formatCurrencyKRW(r?.estimatedPrice)} · ⭐{" "}
                            {ratingRounded !== null
                                ? `${ratingRounded.toFixed(1)} (${ratingCount})`
                                : `- (0)`}
                        </div>
                        <div className="line">
                            👁 {Number(views).toLocaleString("ko-KR")} · ❤{" "}
                            {Number(favCnt).toLocaleString("ko-KR")} · ✍️ {author}
                        </div>
                    </div>
                </div>
            </Link>
        );
    };

    // Server now provides search results when q is present, so just display items
    const displayed = items;

    return (
        <div className="recipe-main" style={{ paddingTop: 12 }}>
            {qRaw ? (
                <div style={{ marginBottom: 8 }}>
                    검색어: <strong>{qRaw}</strong>
                </div>
            ) : null}
            <div className="section-header">
                <h1 className="title" style={{ fontSize: 22, margin: 0 }}>
                    레시피 목록
                </h1>
            </div>

            {/* ✅ 4열 그리드 */}
            <div className="recipe-list grid-4">
                {displayed.map((r) => (
                    <Card key={r.id} r={r} />
                ))}
            </div>

            {/* 바닥 센티널 */}
            <div
                ref={loaderRef}
                style={{ height: 60, display: hasMore ? "block" : "none" }}
            >
                {loading && (
                    <div style={{ textAlign: "center", marginTop: 20 }}>불러오는 중…</div>
                )}
            </div>

            {/* 업로드 버튼 */}
            <button
                className="fab-upload"
                onClick={handleUploadClick}
                aria-label="레시피 업로드"
            >
                업로드
            </button>
        </div>
    );
}