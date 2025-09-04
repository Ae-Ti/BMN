import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./recipeMain.css"; // 스타일 파일 추가
import axios from "axios";

axios.defaults.baseURL = "http://localhost:8080";

const RecipeMain = () => {
    const navigate = useNavigate();
    const [bestRecipes, setBestRecipes] = useState([]);
    const [favoriteRecipes, setFavoriteRecipes] = useState([]);
    const [userName, setUserName] = useState("");

    // 로그인한 사용자 정보 가져오기
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            console.error("토큰이 없습니다. 로그인해주세요.");
            return;
        }

        axios.get("/user/info", {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
        })
            .then((response) => {
                if (response.data?.userName) {
                    setUserName(response.data.userName);
                } else {
                    console.error("잘못된 사용자 정보 데이터 형식:", response.data);
                }
            })
            .catch((error) => console.error("사용자 정보 가져오기 오류:", error));
    }, []);

    // 백엔드에서 베스트 레시피 가져오기 (JWT 포함)
    useEffect(() => {
        const token = localStorage.getItem("token");
        axios.get("/recipe/data", {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
            .then((response) => {
                if (Array.isArray(response.data)) {
                    setBestRecipes(response.data.slice(0, 4));
                } else {
                    console.error("잘못된 베스트 레시피 데이터 형식:", response.data);
                }
            })
            .catch((error) => console.error("베스트 레시피 가져오기 오류:", error));
    }, []);

    // 즐겨찾기 레시피 가져오기 (JWT 포함)
    useEffect(() => {
        if (userName) {
            const token = localStorage.getItem("token");
            axios.get(`/favorite/data/${userName}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
                .then((response) => {
                    if (Array.isArray(response.data)) {
                        setFavoriteRecipes(response.data.slice(0, 4));
                    } else {
                        console.error("잘못된 즐겨찾기 데이터 형식:", response.data);
                    }
                })
                .catch((error) => console.error("즐겨찾기 가져오기 오류:", error));
        }
    }, [userName]);

    const handleUploadClick = () => {
        navigate("/post-create");
    };

    return (
        <div className="recipe-main">
            <h2 className="title">베스트 레시피</h2>
            <div className="recipe-list">
                {bestRecipes.length > 0 ? (
                    bestRecipes.map((recipe) => (
                        <div key={recipe.id} className="recipe-card">
                            <img src={recipe.image || "/images/default.jpg"} alt={recipe.subject} className="recipe-image" />
                            <p className="recipe-title">{recipe.subject}</p>
                        </div>
                    ))
                ) : (
                    <p>등록된 베스트 레시피가 없습니다.</p>
                )}
            </div>

            <h2 className="title">즐겨찾기</h2>
            <div className="recipe-list">
                {favoriteRecipes.length > 0 ? (
                    favoriteRecipes.map((recipe) => (
                        <div key={recipe.id} className="recipe-card">
                            <img src={recipe.image || "/images/default.jpg"} alt={recipe.subject} className="recipe-image" />
                            <p className="recipe-title">{recipe.subject}</p>
                        </div>
                    ))
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