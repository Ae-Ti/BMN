import React, { useEffect } from "react";
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

    // 훅은 항상 최상위에서 호출
    const authed = hasToken();
    const shouldBlock = !authed;
    const from = location.pathname + location.search;

    useEffect(() => {
        if (!shouldBlock) return;

        // 동기 alert → 반드시 뜸
        window.alert("로그인해야 이용할 수 있는 서비스입니다.");

        // SPA 내부 라우팅 (백엔드로 GET 안 감)
        navigate(`/user/login?from=${encodeURIComponent(from)}`, { replace: true });

        // 토큰 잔재 정리
        localStorage.removeItem(TOKEN_KEY);
    }, [shouldBlock, from, navigate]);

    if (shouldBlock) return null; // 차단 중엔 자식 렌더 안 함
    return children;
};

export default ProtectedRoute;