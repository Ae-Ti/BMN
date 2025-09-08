// src/component/pages/MyPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const TOKEN_KEY = "token";

const MyPage = () => {
    const nav = useNavigate();
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);

    // 토큰 자동 헤더
    useEffect(() => {
        const t = localStorage.getItem(TOKEN_KEY);
        if (t) axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const res = await axios.get("/api/me/recipes");
                setRecipes(res.data || []);
            } catch (e) {
                console.error(e);
                alert("내 레시피를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div style={{ padding: 16 }}>
            <h1>마이페이지</h1>

            <div style={{ marginBottom: 12 }}>
                <button onClick={() => nav("/fridge")}>🥕 냉장고 관리로 이동</button>
            </div>

            <h2>내가 작성한 레시피</h2>
            {loading ? (
                <p>불러오는 중...</p>
            ) : recipes.length === 0 ? (
                <p>작성한 레시피가 없습니다.</p>
            ) : (
                <ul style={{ lineHeight: 1.8 }}>
                    {recipes.map((r) => (
                        <li key={r.id}>
                            <strong>{r.title}</strong> <small>({new Date(r.createdAt).toLocaleDateString()})</small>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MyPage;