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
    // If OAuth failed and the failure handler redirected here with query params, show alert
    try {
      const params = new URLSearchParams(window.location.search);
      const oauthErr = params.get('oauth_error');
      const oauthMsg = params.get('message');
      if (oauthErr) {
        const decoded = oauthMsg ? decodeURIComponent(oauthMsg) : 'OAuth 인증에 실패했습니다.';
        window.alert(decoded);
        // remove oauth query params from URL for cleanliness
        params.delete('oauth_error');
        params.delete('message');
        const base = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
        window.history.replaceState({}, document.title, base);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // If a token is present in the query string (e.g. after OAuth redirect), finish login
  const finishLogin = useCallback((token) => {
    localStorage.setItem(TOKEN_KEY, token);
    window.dispatchEvent(new Event("auth-changed"));
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    // clear any oauth-in-progress marker
    try { sessionStorage.removeItem('oauthInProgress'); } catch(e) {}
    navigate(from, { replace: true });
  }, [navigate, from]);

  // If a token is present in the query string (e.g. after OAuth redirect), finish login
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthToken = params.get("token");
      if (oauthToken) {
      // remove token from url without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, document.title, url.toString());
        // clear oauth marker and complete login
        try { sessionStorage.removeItem('oauthInProgress'); } catch(e) {}
        finishLogin(oauthToken);
    }
  }, [location.search, finishLogin]);

    

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
      // Treat 401/404 as user credential errors (show unified friendly message)
      if (err.response?.status === 401 || err.response?.status === 404) {
        setError("등록되지 않은 아이디 또는 비밀번호입니다.");
      } else if (err.request && !err.response) {
        // network error
        setError("서버에 연결할 수 없습니다. 인터넷 연결을 확인하세요.");
      } else {
        setError("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.");
      }
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
          {/* Google 로그인 버튼 */}
          <div style={{marginTop:12}}>
            <a
              className="oauth-google-button"
              href="/oauth2/authorization/google"
              onClick={() => {
                  // mark oauth as started (use '1' consistently with the rest of the app)
                  try { sessionStorage.setItem('oauthInProgress', '1'); } catch(e) {}
                }}
              style={{display:'inline-block', padding:'8px 12px', background:'#fff', color:'#444', border:'1px solid #ddd', borderRadius:4, textDecoration:'none'}}
            >
              Google로 로그인
            </a>
          </div>
          {error && <p className="error-message">{error}</p>}
          <p className="signup-link" onClick={() => navigate("/signup")}>회원가입</p>
        </div>
      </div>
  );
};

export default LogIn;