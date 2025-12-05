// src/component/pages/VerifyEmailChangeResult.jsx
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const VerifyEmailChangeResult = () => {
    const nav = useNavigate();
    const [searchParams] = useSearchParams();
    
    const success = searchParams.get("success") === "true";
    const email = searchParams.get("email");
    const message = searchParams.get("message");

    return (
        <div className="page-container">
            <div className="profile-card" style={{ textAlign: "center", padding: "40px" }}>
                {success ? (
                    <>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
                        <h2 style={{ color: "#059669" }}>이메일 변경 완료!</h2>
                        <p style={{ marginTop: "16px", color: "#333" }}>
                            이메일이 성공적으로 변경되었습니다.
                        </p>
                        {email && (
                            <p style={{ marginTop: "8px", fontWeight: 600 }}>
                                새 이메일: {email}
                            </p>
                        )}
                        <button
                            onClick={() => nav("/mypage")}
                            className="btn-primary"
                            style={{ marginTop: "24px" }}
                        >
                            마이페이지로 이동
                        </button>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
                        <h2 style={{ color: "#dc2626" }}>인증 실패</h2>
                        <p style={{ marginTop: "16px", color: "#666" }}>
                            {message || "이메일 변경 인증에 실패했습니다."}
                        </p>
                        <button
                            onClick={() => nav("/settings")}
                            className="btn-secondary"
                            style={{ marginTop: "24px" }}
                        >
                            설정 페이지로 이동
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default VerifyEmailChangeResult;
