// src/component/pages/VerifyEmailChange.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../config";

axios.defaults.baseURL = API_BASE;

const VerifyEmailChange = () => {
    const nav = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState("verifying"); // verifying, success, error
    const [message, setMessage] = useState("");
    const [newEmail, setNewEmail] = useState("");

    useEffect(() => {
        const token = searchParams.get("token");
        if (!token) {
            setStatus("error");
            setMessage("유효하지 않은 링크입니다.");
            return;
        }

        (async () => {
            try {
                const { data } = await axios.get(`/user/profile/verify-email-change?token=${encodeURIComponent(token)}`);
                setStatus("success");
                setMessage(data.message || "이메일이 변경되었습니다.");
                setNewEmail(data.newEmail || "");
            } catch (err) {
                setStatus("error");
                setMessage(err.response?.data?.message || "이메일 변경 인증에 실패했습니다.");
            }
        })();
    }, [searchParams]);

    return (
        <div className="page-container">
            <div className="profile-card" style={{ textAlign: "center", padding: "40px" }}>
                {status === "verifying" && (
                    <>
                        <h2>이메일 변경 인증 중...</h2>
                        <p style={{ marginTop: "16px", color: "#666" }}>잠시만 기다려주세요.</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
                        <h2 style={{ color: "#059669" }}>이메일 변경 완료!</h2>
                        <p style={{ marginTop: "16px", color: "#333" }}>{message}</p>
                        {newEmail && (
                            <p style={{ marginTop: "8px", fontWeight: 600 }}>
                                새 이메일: {newEmail}
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
                )}

                {status === "error" && (
                    <>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
                        <h2 style={{ color: "#dc2626" }}>인증 실패</h2>
                        <p style={{ marginTop: "16px", color: "#666" }}>{message}</p>
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

export default VerifyEmailChange;
