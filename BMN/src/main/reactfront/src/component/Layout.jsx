// src/component/Layout.jsx
import React, { useEffect, useState, useCallback } from "react";
import "./Layout.css";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import LogoutButton from "./LogoutButton";

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
    const [searchText, setSearchText] = useState("");

    // Keep header search input in sync with URL q when on /recipes
    useEffect(() => {
        try {
            const params = new URLSearchParams(location.search);
            const q = params.get("q") || "";
            setSearchText(q);
        } catch (e) {
            // ignore
        }
    }, [location.pathname, location.search]);
    const readAuthed = () => isTokenValid(localStorage.getItem(TOKEN_KEY));
    const [authed, setAuthed] = useState(readAuthed());

    useEffect(() => {
        setAuthed(readAuthed());
    }, [location.pathname]);

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
                        {/* ✅ onClick 추가! */}
                        <button
                            className="my-page-button"
                            onClick={() => navigate("/mypage")}
                        >
                            My Page
                        </button>
                    </div>
                </div>

                <div className="auth-group">
                    <form
                        className="header-search"
                        onSubmit={(e) => {
                            e.preventDefault();
                            const q = String(searchText || "").trim();
                            if (!q) return;
                            navigate(`/recipes?q=${encodeURIComponent(q)}`);
                        }}
                        style={{ display: "flex", alignItems: "center" }}
                    >
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="궁금한 레시피가 있나요?"
                            aria-label="레시피 검색"
                            className="search-input"
                        />
                        <button type="submit" className="search-button" style={{ marginLeft: 8 }}>
                            검색
                        </button>
                    </form>
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

            
            <main>
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;