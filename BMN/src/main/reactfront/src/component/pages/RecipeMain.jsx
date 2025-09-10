// src/component/pages/RecipeMain.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./recipeMain.css";
import axios from "axios";
import { onImgError } from "../lib/placeholder";

axios.defaults.baseURL = "http://localhost:8080";

const TOKEN_KEY = "token";
function hasToken() {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return false;
    const t = String(raw).trim();
    return !(t === "" || t === "null" || t === "undefined");
}

const RecipeMain = () => {
    const navigate = useNavigate();
    const [bestRecipes, setBestRecipes] = useState([]);
    const [favoriteRecipes, setFavoriteRecipes] = useState([]);
    const [userName, setUserName] = useState("");

    const thumbUrl = (id) => `http://localhost:8080/recipe/thumbnail/${id}`;

    // 로그인한 사용자 정보
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        axios
            .get("/user/info", {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            })
            .then((res) => {
                if (res.data?.userName) setUserName(res.data.userName);
            })
            .catch(() => {});
    }, []);

    // 베스트 레시피
    useEffect(() => {
        const token = localStorage.getItem("token");
        axios
            .get("/recipe/data", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            .then((res) => {
                if (Array.isArray(res.data)) setBestRecipes(res.data.slice(0, 4));
            })
            .catch(() => {});
    }, []);

    // 즐겨찾기
    useEffect(() => {
        if (!userName) return;
        const token = localStorage.getItem("token");
        axios
            .get(`/favorite/data/${userName}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            .then((res) => {
                if (Array.isArray(res.data)) setFavoriteRecipes(res.data.slice(0, 4));
            })
            .catch(() => {});
    }, [userName]);

    // 카드 클릭 시: 로컬에서 토큰 검사 → 비로그인이면 SPA 로그인으로
    const handleCardClick = (id, e) => {
        e?.preventDefault(); // Link의 기본 내비게이션 방지
        const to = `/recipes/${id}`;
        if (!hasToken()) {
            navigate(`/user/login?from=${encodeURIComponent(to)}`, { replace: true });
            return;
        }
        navigate(to);
    };

    const handleUploadClick = () => {
        const to = "/post-create";
        if (!hasToken()) {
            navigate(`/user/login?from=${encodeURIComponent(to)}`, { replace: true });
            return;
        }
        navigate(to);
    };

    const Card = ({ recipe }) => (
        <Link
            to={`/recipes/${recipe.id}`}
            onClick={(e) => handleCardClick(recipe.id, e)}
            className="recipe-card" // 기존 스타일 그대로 사용
            style={{ cursor: "pointer", textDecoration: "none", color: "inherit" }}
            aria-label={`${recipe.subject} 상세로 이동`}
        >
            <img
                src={thumbUrl(recipe.id)}
                alt={recipe.subject}
                className="recipe-image"
                loading="lazy"
                onError={onImgError}
            />
            <p className="recipe-title">{recipe.subject}</p>
        </Link>
    );

    return (
        <div className="recipe-main">
            {/* 제목 + 더보기 버튼 */}
            <div className="section-header">
                <h2 className="title" style={{ margin: 0 }}>베스트 레시피</h2>
                <button
                    type="button"
                    className="more-btn"
                    onClick={() => navigate("/recipes")}
                    aria-label="레시피 목록으로 이동"
                >
                    더보기
                    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"></path>
                    </svg>
                </button>
            </div>

            <div className="recipe-list">
                {bestRecipes.length > 0 ? (
                    bestRecipes.map((recipe) => <Card key={recipe.id} recipe={recipe} />)
                ) : (
                    <p>등록된 베스트 레시피가 없습니다.</p>
                )}
            </div>

            <h2 className="title">즐겨찾기</h2>
            <div className="recipe-list">
                {favoriteRecipes.length > 0 ? (
                    favoriteRecipes.map((recipe) => <Card key={recipe.id} recipe={recipe} />)
                ) : (
                    <p>즐겨찾기한 레시피가 없습니다.</p>
                )}
            </div>

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
                    width: "80px",
                    fontSize: "16px",
                    borderRadius: "25px",
                    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                    cursor: "pointer",
                }}
            >
                업로드
            </button>
        </div>
    );
};

export default RecipeMain;