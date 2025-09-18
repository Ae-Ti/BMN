// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./component/Layout";
import RecipeMain from "./component/pages/RecipeMain";
import RecipeDetail from "./component/pages/RecipeDetail";
import PostCreate from "./component/pages/PostCreate";
import LogIn from "./component/pages/LogIn";
import SignUp from "./component/pages/SignUp";
import HouseholdLedgerMain from "./component/pages/HouseholdLedgerMain";
import ProtectedRoute from "./component/ProtectedRoute";
import RecipesList from "./component/pages/RecipeList";
import Ingredient from "./component/pages/Ingredient";

// ✅ 새 페이지
import MyPage from "./component/pages/MyPage";
import FridgePage from "./component/pages/FridgePage";

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

                    {/* ✅ 상세 & 업로드 보호 */}
                    <Route
                        path="recipes/:id"
                        element={
                            <ProtectedRoute>
                                <RecipeDetail />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="post-create"
                        element={
                            <ProtectedRoute>
                                <PostCreate />
                            </ProtectedRoute>
                        }
                    />

                    {/* 그 외 보호 라우트 */}
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
                        path="fridge"
                        element={
                            <ProtectedRoute>
                                <FridgePage />
                            </ProtectedRoute>
                        }
                    />
                </Route>
            </Routes>
        </Router>
    );
};

export default App;