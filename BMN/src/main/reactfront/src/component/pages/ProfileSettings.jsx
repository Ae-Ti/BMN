// src/component/pages/ProfileSettings.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../config";
import "./ProfileSettings.css";

axios.defaults.baseURL = API_BASE;

const TOKEN_KEY = "token";

function authHeaders() {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? { Authorization: `Bearer ${t}` } : {};
}

const ProfileSettings = () => {
    const nav = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        username: "",
        nickname: "",
        email: "",
        introduction: "",
        emailPublic: false,
        privateAccount: false,
    });
    const [formData, setFormData] = useState({
        nickname: "",
        introduction: "",
        emailPublic: false,
        privateAccount: false,
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deleting, setDeleting] = useState(false);

    // 이메일 변경 상태
    const [showEmailChange, setShowEmailChange] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [emailChanging, setEmailChanging] = useState(false);
    const [emailChangeMessage, setEmailChangeMessage] = useState("");

    // 프로필 정보 로드
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const { data } = await axios.get("/user/profile/me", { headers: authHeaders() });
                setProfile({
                    username: data?.username ?? data?.userName ?? "",
                    nickname: data?.nickname ?? "",
                    email: data?.email ?? "",
                    introduction: data?.introduction ?? "",
                    emailPublic: data?.emailPublic ?? false,
                    privateAccount: data?.privateAccount ?? false,
                });
                setFormData({
                    nickname: data?.nickname ?? "",
                    introduction: data?.introduction ?? "",
                    emailPublic: data?.emailPublic ?? false,
                    privateAccount: data?.privateAccount ?? false,
                });
            } catch (err) {
                console.error("Failed to load profile:", err);
                alert("프로필 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // 입력 핸들러
    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ 
            ...prev, 
            [name]: type === "checkbox" ? checked : value 
        }));
    }, []);

    // 프로필 수정 제출
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data } = await axios.put("/user/profile/me", formData, {
                headers: authHeaders(),
            });
            alert(data.message || "프로필이 수정되었습니다.");
            nav("/mypage");
        } catch (err) {
            console.error("Failed to update profile:", err);
            alert("프로필 수정에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    };

    // 회원 탈퇴
    const handleDelete = async () => {
        if (deleteConfirmText !== "회원탈퇴") {
            alert("확인을 위해 '회원탈퇴'를 정확히 입력해주세요.");
            return;
        }
        setDeleting(true);
        try {
            await axios.delete("/user/profile/me", { headers: authHeaders() });
            alert("회원 탈퇴가 완료되었습니다. 안녕히 가세요.");
            localStorage.removeItem(TOKEN_KEY);
            sessionStorage.clear();
            nav("/user/login");
        } catch (err) {
            console.error("Failed to delete account:", err);
            alert("회원 탈퇴 처리 중 오류가 발생했습니다.");
        } finally {
            setDeleting(false);
        }
    };

    // 이메일 변경 요청
    const handleEmailChange = async () => {
        if (!newEmail.trim()) {
            alert("새 이메일 주소를 입력해주세요.");
            return;
        }
        // 이메일 형식 검증
        const emailRegex = /^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(newEmail.trim())) {
            alert("올바른 이메일 형식이 아닙니다.");
            return;
        }
        setEmailChanging(true);
        setEmailChangeMessage("");
        try {
            const { data } = await axios.post("/user/profile/me/email-change", 
                { newEmail: newEmail.trim() },
                { headers: authHeaders() }
            );
            setEmailChangeMessage(data.message || "인증 메일을 발송했습니다.");
            setNewEmail("");
        } catch (err) {
            console.error("Failed to request email change:", err);
            const errMsg = err.response?.data?.message || "이메일 변경 요청에 실패했습니다.";
            alert(errMsg);
        } finally {
            setEmailChanging(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <h1 className="ml-16-67pct">설정</h1>
                <div className="profile-card">
                    <p>정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <h1 className="ml-16-67pct">설정</h1>

            <div className="profile-card">
                {/* 프로필 정보 수정 섹션 */}
                <div className="settings-section">
                    <h2 className="settings-section-title">프로필 정보 수정</h2>
                    <form onSubmit={handleSubmit} className="settings-form">
                        <div className="form-group">
                            <label htmlFor="username">아이디</label>
                            <input
                                type="text"
                                id="username"
                                value={profile.username}
                                disabled
                                className="form-input disabled"
                            />
                            <small className="form-hint">아이디는 변경할 수 없습니다.</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">이메일</label>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <input
                                    type="email"
                                    id="email"
                                    value={profile.email}
                                    disabled
                                    className="form-input disabled"
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowEmailChange(!showEmailChange)}
                                    className="btn-secondary"
                                    style={{ whiteSpace: "nowrap" }}
                                >
                                    {showEmailChange ? "취소" : "변경"}
                                </button>
                            </div>
                            {showEmailChange && (
                                <div className="email-change-box" style={{ marginTop: "12px", padding: "12px", background: "#f9fafb", borderRadius: "8px" }}>
                                    <label htmlFor="newEmail" style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "14px" }}>
                                        새 이메일 주소
                                    </label>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <input
                                            type="email"
                                            id="newEmail"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            className="form-input"
                                            placeholder="새 이메일 주소 입력"
                                            style={{ flex: 1 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleEmailChange}
                                            disabled={emailChanging || !newEmail.trim()}
                                            className="btn-primary"
                                            style={{ whiteSpace: "nowrap" }}
                                        >
                                            {emailChanging ? "전송 중..." : "인증 메일 발송"}
                                        </button>
                                    </div>
                                    <small className="form-hint" style={{ marginTop: "6px", display: "block" }}>
                                        새 이메일로 인증 메일이 발송됩니다. 인증 완료 후 이메일이 변경됩니다.
                                    </small>
                                    {emailChangeMessage && (
                                        <p style={{ marginTop: "8px", color: "#059669", fontWeight: 600, fontSize: "14px" }}>
                                            ✓ {emailChangeMessage}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    name="emailPublic"
                                    checked={formData.emailPublic}
                                    onChange={handleChange}
                                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                />
                                <span>이메일 공개</span>
                            </label>
                            <small className="form-hint" style={{ marginTop: "4px" }}>
                                체크하면 다른 사용자가 내 프로필에서 이메일을 볼 수 있습니다.
                            </small>
                        </div>

                        <div className="form-group">
                            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    name="privateAccount"
                                    checked={formData.privateAccount}
                                    onChange={handleChange}
                                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                />
                                <span>계정 비공개</span>
                            </label>
                            <small className="form-hint" style={{ marginTop: "4px" }}>
                                비공개로 설정하면 팔로우 승인 후에만 팔로우/채팅/팔로워·팔로잉 열람이 가능합니다.
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="nickname">닉네임</label>
                            <input
                                type="text"
                                id="nickname"
                                name="nickname"
                                value={formData.nickname}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="닉네임을 입력하세요"
                                maxLength={20}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="introduction">소개글</label>
                            <textarea
                                id="introduction"
                                name="introduction"
                                value={formData.introduction}
                                onChange={handleChange}
                                className="form-input form-textarea"
                                placeholder="자기소개를 입력하세요"
                                rows={4}
                                maxLength={200}
                                style={{ resize: "none" }}
                            />
                            <small className="form-hint">{formData.introduction.length}/200자</small>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                onClick={() => nav("/mypage")}
                                className="btn-secondary"
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary"
                            >
                                {saving ? "저장 중..." : "저장"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* 회원 탈퇴 섹션 */}
                <div className="settings-section danger-section">
                    <h2 className="settings-section-title danger-title">회원 탈퇴</h2>
                    <p className="danger-description">
                        회원 탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
                    </p>

                    {!showDeleteConfirm ? (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="btn-danger-outline"
                        >
                            회원 탈퇴
                        </button>
                    ) : (
                        <div className="delete-confirm-box">
                            <p className="confirm-message">
                                정말로 탈퇴하시겠습니까? 확인을 위해 아래에 <strong>'회원탈퇴'</strong>를 입력해주세요.
                            </p>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="form-input confirm-input"
                                placeholder="회원탈퇴"
                            />
                            <div className="confirm-actions">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setDeleteConfirmText("");
                                    }}
                                    className="btn-secondary"
                                >
                                    취소
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={deleting || deleteConfirmText !== "회원탈퇴"}
                                    className="btn-danger"
                                >
                                    {deleting ? "처리 중..." : "탈퇴 확인"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
