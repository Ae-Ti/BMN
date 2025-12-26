// src/component/Layout.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import LogoutButton from "./LogoutButton";
import Sidebar from './Sidebar'; // Import Sidebar
import logo from '../assets/Salty_logo.png';
import Footer from './Footer'; // Import Footer
import './Layout.css'; // Import Layout.css
import axios from "axios";
import { API_BASE } from "../config";

axios.defaults.baseURL = API_BASE;

const TOKEN_KEY = "token";
// Clock skew allowance: 5 minutes in milliseconds
const CLOCK_SKEW_MS = 5 * 60 * 1000;

const isTokenValid = (raw) => {
    if (!raw) return false;
    const t = String(raw).trim();
    if (t === "" || t === "null" || t === "undefined") return false;
    const parts = t.split(".");
    if (parts.length === 3) {
        try {
            const payload = JSON.parse(atob(parts[1]));
            // JWT exp is in seconds; allow clock skew
            if (payload?.exp) {
                const expMs = payload.exp * 1000;
                if (expMs + CLOCK_SKEW_MS < Date.now()) {
                    console.log('[Layout] Token expired:', new Date(expMs).toISOString());
                    return false;
                }
            }
        } catch (e) {
            console.warn('[Layout] Failed to parse token payload:', e);
            // If we can't parse the token, assume it's invalid only if it's malformed
            return false;
        }
    }
    return true;
};

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchText, setSearchText] = useState("");
    const [isSidebarOpen, setSidebarOpen] = useState(false); // State for sidebar
    const [unreadNotifications, setUnreadNotifications] = useState(false);
    const [notificationSignature, setNotificationSignature] = useState("");

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

    const authHeaders = useCallback(() => {
        const t = localStorage.getItem(TOKEN_KEY);
        return t ? { Authorization: `Bearer ${t}` } : {};
    }, []);

    // 알림이 1개라도 있으면 badge
    const signatureFromList = useCallback((list) => {
        return Array.isArray(list) && list.length > 0 ? "has" : "";
    }, []);

    const fetchNotificationPreview = useCallback(async () => {
        if (!authed) return;
        try {
            const { data } = await axios.get("/notifications", { headers: authHeaders() });
            const list = Array.isArray(data) ? data : [];
            const sig = signatureFromList(list);
            const seen = localStorage.getItem("notificationsSignatureSeen") || "";
            setNotificationSignature(sig);
            setUnreadNotifications(sig !== "" && sig !== seen);
        } catch {
            // ignore; badge remains unchanged
        }
    }, [authed, authHeaders, signatureFromList]);

    useEffect(() => {
        fetchNotificationPreview();
    }, [fetchNotificationPreview]);

    // 창 복귀 시 알림 상태를 다시 조회해 배지 반영
    useEffect(() => {
        const onVisibility = () => {
            if (document.visibilityState === "visible") {
                fetchNotificationPreview();
            }
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () => document.removeEventListener("visibilitychange", onVisibility);
    }, [fetchNotificationPreview]);

    useEffect(() => {
        if (location.pathname.startsWith("/notifications")) {
            if (notificationSignature) {
                localStorage.setItem("notificationsSignatureSeen", notificationSignature);
            }
            setUnreadNotifications(false);
        }
    }, [location.pathname, notificationSignature]);

    useEffect(() => {
        const handleSeen = (evt) => {
            const sig = (evt?.detail && typeof evt.detail === "string") ? evt.detail : notificationSignature;
            if (sig) {
                localStorage.setItem("notificationsSignatureSeen", sig);
            }
            setUnreadNotifications(false);
        };
        window.addEventListener("notifications-read", handleSeen);
        return () => window.removeEventListener("notifications-read", handleSeen);
    }, [notificationSignature]);

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
                    <div className="logo" onClick={() => navigate("/")} style={{ cursor: 'pointer' }}>
                        <img src={logo} alt="My Logo" style={{ height: '30px' }} />
                    </div>

                    <div className="button-group">
                        <button className="button" onClick={() => navigate("/RecipeMain")}>레시피</button>
                        <button className="button" onClick={() => navigate("/household-ledger")}>가계부</button>
                    </div>


                </div>

                <div className="auth-group">
                    {authed && (
                        <button
                            type="button"
                            className="notif-button"
                            onClick={() => {
                                if (notificationSignature) {
                                    localStorage.setItem("notificationsSignatureSeen", notificationSignature);
                                }
                                setUnreadNotifications(false);
                                navigate("/notification-list");
                            }}
                            aria-label="알림 페이지로 이동"
                        >
                            <span aria-hidden>🔔</span>
                            {unreadNotifications && <span className="notif-dot" aria-hidden />}
                        </button>
                    )}
                    <form className="header-search sx-1"
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
                        <>
                            <LogoutButton onLoggedOut={handleLoggedOut} />
                        </>
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