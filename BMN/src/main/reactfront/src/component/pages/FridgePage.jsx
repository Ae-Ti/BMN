// src/component/pages/FridgePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const TOKEN_KEY = "token";
const CATEGORIES = [
    { key: "ALL",     label: "전체" },
    { key: "REFRIGERATED", label: "냉장" },
    { key: "FROZEN",  label: "냉동" },
    { key: "ROOM",    label: "상온" },
];

const FridgePage = () => {
    const nav = useNavigate();
    const [active, setActive] = useState("ALL");
    const [items, setItems] = useState([]);
    const [form, setForm] = useState({ name: "", qty: 1, unit: "", category: "REFRIGERATED", expireDate: "" });
    const [loading, setLoading] = useState(false);

    // 토큰 헤더 자동
    useEffect(() => {
        const t = localStorage.getItem(TOKEN_KEY);
        if (t) axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    }, []);

    const load = async (cat = active) => {
        setLoading(true);
        try {
            const res = await axios.get("/api/fridge/ingredients", { params: { category: cat } });
            setItems(res.data || []);
        } catch (e) {
            console.error(e);
            alert("식재료 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load("ALL"); }, []); // 첫 로드 ALL
    useEffect(() => { load(active); /* 카테고리 변경 시 */ }, [active]);

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
            setForm({ name: "", qty: 1, unit: "", category: form.category, expireDate: "" });
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

    const tabUI = useMemo(() => (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {CATEGORIES.map(c => (
                <button
                    key={c.key}
                    onClick={() => setActive(c.key)}
                    style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #ddd",
                        background: active === c.key ? "#222" : "#fff",
                        color: active === c.key ? "#fff" : "#222",
                        cursor: "pointer"
                    }}
                >
                    {c.label}
                </button>
            ))}
        </div>
    ), [active]);

    return (
        <div style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>냉장고</h1>
                <button onClick={() => nav("/mypage")}>← 마이페이지로</button>
            </div>

            {tabUI}

            {/* 입력 폼 */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <input
                    placeholder="이름"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                />
                <input
                    type="number"
                    min="1"
                    placeholder="수량"
                    value={form.qty}
                    onChange={(e) => setForm(f => ({ ...f, qty: e.target.value }))}
                    style={{ width: 80 }}
                />
                <input
                    placeholder="단위(예: 개, g, 묶음)"
                    value={form.unit}
                    onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))}
                    style={{ width: 140 }}
                />
                <select
                    value={form.category}
                    onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                >
                    {CATEGORIES.filter(c => c.key !== "ALL").map(c => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                </select>
                <input
                    type="date"
                    value={form.expireDate}
                    onChange={(e) => setForm(f => ({ ...f, expireDate: e.target.value }))}
                />
                <button onClick={handleAdd}>추가</button>
            </div>

            {/* 목록 */}
            {loading ? (
                <p>불러오는 중...</p>
            ) : items.length === 0 ? (
                <p>해당 카테고리에 항목이 없습니다.</p>
            ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                        <th>이름</th><th>카테고리</th><th>수량</th><th>유통기한</th><th>관리</th>
                    </tr>
                    </thead>
                    <tbody>
                    {items.map(it => (
                        <tr key={it.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td>{it.name}{it.unit ? ` (${it.unit})` : ""}</td>
                            <td>
                                {it.category === "REFRIGERATED" ? "냉장" :
                                    it.category === "FROZEN" ? "냉동" : "상온"}
                            </td>
                            <td>
                                <button onClick={() => handleChangeQty(it.id, Math.max(1, (it.quantity || 1) - 1))}>-</button>
                                <span style={{ margin: "0 8px" }}>{it.quantity || 1}</span>
                                <button onClick={() => handleChangeQty(it.id, (it.quantity || 1) + 1)}>+</button>
                            </td>
                            <td>{it.expireDate || "-"}</td>
                            <td>
                                <button onClick={() => handleDelete(it.id)} style={{ color: "crimson" }}>삭제</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}

        </div>
    );
};

export default FridgePage;