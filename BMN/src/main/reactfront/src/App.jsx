// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./component/Layout";
import RecipeMain from "./component/pages/RecipeMain";
import RecipeDetail from "./component/pages/RecipeDetail";
import LogIn from "./component/pages/LogIn";
import SignUp from "./component/pages/SignUp";
import HouseholdLedgerMain from "./component/pages/HouseholdLedgerMain";
import ProtectedRoute from "./component/ProtectedRoute";
import RecipesList from "./component/pages/RecipeList";
import Ingredient from "./component/pages/Ingredient";

// ✅ 새로 교체된 공용 작성/수정 폼
import RecipeForm from "./component/pages/RecipeForm";

// ✅ 기타 페이지
import MyPage from "./component/pages/MyPage";
import VerifyInstructions from "./component/pages/VerifyInstructions";
import VerifySuccess from "./component/pages/VerifySuccess";
import VerifyEmailChange from "./component/pages/VerifyEmailChange";
import FridgePage from "./component/pages/FridgePage";
import ProfilePage from "./component/pages/ProfilePage";
import ProfileComplete from "./component/pages/ProfileComplete";
import FollowListPage from "./component/pages/FollowListPage";
import MealMain from "./component/pages/MealMain";
import MainPage from "./component/pages/MainPage";
import ProfileSettings from "./component/pages/ProfileSettings";
import axios from 'axios';

// Initialize axios Authorization header from localStorage on app load
const TOKEN_KEY = "token";
(() => {
    try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        if (storedToken && storedToken !== "null" && storedToken !== "undefined") {
            axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
        }
    } catch (e) {
        console.warn('[App] Failed to initialize Authorization header:', e);
    }
})();

// Add a response interceptor
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
        // Network error (no response from server) - don't treat as auth failure
        if (!error.response) {
            console.warn('[axios] Network error:', error.message);
            return Promise.reject(error);
        }

        if (error.response.status === 401) {
            // Only treat as session-expired when backend explicitly signals TOKEN_EXPIRED or INVALID_TOKEN
            const respData = error.response.data || {};
            const code = respData.code || respData.error || '';
            
            // If not an explicit token error, forward the error without logout
            if (code !== 'TOKEN_EXPIRED' && code !== 'INVALID_TOKEN') {
                return Promise.reject(error);
            }
            
            try {
                // If the failing request is part of the OAuth handshake or login endpoints,
                // do not trigger the global logout behavior (it interrupts the redirect).
                const reqUrl = (error.config && error.config.url) ? String(error.config.url) : '';
                // Consider only true OAuth handshake endpoints as OAuth requests.
                const isOAuthRequest = reqUrl.includes('/oauth2/') || reqUrl.includes('/login/oauth2');
                const hasTokenInQuery = typeof window !== 'undefined' && window.location && window.location.search && window.location.search.includes('token=');
                
                // Only skip logout for active OAuth handshake (token in URL), not for stale oauthInProgress flag
                if (isOAuthRequest || hasTokenInQuery) {
                    return Promise.reject(error);
                }

                // Token expired/invalid -> clear session and redirect to login
                // Also clear the oauthInProgress flag since the session is no longer valid
                console.log('[axios] Token expired/invalid, clearing session');
                try { sessionStorage.removeItem('oauthInProgress'); } catch(e) {}
                try { localStorage.removeItem(TOKEN_KEY); } catch(e) {}
                try { delete axios.defaults.headers.common['Authorization']; } catch(e) {}
                if (window.location.pathname !== '/user/login') {
                    try { alert('세션이 만료되었습니다. 다시 로그인해주세요.'); } catch(e) {}
                    window.location.href = '/user/login';
                }
            } catch (e) {
                // If any error happens during interception, just ignore and forward the original error
                return Promise.reject(error);
            }
        }
    return Promise.reject(error);
  }
);

// Token refresh utility - refreshes token when it's close to expiring
const TOKEN_REFRESH_THRESHOLD_MS = 30 * 60 * 1000; // Refresh when 30 minutes or less remaining
const TOKEN_REFRESH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

const getTokenExpiration = (token) => {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1]));
        return payload.exp ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
};

const refreshTokenIfNeeded = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    
    const expMs = getTokenExpiration(token);
    if (!expMs) return;
    
    const timeUntilExpiry = expMs - Date.now();
    if (timeUntilExpiry > TOKEN_REFRESH_THRESHOLD_MS) {
        // Token still has plenty of time, no need to refresh
        return;
    }
    
    if (timeUntilExpiry <= 0) {
        // Token already expired, don't try to refresh
        console.log('[App] Token already expired, not refreshing');
        return;
    }
    
    try {
        console.log('[App] Token expiring soon, attempting refresh...');
        const res = await axios.post('/user/refresh-token');
        if (res.data && res.data.token) {
            localStorage.setItem(TOKEN_KEY, res.data.token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
            console.log('[App] Token refreshed successfully');
            window.dispatchEvent(new Event('auth-changed'));
        }
    } catch (err) {
        console.warn('[App] Token refresh failed:', err.message);
        // Don't force logout here - let the normal 401 handling take care of it
    }
};

// Start token refresh check interval
if (typeof window !== 'undefined') {
    setInterval(refreshTokenIfNeeded, TOKEN_REFRESH_CHECK_INTERVAL_MS);
    // Also check on page visibility change (when user returns to tab)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            refreshTokenIfNeeded();
        }
    });
}

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Layout />}>
                    {/* 공개 페이지 */}
                    <Route index element={<RecipeMain />} />
                    <Route path="main" element={<MainPage />} />
                    <Route path="recipes" element={<RecipesList />} />
                    <Route path="user/login" element={<LogIn />} />
                    <Route path="signup" element={<SignUp />} />
                    <Route
                        path="ingredient"
                        element={
                            <ProtectedRoute>
                                <Ingredient />
                            </ProtectedRoute>
                        }
                    /> {/* ✅ 보호된 경로로 변경 */}

                    {/* ✅ 상세 & 업로드/수정 보호 */}
                    <Route
                        path="recipes/:id"
                        element={
                            <ProtectedRoute>
                                <RecipeDetail />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="recipes/create"
                        element={
                            <ProtectedRoute>
                                <RecipeForm />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="recipes/edit/:id"
                        element={
                            <ProtectedRoute>
                                <RecipeForm />
                            </ProtectedRoute>
                        }
                    />

                    {/* ✅ 그 외 보호 라우트 */}
                    <Route
                        path="household-ledger"
                        element={
                            <ProtectedRoute>
                                <HouseholdLedgerMain />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="mypage"
                        element={
                            <ProtectedRoute>
                                <MyPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="settings"
                        element={
                            <ProtectedRoute>
                                <ProfileSettings />
                            </ProtectedRoute>
                        }
                    />
                        <Route path="/verify-instructions" element={<VerifyInstructions />} />
                            <Route path="/verify-success" element={<VerifySuccess />} />
                            <Route path="/user/verify-email-change" element={<VerifyEmailChange />} />
                    <Route
                        path="account/setup"
                        element={<ProfileComplete />}
                    />
                    <Route
                        path="profile/:username"
                        element={
                            <ProtectedRoute>
                                <ProfilePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="profile/:username/followers"
                        element={
                            <ProtectedRoute>
                                <FollowListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="profile/:username/following"
                        element={
                            <ProtectedRoute>
                                <FollowListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="fridge"
                        element={
                            <ProtectedRoute>
                                <FridgePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/meal"
                        element={
                            <ProtectedRoute>
                                <MealMain />
                            </ProtectedRoute>
                        }
                    />
                </Route>
            </Routes>
        </Router>
    );
};

export default App;