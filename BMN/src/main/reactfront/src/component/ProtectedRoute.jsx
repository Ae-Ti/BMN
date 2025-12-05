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
                // Network error (no response) - don't logout, just allow access with existing token
                if (!err.response) {
                    console.warn('[ProtectedRoute] Network error during token verification, allowing access:', err.message);
                    setAllowed(true);
                    return;
                }

                const status = err.response.status;
                const code = err.response.data?.code || '';

                // TOKEN_EXPIRED or INVALID_TOKEN -> always go to login page
                if (status === 401 && (code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN')) {
                    if (ran.current) return;
                    ran.current = true;
                    try { sessionStorage.removeItem('oauthInProgress'); } catch(e) {}
                    localStorage.removeItem(TOKEN_KEY);
                    window.alert('세션이 만료되었습니다. 다시 로그인해주세요.');
                    navigate(`/user/login?from=${encodeURIComponent(from)}`, { replace: true });
                    setAllowed(false);
                    return;
                }

                // USER_NOT_FOUND -> user has valid token but no DB record
                // This happens for OAuth users who haven't completed their profile
                if (status === 401 && code === 'USER_NOT_FOUND') {
                    // Check if this is an active OAuth flow (token just received from OAuth redirect)
                    const hasTokenInQuery = window.location.search.includes('token=');
                    const oauthInProgress = sessionStorage.getItem('oauthInProgress') === '1';
                    
                    if (hasTokenInQuery || oauthInProgress) {
                        // Active OAuth flow - redirect to profile completion
                        if (ran.current) return;
                        ran.current = true;
                        navigate('/account/setup', { replace: true });
                        setAllowed(false);
                        return;
                    } else {
                        // Not an active OAuth flow - this shouldn't normally happen
                        // but if it does, clear everything and go to login
                        if (ran.current) return;
                        ran.current = true;
                        try { sessionStorage.removeItem('oauthInProgress'); } catch(e) {}
                        localStorage.removeItem(TOKEN_KEY);
                        window.alert('다시 로그인해주세요.');
                        navigate(`/user/login?from=${encodeURIComponent(from)}`, { replace: true });
                        setAllowed(false);
                        return;
                    }
                }

                // UNAUTHENTICATED or other 401 without recognized code -> go to login
                if (status === 401) {
                    if (ran.current) return;
                    ran.current = true;
                    try { sessionStorage.removeItem('oauthInProgress'); } catch(e) {}
                    localStorage.removeItem(TOKEN_KEY);
                    window.alert('로그인이 필요합니다.');
                    navigate(`/user/login?from=${encodeURIComponent(from)}`, { replace: true });
                    setAllowed(false);
                    return;
                }

                // Server errors (5xx) - don't logout, allow access
                if (status >= 500) {
                    console.warn('[ProtectedRoute] Server error during verification, allowing access:', status);
                    setAllowed(true);
                    return;
                }

                // Other client errors (4xx except 401): block access but don't logout
                console.warn('[ProtectedRoute] Unexpected error:', status);
                setAllowed(false);
            });
    }, [location, navigate]);

    if (allowed === null) return null; // checking
    if (!allowed) return null;
    return children;
};

export default ProtectedRoute;