import React from "react";
import { useNavigate } from "react-router-dom";
import "./recipeMain.css"; // 스타일 파일 추가


const RecipeMain = () => {

  const navigate = useNavigate();

  const handleUploadClick = () => {
    navigate("/post-create");
  };

  // 예제 게시물 데이터 (베스트 레시피)
  const bestRecipes = [
    { id: 1, title: "김치찌개", image: "/images/kimchi.jpg" },
    { id: 2, title: "된장찌개", image: "/images/soybean.jpg" },
    { id: 3, title: "불고기", image: "/images/bulgogi.jpg" },
    { id: 4, title: "비빔밥", image: "/images/bibimbap.jpg" },
  ];

  // 예제 게시물 데이터 (즐겨찾기)
  const favoriteRecipes = [
    { id: 1, title: "갈비찜", image: "/images/galbijjim.jpg" },
    { id: 2, title: "떡볶이", image: "/images/tteokbokki.jpg" },
    { id: 3, title: "라면", image: "/images/ramen.jpg" },
    { id: 4, title: "전복죽", image: "/images/jeonbokjuk.jpg" },
  ];

  return (
    <div className="recipe-main">
      
      {/* 베스트 레시피 섹션 */}
      <h2 className="title">베스트 레시피</h2>
      <div className="recipe-list">
        {bestRecipes.map((recipe) => (
          <div key={recipe.id} className="recipe-card">
            <img src={recipe.image} alt={recipe.title} className="recipe-image" />
            <p className="recipe-title">{recipe.title}</p>
          </div>
        ))}
      </div>

      {/* 즐겨찾기 섹션 */}
      <h2 className="title">즐겨찾기</h2>
      <div className="recipe-list">
        {favoriteRecipes.map((recipe) => (
          <div key={recipe.id} className="recipe-card">
            <img src={recipe.image} alt={recipe.title} className="recipe-image" />
            <p className="recipe-title">{recipe.title}</p>
          </div>
        ))}
      </div>

      <h2 className="title">즐겨찾기</h2>
      <div className="recipe-list">
        {favoriteRecipes.map((recipe) => (
          <div key={recipe.id} className="recipe-card">
            <img src={recipe.image} alt={recipe.title} className="recipe-image" />
            <p className="recipe-title">{recipe.title}</p>
          </div>
        ))}
      </div>

      {/* ✅ 가로로 긴 타원형 '업로드' 버튼 */}
      <button
        onClick={handleUploadClick}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          backgroundColor: "#e7c555",
          color: "black",
          border: "none",
          padding: "12px 24px", // 가로로 긴 버튼
          fontSize: "16px",
          borderRadius: "25px", // 타원형 버튼
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
