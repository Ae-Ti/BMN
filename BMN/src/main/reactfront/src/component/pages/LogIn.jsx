import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./logIn.css";

const LogIn = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState(""); // 아이디 상태
  const [password, setPassword] = useState(""); // 비밀번호 상태
  const [error, setError] = useState(""); // 오류 메시지 상태

  const handleLogin = async () => {
    try {
      console.log("전송할 데이터:", { userName, password });  // 🛠 디버깅용 로그 추가

      const response = await axios.post(
          "/user/login", { userName, password }, {
        headers: { "Content-Type": "application/json" }});

      console.log("로그인 성공:", response.data);
      localStorage.setItem("token", response.data.token); // JWT 저장 (토큰 방식)

      // ✅ 로그인 성공 후 홈 화면으로 이동
      navigate("/");
    } catch (error) {
      if (error.response) {
        // 백엔드에서 응답을 보냈지만 실패한 경우
        if (error.response.status === 401) {
          setError("비밀번호가 올바르지 않습니다.");
        } else if (error.response.status === 404) {
          setError("존재하지 않는 아이디입니다.");
        } else {
          setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
        }
      } else {
        console.error("로그인 실패:", error.response?.data || error.message);
        // 네트워크 오류 또는 서버 응답 없음
        setError("서버와 연결할 수 없습니다. 네트워크를 확인하세요.");
      }
    }
  };

  return (
      <div className="login-container">
        <div className="login-box">
          <h2>로그인</h2>
          <input
              type="text"
              placeholder="아이디"
              className="login-input"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
          />
          <input
              type="password"
              placeholder="비밀번호"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
          />
          <button className="login-button" onClick={handleLogin}>
            로그인
          </button>
          {error && <p className="error-message">{error}</p>}
          <p className="signup-link" onClick={() => navigate("/signup")}>
            회원가입
          </p>
        </div>
      </div>
  );
};

export default LogIn;