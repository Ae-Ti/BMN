import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./recipeDetail.css"; // 스타일 파일 추가

axios.defaults.baseURL = "http://localhost:8080";

const RecipeDetail = () => {
  const { id } = useParams(); // URL에서 레시피 ID 가져오기
  const [recipe, setRecipe] = useState(null);

  // 레시피 데이터 가져오기
  useEffect(() => {
    axios
      .get(`/recipe/data/${id}`)
      .then((response) => {
        setRecipe(response.data);
      })
      .catch((error) => console.error("레시피 상세 정보 가져오기 오류:", error));
  }, [id]);

  if (!recipe) {
    return <p className="loading-text">레시피 정보를 불러오는 중...</p>;
  }

  return (
    <div className="recipe-detail">
      {/* 제목, 작성자, 생성 날짜 */}
      <div className="recipe-header">
        <h1>{recipe.subject}</h1>
        <p className="author">작성자: {recipe.author}</p>
        <p className="date">생성 날짜: {recipe.createDate}</p>
      </div>

      {/* 대표 사진 */}
      <div className="image-container">
        <img src={recipe.image || "/images/default.jpg"} alt={recipe.subject} className="recipe-image" />
      </div>

      {/* 좋아요, 즐겨찾기 수, 사용 수 (현재는 제외) */}
      <div className="stats">
        <p>좋아요: {recipe.likes || 0}</p>
        <p>즐겨찾기 수: {recipe.favorites || 0}</p>
      </div>

      {/* 요리 재료 */}
      <div className="recipe-section">
        <h2>요리 재료</h2>
        <p>{recipe.ingredients}</p>
      </div>

      {/* 추가 설명 */}
      <div className="recipe-section">
        <h2>추가 설명</h2>
        <p>{recipe.content}</p>
      </div>

      {/* 소요 시간, 조리 방법, 총 예상 가격 */}
      <div className="recipe-section">
        <h2>소요 시간, 조리 방법, 총 예상 가격</h2>
        <p>{recipe.time}분 | {recipe.method} | {recipe.price}원</p>
      </div>

      {/* 조리 도구 */}
      <div className="recipe-section">
        <h2>조리 도구</h2>
        <p>{recipe.tools}</p>
      </div>

      {/* 조리 순서 */}
      <div className="recipe-section">
        <h2>조리 순서</h2>
        <div className="cooking-steps">
          {recipe.steps.map((step, index) => (
            <div key={index} className="step">
              <span className="step-number">{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 댓글 입력 및 리스트 */}
      <div className="recipe-comments">
        <h2>댓글</h2>
        <ul>
          {recipe.reviewList.map((review, index) => (
            <li key={index} className="comment">
              <p><strong>{review.author}</strong>: {review.content}</p>
              <span>좋아요 {review.likes}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 해먹기 버튼 */}
      <button className="cook-button">이걸로 해먹기</button>
    </div>
  );
};

export default RecipeDetail;
