// src/component/pages/FridgePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { onImgError } from "../lib/placeholder";

const TOKEN_KEY = "token";
const CATEGORIES = [
    { key: "ALL", label: "전체" },
    { key: "REFRIGERATED", label: "냉장" },
    { key: "FROZEN", label: "냉동" },
    { key: "ROOM", label: "상온" },
];

const FridgePage = () => {
    const nav = useNavigate();
    const [active, setActive] = useState("ALL");
    const [items, setItems] = useState([]);
    const [form, setForm] = useState({
        name: "",
        qty: 1,
        unit: "",
        category: "REFRIGERATED",
        expireDate: "",
    });
    const [loading, setLoading] = useState(false);

    // 추천 모달 상태
    const [showRec, setShowRec] = useState(false);
    const [recs, setRecs] = useState([]);
    const [recLoading, setRecLoading] = useState(false);
    const [recErr, setRecErr] = useState(null);

    // 토큰 헤더 자동
    useEffect(() => {
        const t = localStorage.getItem(TOKEN_KEY);
        if (t) axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    }, []);

    const load = async (cat = active) => {
        setLoading(true);
        try {
            const res = await axios.get("/api/fridge/ingredients", {
                params: { category: cat },
            });
            setItems(res.data || []);
        } catch (e) {
            console.error(e);
            alert("식재료 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load("ALL");
    }, []); // 첫 로드 ALL

    useEffect(() => {
        load(active); // 카테고리 변경 시
    }, [active]);

    const handleAdd = async () => {
        if (!form.name.trim()) return alert("이름을 입력하세요.");
        try {
            const payload = {
                name: form.name.trim(),
                quantity: Number(form.qty) || 1,
                unit: form.unit.trim() || null,
                category: form.category,
                expireDate: form.expireDate || null,
            };
            await axios.post("/api/fridge/ingredients", payload);
            setForm({
                name: "",
                qty: 1,
                unit: "",
                category: form.category,
                expireDate: "",
            });
            await load(active);
        } catch (e) {
            console.error(e);
            alert("추가 실패");
        }
    };

    const handleChangeQty = async (id, nextQty) => {
        try {
            await axios.patch(`/api/fridge/ingredients/${id}`, { quantity: nextQty });
            await load(active);
        } catch (e) {
            console.error(e);
            alert("수정 실패");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("삭제할까요?")) return;
        try {
            await axios.delete(`/api/fridge/ingredients/${id}`);
            await load(active);
        } catch (e) {
            console.error(e);
            alert("삭제 실패");
        }
    };

    // ===== 추천 모달 =====
    const openRecommendations = async () => {
        setShowRec(true);
        setRecLoading(true);
        setRecErr(null);
        try {
            // 서버가 사용자 냉장고 기준으로 계산함(바디 없이 POST)
            const res = await axios.post("/api/fridge/recommend");
            setRecs(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            setRecErr(e.response?.data?.message || e.message);
            setRecs([]);
        } finally {
            setRecLoading(false);
        }
    };
    const closeRecommendations = () => {
        setShowRec(false);
        setRecErr(null);
        // setRecs([]); // 닫을 때 비우고 싶으면 주석 해제
    };

    // ESC로 모달 닫기
    useEffect(() => {
        if (!showRec) return;
        const onKey = (e) => {
            if (e.key === "Escape") closeRecommendations();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [showRec]);

    const tabUI = useMemo(
        () => (
            <div className="sx-o"  >
                {CATEGORIES.map((c) => (
                    <button
                        key={c.key}
                        onClick={() => setActive(c.key)}
                        style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid #ddd",
                            background: active === c.key ? "#222" : "#fff",
                            color: active === c.key ? "#fff" : "#222",
                            cursor: "pointer",
                        }}
                    >
                        {c.label}
                    </button>
                ))}
            </div>
        ),
        [active]
    );

    return (
        <div className="page-container">
            <div className="fridge-header">
                <h1 >냉장고</h1>
                <div >
                    <button className="sx-t"
                        onClick={openRecommendations}
                         >
                        추천 레시피
                    </button>
                    <button onClick={() => nav("/mypage")}>← 마이페이지로</button>
                </div>
            </div>

            {tabUI}

            {/* 입력 폼 */}
            <div className="fridge-input-form">
                <input
                    placeholder="이름"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input className="sx-v"
                    type="number"
                    min="1"
                    placeholder="수량"
                    value={form.qty}
                    onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                     />
                <input className="sx-w"
                    placeholder="단위(예: 개, g, 묶음)"
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                     />
                <select
                    value={form.category}
                    onChange={(e) =>
                        setForm((f) => ({ ...f, category: e.target.value }))
                    }
                >
                    {CATEGORIES.filter((c) => c.key !== "ALL").map((c) => (
                        <option key={c.key} value={c.key}>
                            {c.label}
                        </option>
                    ))}
                </select>
                <input
                    type="date"
                    value={form.expireDate}
                    onChange={(e) =>
                        setForm((f) => ({ ...f, expireDate: e.target.value }))
                    }
                />
                <button onClick={handleAdd}>추가</button>
            </div>

            {/* 목록 */}
            {loading ? (
                <p>불러오는 중...</p>
            ) : items.length === 0 ? (
                <p>해당 카테고리에 항목이 없습니다.</p>
            ) : (
                <div className="fridge-grid">

                    {items.map((it) => (
                        <div className="fridge-card" key={it.id}>
                            <div className="fridge-card-name">
                                {it.name}
                                {it.unit ? ` (${it.unit})` : ""}
                            </div>
                            <div className="fridge-card-category">
                                {it.category === "REFRIGERATED"
                                    ? "냉장"
                                    : it.category === "FROZEN"
                                        ? "냉동"
                                        : "상온"}
                            </div>
                            <div className="fridge-card-quantity">
                                <button
                                    onClick={() =>
                                        handleChangeQty(it.id, Math.max(1, (it.quantity || 1) - 1))
                                    }
                                >
                                    -
                                </button>
                                <span>{it.quantity || 1}</span>
                                <button
                                    onClick={() => handleChangeQty(it.id, (it.quantity || 1) + 1)}
                                >
                                    +
                                </button>
                            </div>
                            <div className="fridge-card-expire">
                                {it.expireDate || "-"}
                            </div>
                            <div className="fridge-card-actions">
                                <button className="sx-11" onClick={() => handleDelete(it.id)}>
                                    삭제
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ===== 추천 모달 ===== */}
            {showRec && (
                <div className="sx-12"
                    onClick={closeRecommendations}
                     >
                    <div className="sx-13"
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                         >
                        {/* 닫기 X 버튼 */}
                        <button className="sx-14"
                            onClick={closeRecommendations}
                            aria-label="닫기"
                            title="닫기"
                             >
                            ×
                        </button>

                        <h2 className="sx-15 sx-16"  >맞춤 추천 레시피</h2>

                        {recLoading ? (
                            <div >추천 불러오는 중…</div>
                        ) : recErr ? (
                            <div className="sx-17 sx-16"  >
                                오류: {String(recErr)}
                            </div>
                        ) : recs.length === 0 ? (
                            <div >추천 결과가 없습니다.</div>
                        ) : (
                            <div className="sx-18"
                                 >
                                {recs.map((r) => {
                                    const rid =
                                        r?.id ?? r?.recipeId ?? r?.recipe_id ?? r?.recipeID ?? null;

                                    const go = () => {
                                        if (!rid) {
                                            alert("이 레시피는 id 정보가 없어 이동할 수 없습니다.");
                                            return;
                                        }
                                        closeRecommendations();
                                        nav(`/recipes/${rid}`);
                                    };

                                    const thumb =
                                        r?.thumbnailUrl || "/placeholder-recipe.png" /* 폴백 */;

                                    const matchPct =
                                        typeof r?.matchPercent === "number"
                                            ? r.matchPercent
                                            : Math.round(
                                                ((r?.matchedIngredients && r?.totalIngredients
                                                    ? r.matchedIngredients / r.totalIngredients
                                                    : 0) || 0) * 100
                                            );

                                    const soonLabel =
                                        typeof r?.soonestExpiryDays === "number"
                                            ? r.soonestExpiryDays <= 0
                                                ? "D-day"
                                                : `D-${r.soonestExpiryDays}`
                                            : null;

                                    return (
                                        <div className="sx-19"
                                            key={rid ?? r?.subject}
                                            onClick={go}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => (e.key === "Enter" ? go() : null)}
                                             >
                                            <div className="sx-1a"  >
                                                <img className="sx-1b"
                                                    src={thumb}
                                                    alt={r?.subject}
                                                     onError={onImgError}
                                                />
                                                {soonLabel && (
                                                    <div className="sx-1c"
                                                         >
                                                        {soonLabel}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="sx-1d sx-1e"  >
                                                <div
                                                    >
                                                    {r?.subject ?? "(제목 없음)"}
                                                </div>

                                                {/* 매칭/임박 메타 */}
                                                <div className="sx-1f"  >
                                                    {matchPct}% 일치
                                                    {typeof r?.matchedIngredients === "number" &&
                                                    typeof r?.totalIngredients === "number"
                                                        ? ` (${r.matchedIngredients}/${r.totalIngredients})`
                                                        : ""}
                                                    {typeof r?.expireSoonCount === "number"
                                                        ? ` · 임박 ${r.expireSoonCount}개`
                                                        : ""}
                                                    {soonLabel ? ` · ${soonLabel}` : ""}
                                                </div>

                                                {/* 보조 정보 */}
                                                <div className="sx-1g"  >
                                                    {r?.cookingTimeMinutes != null
                                                        ? `조리 ${r.cookingTimeMinutes}분`
                                                        : ""}
                                                    {r?.cookingTimeMinutes != null &&
                                                    r?.estimatedPrice != null
                                                        ? " · "
                                                        : ""}
                                                    {r?.estimatedPrice != null
                                                        ? `예상 ${r.estimatedPrice}원`
                                                        : ""}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FridgePage;