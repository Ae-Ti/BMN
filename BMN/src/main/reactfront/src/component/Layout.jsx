import React from "react";
import "./Layout.css"; // 스타일 파일을 임포트합니다.
import { Outlet, useNavigate } from "react-router-dom";
import RecipeCategoryTabs from "./pages/RecipeCategoryTabs";
import { Link } from 'react-router-dom';




const Layout = ({ children }) => {
  const navigate = useNavigate(); //✅ 페이지 이동을 위한 useNavigate()

  return (
    <div className="layout">
      {/* 툴바 */}
      <header className="header">
        <div className="logo-group">
          {/* 로고 */}
          <div className="logo">My Logo</div>
          
          {/* 버튼 그룹 */}
          <div className="button-group">
            {/* ✅ "요리" 버튼 클릭 시 RecipeMain ("/") 페이지 이동 */}
            <button className="button" onClick={() => navigate("/")}>🍽요리</button>
            <button className="button" onClick={() => navigate("/household-ledger")}>💰가계부</button>
            
          </div>
          
          {/* My Page 버튼 */}
          <div className="my-page">
            <button className="my-page-button">My Page</button>
          </div>
        </div>
        
        {/* 우측 검색 및 회원가입/로그인 */}
        <div className="auth-group">
          <input type="text" placeholder="검색..." className="search-input" />
          <button 
            className="auth-button"
            onClick={() => navigate("/SignUp")} // 회원가입 버튼 클릭 시 이동
          >
            회원가입
          </button>
          <button 
            className="auth-button"
            onClick={() => navigate("user/login")} // 로그인 버튼 클릭 시 이동
          >
            로그인
          </button>
        </div>
      </header>
      
      {/* 카테고리 탭 */}
      <RecipeCategoryTabs />

     

      {/* 페이지별 컨텐츠가 출력될 위치 */}
      <main>
        <Outlet />
      </main>
      
      {/* 페이지 컨텐츠 */}
      <main className="main-content">{children}</main>

      

      
    </div>
  );
};

export default Layout;