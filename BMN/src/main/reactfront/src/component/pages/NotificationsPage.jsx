import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../config";
import "./NotificationsPage.css";

axios.defaults.baseURL = API_BASE;

const TOKEN_KEY = "token";

function authHeaders() {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? { Authorization: `Bearer ${t}` } : {};
}

const NotificationsPage = () => {
    const nav = useNavigate();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const [message, setMessage] = useState("");

    const goProfile = useCallback((username) => {
        if (!username) return;
        nav(`/profile/${encodeURIComponent(username)}`);
    }, [nav]);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setMessage("");
        try {
            const { data } = await axios.get("/user/profile/me/follow-requests", { headers: authHeaders() });
            const list = Array.isArray(data) ? data : [];
            setItems(list);
            const sig = list
                .map((i) => i.userName || i.username || "")
                .filter(Boolean)
                .sort()
                .join("|");
            if (sig) {
                localStorage.setItem("notificationsSignatureSeen", sig);
            }
            window.dispatchEvent(new CustomEvent("notifications-read", { detail: sig }));
        } catch (err) {
            if (err?.response?.status === 401) {
                alert("로그인이 필요합니다.");
                nav(`/user/login?from=${encodeURIComponent(window.location.pathname)}`);
            } else {
                setMessage("알림을 불러오지 못했습니다.");
            }
        } finally {
            setLoading(false);
        }
    }, [nav]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const act = async (username, action) => {
        try {
            const url = `/user/profile/me/follow-requests/${encodeURIComponent(username)}/${action}`;
            await axios.post(url, null, { headers: authHeaders() });
            setItems((prev) => prev.filter((i) => i.userName !== username));
        } catch (err) {
            const msg = err?.response?.data?.message || `${action === "approve" ? "승인" : "거절"}에 실패했습니다.`;
            alert(msg);
        }
    };

    return (
        <div className="page-container notifications-page">
            <div className="notifications-header">
                <button className="notifications-back" onClick={() => nav(-1)} aria-label="뒤로가기">←</button>
                <h1>알림</h1>
            </div>
            {loading && <p>불러오는 중...</p>}
            {!loading && message && <p className="notifications-error">{message}</p>}
            {!loading && !message && items.length === 0 && (
                <p className="notifications-empty">새로운 알림이 없습니다.</p>
            )}
            {!loading && items.length > 0 && (
                <div className="notifications-list">
                    {items.map((req) => {
                        const profileUsername = req.userName || req.username || "";
                        const display = req.nickname ? `${req.nickname} (${profileUsername})` : profileUsername;
                        return (
                            <div
                                className="notifications-card"
                                key={profileUsername}
                                role="button"
                                tabIndex={0}
                                onClick={() => goProfile(profileUsername)}
                                onKeyDown={(e) => { if (e.key === "Enter") goProfile(profileUsername); }}
                                aria-label={`${display} 프로필로 이동`}
                            >
                                <div className="notifications-info">
                                    <div className="notifications-avatar">{(req.nickname || req.userName || "").slice(0, 2).toUpperCase()}</div>
                                    <div className="notifications-text">
                                        <div className="notifications-name">{display}</div>
                                        <div className="notifications-sub">팔로우 요청</div>
                                    </div>
                                </div>
                                <div className="notifications-actions">
                                    <button className="btn-approve" onClick={(e) => { e.stopPropagation(); act(profileUsername, "approve"); }}>승인</button>
                                    <button className="btn-reject" onClick={(e) => { e.stopPropagation(); act(profileUsername, "reject"); }}>거절</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
