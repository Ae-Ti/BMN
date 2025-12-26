import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../config";
import "./NotificationsPage.css";
import "./ProfilePage.css";

axios.defaults.baseURL = API_BASE;

const TOKEN_KEY = "token";
function authHeaders() {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? { Authorization: `Bearer ${t}` } : {};
}

const typeLabel = {
    FOLLOW_REQUEST: "팔로우 요청",
    FOLLOW_APPROVED: "팔로우 승인됨",
};

const NotificationsPage = () => {
    const nav = useNavigate();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const [message, setMessage] = useState("");
    // opponentId → 프로필 정보
    const [profileMap, setProfileMap] = useState({});

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setMessage("");
        try {
            const { data } = await axios.get("/notifications", { headers: authHeaders() });
            setItems(Array.isArray(data) ? data : []);
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
        fetchNotifications();
    }, [fetchNotifications]);

    // 모든 알림의 opponentId 프로필을 한 번에 fetch
    useEffect(() => {
        const ids = items.map(n => n.opponentId).filter(id => id && !(id in profileMap));
        if (ids.length === 0) return;
        Promise.all(ids.map(id =>
            axios.get(`/user/profile/id/${id}`, { headers: authHeaders() })
                .then(res => [id, res.data])
                .catch(() => [id, null])
        )).then(results => {
            setProfileMap(prev => {
                const next = { ...prev };
                results.forEach(([id, data]) => { next[id] = data; });
                return next;
            });
        });
    }, [items]);

    const markAsRead = async (id) => {
        try {
            await axios.post(`/notifications/${id}/delete`, null, { headers: authHeaders() });
            setItems((prev) => prev.filter((n) => n.id !== id));
        } catch (err) {
            alert("알림 확인에 실패했습니다.");
        }
    };

    const handleApprove = async (id) => {
        try {
            await axios.post(`/notifications/${id}/approve`, null, { headers: authHeaders() });
            setItems((prev) => prev.filter((n) => n.id !== id));
        } catch (err) {
            alert("승인 처리에 실패했습니다.");
        }
    };

    const handleReject = async (id) => {
        try {
            await axios.post(`/notifications/${id}/reject`, null, { headers: authHeaders() });
            setItems((prev) => prev.filter((n) => n.id !== id));
        } catch (err) {
            alert("거부 처리에 실패했습니다.");
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
                    {items.map((n) => {
                        // 모든 알림은 opponentId로 프로필 조회
                        const profile = n.opponentId ? profileMap[n.opponentId] : null;
                        // 백엔드에서 내려주는 opponentDisplayName(닉네임(아이디)) 우선 사용
                        const displayName = n.opponentDisplayName || (profile && profile.nickname && profile.username ? `${profile.nickname}(${profile.username})` : (profile?.nickname || profile?.username || ""));
                        const initials = profile
                            ? (profile.nickname || profile.username || "").trim().slice(0, 2).toUpperCase() || "U"
                            : "U";
                        const profileUserName = profile ? (profile.username || profile.userName) : undefined;
                        const profileUrl = profileUserName ? `/profile/${encodeURIComponent(profileUserName)}` : undefined;
                        // 디버깅용 콘솔 출력
                        console.log('알림카드', {id: n.id, opponentId: n.opponentId, profile, profileUrl, displayName});

                        return (
                            <div
                                className={`notifications-card${n.read ? " notifications-read" : ""}`}
                                key={n.id}
                                tabIndex={0}
                                aria-label={n.message}
                                onClick={profileUrl ? (e) => {
                                    if (e.target.tagName === "BUTTON") return;
                                    nav(profileUrl);
                                } : undefined}
                                style={profileUrl ? { cursor: "pointer" } : {}}
                            >
                                <div className="notifications-info">
                                    <div className="profile-avatar" aria-hidden>{initials}</div>
                                    <div className="notifications-text">
                                        <div className="notifications-name">{displayName}</div>
                                        <div className="notifications-type">{typeLabel[n.type] || n.type}</div>
                                        <div className="notifications-sub">{n.message}</div>
                                        <div className="notifications-date">{n.createdAt?.replace("T", " ").slice(0, 16)}</div>
                                    </div>
                                </div>
                                {!n.read && (
                                    <div className="notifications-actions">
                                        {n.type === "FOLLOW_REQUEST" ? (
                                            <>
                                                <button className="btn-approve" onClick={() => handleApprove(n.id)}>승인</button>
                                                <button className="btn-reject" onClick={() => handleReject(n.id)}>거부</button>
                                            </>
                                        ) : (
                                            <button className="btn-approve" onClick={() => markAsRead(n.id)}>확인</button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default NotificationsPage;
