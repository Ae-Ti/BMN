import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TOKEN_KEY = "token";

function hasToken() {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return false;
    const t = String(raw).trim();
    return !(t === "" || t === "null" || t === "undefined");
}

const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const authed = hasToken();
    const shouldBlock = !authed;
    const from = location.pathname + location.search + location.hash;

    // StrictMode 중복 실행 방지
    const ran = useRef(false);

    useEffect(() => {
        if (ran.current || !shouldBlock) return;
        ran.current = true;

        // 토큰 정리 → 안내 → 내부 라우팅
        localStorage.removeItem(TOKEN_KEY);
        window.alert("로그인해야 이용할 수 있는 서비스입니다.");
        navigate(`/user/login?from=${encodeURIComponent(from)}`, { replace: true });
    }, [shouldBlock, from, navigate]);

    if (shouldBlock) return null;
    return children;
};

export default ProtectedRoute;