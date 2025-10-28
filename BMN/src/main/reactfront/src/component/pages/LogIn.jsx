// src/component/pages/LogIn.jsx
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const TOKEN_KEY = "token";

const LogIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromQS = new URLSearchParams(location.search).get("from");
  const from = fromQS || "/";

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // ✅ 로그인 페이지가 로드되면 세션 플래시를 읽어 alert
  useEffect(() => {
    const msg = sessionStorage.getItem("flashMessage");
    if (msg) {
      window.alert(msg);              // 브라우저 기본 alert
      sessionStorage.removeItem("flashMessage"); // 한 번만 표시
    }
  }, []);

  const finishLogin = useCallback((token) => {
    localStorage.setItem(TOKEN_KEY, token);
    window.dispatchEvent(new Event("auth-changed"));
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    navigate(from, { replace: true });
  }, [navigate, from]);

  const handleLogin = async () => {
    setError("");
    if (!userName.trim() || !password.trim()) {
      setError("아이디와 비밀번호를 입력하세요.");
      return;
    }
    try {
      const res = await axios.post("/user/login",
          { userName, password },
          { headers: { "Content-Type": "application/json" } }
      );
      const token = res?.data?.token;
      if (!token) return setError("토큰을 받지 못했습니다. 관리자에게 문의하세요.");
      finishLogin(token);
    } catch (err) {
      if (err.response?.status === 401) setError("비밀번호가 올바르지 않습니다.");
      else if (err.response?.status === 404) setError("존재하지 않는 아이디입니다.");
      else setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  return (
      <div className="login-container" onKeyDown={e => e.key === "Enter" && handleLogin()}>
        <div className="login-box">
          <h2>로그인</h2>
          <input className="login-input" placeholder="아이디"
                 value={userName} onChange={e => setUserName(e.target.value)} autoComplete="username" />
          <input className="login-input" placeholder="비밀번호" type="password"
                 value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          <button className="login-button" onClick={handleLogin}>로그인</button>
          {error && <p className="error-message">{error}</p>}
          <p className="signup-link" onClick={() => navigate("/signup")}>회원가입</p>
        </div>
      </div>
  );
};

export default LogIn;