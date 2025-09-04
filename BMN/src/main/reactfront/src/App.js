// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./component/Layout";
import RecipeMain from "./component/pages/RecipeMain";
import PostCreate from "./component/pages/PostCreate";
import LogIn from "./component/pages/LogIn";
import SignUp from "./component/pages/SignUp";
import HouseholdLedgerMain from "./component/pages/HouseholdLedgerMain";
import ProtectedRoute from "./component/ProtectedRoute"; // ✅ 추가

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Layout />}>
                    {/* Layout 안의 자식 경로는 슬래시 없이! */}
                    <Route index element={<RecipeMain />} />
                    <Route path="post-create" element={<PostCreate />} />
                    <Route path="user/login" element={<LogIn />} />
                    <Route path="signup" element={<SignUp />} />

                    {/* ✅ 보호 라우트로 감싸기 */}
                    <Route
                        path="household-ledger"
                        element={
                            <ProtectedRoute>
                                <HouseholdLedgerMain />
                            </ProtectedRoute>
                        }
                    />
                </Route>
            </Routes>
        </Router>
    );
};

export default App;