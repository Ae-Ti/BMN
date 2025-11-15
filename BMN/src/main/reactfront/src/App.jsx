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
import FridgePage from "./component/pages/FridgePage";
import ProfilePage from "./component/pages/ProfilePage";
import ProfileComplete from "./component/pages/ProfileComplete";
import FollowListPage from "./component/pages/FollowListPage";
import MealMain from "./component/pages/MealMain";
import MainPage from "./component/pages/MainPage";
import axios from 'axios';

// Add a response interceptor
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
        if (error.response && error.response.status === 401) {
            try {
                // If the failing request is part of the OAuth handshake or login endpoints,
                // do not trigger the global logout behavior (it interrupts the redirect).
                const reqUrl = (error.config && error.config.url) ? String(error.config.url) : '';
                const isOAuthRequest = reqUrl.includes('/oauth2/') || reqUrl.includes('/login/oauth2') || reqUrl.includes('/user/login');
                        const hasTokenInQuery = typeof window !== 'undefined' && window.location && window.location.search && window.location.search.includes('token=');
                        const oauthInProgress = typeof window !== 'undefined' && window.sessionStorage && window.sessionStorage.getItem && window.sessionStorage.getItem('oauthInProgress') === '1';
                        if (isOAuthRequest || hasTokenInQuery || oauthInProgress) {
                            return Promise.reject(error);
                        }

                const token = localStorage.getItem("token");
                if (token) { // Only run if a token was present
                    localStorage.removeItem("token");
                    if (window.location.pathname !== '/user/login') {
                        alert('세션이 만료되었습니다. 다시 로그인해주세요.');
                        window.location.href = '/user/login';
                    }
                }
            } catch (e) {
                // If any error happens during interception, just ignore and forward the original error
                return Promise.reject(error);
            }
        }
    return Promise.reject(error);
  }
);

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
                    <Route path="/recipe/:id" element={<RecipeDetail />} />
                    <Route path="/ingredient" element={<Ingredient />} /> {/* ✅ 추가 */}

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
                        path="profile/:username"
                        element={
                            <ProtectedRoute>
                                <ProfilePage />
                            </ProtectedRoute>
                        }
                    />
                    {/* OAuth first-login profile completion (not wrapped with ProtectedRoute because token may be in query param) */}
                    <Route path="profile/complete" element={<ProfileComplete />} />
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