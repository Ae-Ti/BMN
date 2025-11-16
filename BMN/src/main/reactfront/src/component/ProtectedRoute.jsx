import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from 'axios';

const TOKEN_KEY = "token";

function hasToken() {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return false;
    const t = String(raw).trim();
    return !(t === "" || t === "null" || t === "undefined");
}

/**
 * ProtectedRoute now performs a quick server-side check when a token is present.
 * - No token: redirect to login.
 * - Token present: call /user/profile/me
 *    - 200 => allow
 *    - 401 and oauthInProgress => redirect to profile completion page
 *    - 401 otherwise => treat as not-authenticated and redirect to login
 */
const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [allowed, setAllowed] = useState(null); // null=checking, true/false = result

    // StrictMode 중복 execution guard for redirects
    const ran = useRef(false);

    useEffect(() => {
        const from = location.pathname + location.search + location.hash;

        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            // No token -> redirect to login
            if (ran.current) return;
            ran.current = true;
            window.alert("로그인해야 이용할 수 있는 서비스입니다.");
            localStorage.removeItem(TOKEN_KEY);
            navigate(`/user/login?from=${encodeURIComponent(from)}`, { replace: true });
            setAllowed(false);
            return;
        }

        // token present -> verify with backend
        axios.get('/user/profile/me')
            .then(() => {
                setAllowed(true);
            })
            .catch(err => {
                if (err.response && err.response.status === 401) {
                    const oauthInProgress = typeof window !== 'undefined' && window.sessionStorage && window.sessionStorage.getItem && window.sessionStorage.getItem('oauthInProgress') === '1';
                    if (oauthInProgress) {
                        // Let user finish profile
                        if (ran.current) return;
                        ran.current = true;
                        navigate(`/profile/complete`, { replace: true });
                        setAllowed(false);
                        return;
                    }
                    // invalid token for normal user -> force login
                    if (ran.current) return;
                    ran.current = true;
                    localStorage.removeItem(TOKEN_KEY);
                    window.alert('세션이 만료되었습니다. 다시 로그인해주세요.');
                    navigate(`/user/login?from=${encodeURIComponent(from)}`, { replace: true });
                    setAllowed(false);
                    return;
                }
                // Other errors: block access
                setAllowed(false);
            });
    }, [location, navigate]);

    if (allowed === null) return null; // checking
    if (!allowed) return null;
    return children;
};

export default ProtectedRoute;