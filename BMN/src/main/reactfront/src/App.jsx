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
import FollowListPage from "./component/pages/FollowListPage";
import MealMain from "./component/pages/MealMain";

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Layout />}>
                    {/* 공개 페이지 */}
                    <Route index element={<RecipeMain />} />
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