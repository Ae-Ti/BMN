// src/component/Layout.jsx  (교체용)
import React, { useEffect, useState, useCallback } from "react";
import "./Layout.css";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import RecipeCategoryTabs from "./pages/RecipeCategoryTabs";
import LogoutButton from "./LogoutButton"; // 파일 만든 상태라면 유지

const TOKEN_KEY = "token";
const isTokenValid = (raw) => {
    if (!raw) return false;
    const t = String(raw).trim();
    if (t === "" || t === "null" || t === "undefined") return false;
    const parts = t.split(".");
    if (parts.length === 3) {
        try {
            const payload = JSON.parse(atob(parts[1]));
            if (payload?.exp && payload.exp * 1000 < Date.now()) return false;
        } catch {}
    }
    return true;
};

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const readAuthed = () => isTokenValid(localStorage.getItem(TOKEN_KEY));
    const [authed, setAuthed] = useState(readAuthed());

    // 1) 라우트가 바뀔 때마다 재평가 (로그인 후 이동 시 반영)
    useEffect(() => {
        setAuthed(readAuthed());
    }, [location.pathname]); // 경로 바뀌면 재평가

    // 2) 커스텀 이벤트로 즉시 반영 (로그인/로그아웃 시 직접 쏘게)
    useEffect(() => {
        const onAuthChanged = () => setAuthed(readAuthed());
        window.addEventListener("auth-changed", onAuthChanged);
        return () => window.removeEventListener("auth-changed", onAuthChanged);
    }, []);

    const handleLoggedOut = useCallback(() => setAuthed(false), []);

    return (
        <div className="layout">
            <header className="header">
                <div className="logo-group">
                    <div className="logo">My Logo</div>
                    <div className="button-group">
                        <button className="button" onClick={() => navigate("/")}>🍽요리</button>
                        <button className="button" onClick={() => navigate("/household-ledger")}>💰가계부</button>
                    </div>
                    <div className="my-page">
                        <button className="my-page-button">My Page</button>
                    </div>
                </div>

                <div className="auth-group">
                    <input type="text" placeholder="검색..." className="search-input" />
                    {!authed ? (
                        <>
                            <button className="auth-button" onClick={() => navigate("/signup")}>
                                회원가입
                            </button>
                            <button className="auth-button" onClick={() => navigate("/user/login")}>
                                로그인
                            </button>
                        </>
                    ) : (
                        <LogoutButton onLoggedOut={handleLoggedOut} />
                    )}
                </div>
            </header>

            <RecipeCategoryTabs />

            <main>
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;