// src/component/LogoutButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const TOKEN_KEY = "token";

export default function LogoutButton({ onLoggedOut }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem(TOKEN_KEY);
        // 🔔 같은 탭에서도 Layout이 즉시 알아차리도록
        window.dispatchEvent(new Event("auth-changed"));
        onLoggedOut?.();
        navigate("/user/login", { replace: true });
    };

    return (
        <button className="auth-button" onClick={handleLogout}>
            로그아웃
        </button>
    );
}