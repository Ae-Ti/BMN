import React from "react";
import { useNavigate } from "react-router-dom";
import "./logIn.css";

const LogIn = () => {
  const navigate = useNavigate();

  

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>로그인</h2>
        <input type="text" placeholder="아이디" className="login-input" />
        <input type="password" placeholder="비밀번호" className="login-input" />
        <button className="login-button">로그인</button>
        <p className="signup-link" onClick={() => navigate("/signup")}>회원가입</p>
      </div>
    </div>
  );
};

export default LogIn;
