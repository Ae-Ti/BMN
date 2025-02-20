import React from "react";

const RecipeDetail = () => {
  return (
    <div className="recipe-detail-container">
      {/* 상단 바 */}
      <header className="recipe-header">
        <div className="logo">logo</div>
        <h1>레시피 가계부</h1>
        <div className="auth-group">
          <input type="text" placeholder="검색..." className="search-input" />
          <button className="auth-button">회원가입/로그인</button>
          <button className="menu-button">☰</button>
        </div>
      </header>

      {/* 요리 이름 및 대표 사진 */}
      <div className="recipe-info">
        <h2>요리 이름</h2>
        <h3>요리사 OOO</h3>
        <div className="main-image">대표 사진</div>
      </div>

      {/* 추가 설명 및 해먹기 버튼 */}
      <div className="recipe-actions">
        <button className="eat-button">이걸로 해먹기</button>
        <div className="additional-info">추가 설명</div>
      </div>

      {/* 소요 시간, 조리 방법, 총 예상 가격 */}
      <div className="recipe-meta">
        <div className="meta-box">소요 시간, 조리 방법, 총 예상 가격</div>
        <div className="meta-box">조리 도구</div>
      </div>

      {/* 좋아요, 즐겨찾기 수, 사용 수 */}
      <div className="recipe-stats">
        <span>좋아요</span> | <span>즐겨찾기 수</span> | <span>사용 수</span>
      </div>

      {/* 요리 재료 */}
      <div className="recipe-ingredients">
        <h3>요리 재료</h3>
        <div className="ingredients-box"></div>
      </div>

      {/* 조리 순서 */}
      <div className="recipe-steps">
        <h3>조리 순서</h3>
        <div className="step-boxes">
          <div className="step-box">1</div>
          <div className="step-box">2</div>
          <div className="step-box">3</div>
          <div className="step-box">4</div>
          <div className="step-box">5</div>
        </div>
      </div>

      {/* 댓글 입력 칸 */}
      <div className="recipe-comments">
        <h3>댓글 입력 칸</h3>
        <div className="comments-box">
          <p>댓글 - 각 댓글마다 댓글 작성자, 내용, 좋아요</p>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
