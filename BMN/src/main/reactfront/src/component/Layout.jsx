// src/component/Layout.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import LogoutButton from "./LogoutButton";
import Sidebar from './Sidebar'; // Import Sidebar
import logo from '../assets/Salty_logo.png';
import Footer from './Footer'; // Import Footer
import './Layout.css'; // Import Layout.css

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
    const [isSidebarOpen, setSidebarOpen] = useState(false); // State for sidebar

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
    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

    return (
        <div className="layout">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
            <header className="header">
                <div className="logo-group">
                    <button className="hamburger-button" onClick={toggleSidebar}>
                        &#9776;
                    </button>
                    <div className="logo" onClick={() => navigate("/main")} style={{ cursor: 'pointer' }}>
                        <img src={logo} alt="My Logo" style={{ height: '30px' }} />
                    </div>

                    <div className="button-group">
                        <button className="button" onClick={() => navigate("/")}>레시피</button>
                        <button className="button" onClick={() => navigate("/household-ledger")}>가계부</button>
                    </div>


                </div>

                <div className="auth-group">
                    <form className="sx-1"
                        className="header-search"
                        onSubmit={(e) => {
                            e.preventDefault();
                            const q = String(searchText || "").trim();
                            if (!q) return;
                            navigate(`/recipes?q=${encodeURIComponent(q)}`);
                        }}
                         >
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="궁금한 레시피가 있나요?"
                            aria-label="레시피 검색"
                            className="search-input"
                        />
                        <button type="submit" className="search-button sx-2" >
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

            
            <main className="main-content">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default Layout;