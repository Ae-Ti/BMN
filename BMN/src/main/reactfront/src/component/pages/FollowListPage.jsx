// src/component/pages/FollowListPage.jsx
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../config";
import "./FollowListPage.css";

axios.defaults.baseURL = API_BASE;

const TOKEN_KEY = "token";

/* ===== JWT / AUTH ===== */
function b64urlDecode(str) {
    try {
        const pad = (s) => s + "===".slice((s.length + 3) % 4);
        const b64 = pad(str.replace(/-/g, "+").replace(/_/g, "/"));
        return decodeURIComponent(
            Array.prototype.map
                .call(atob(b64), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
    } catch {
        return "";
    }
}
function usernameFromToken() {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) return "";
    const parts = t.split(".");
    if (parts.length < 2) return "";
    try {
        const payload = JSON.parse(b64urlDecode(parts[1]) || "{}");
        return payload.username ?? payload.userName ?? payload.sub ?? "";
    } catch {
        return "";
    }
}
function authHeaders() {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? { Authorization: `Bearer ${t}` } : {};
}

const FollowListPage = () => {
    const { username } = useParams();               // 보고 있는 대상의 username
    const nav = useNavigate();
    const me = usernameFromToken();                  // 로그인한 내 username

    const [tab, setTab] = useState("followers");     // "followers" | "following"
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    /* 목록 가져오기 (백엔드 응답을 즉시 정규화) */
    const fetchList = useCallback(async (which) => {
        const endpoint =
            which === "following"
                ? `/user/profile/${encodeURIComponent(username)}/following`
                : `/user/profile/${encodeURIComponent(username)}/followers`;
        try {
            const { data } = await axios.get(endpoint, {
                params: { page: 0, size: 50 },
                headers: authHeaders(),
            });
            const raw = data?.content ?? [];
            // ✨ 필드 정규화: username <- (dto.username | dto.userName)
            return raw.map((dto) => ({
                username: dto.username ?? dto.userName ?? "",
                nickname: dto.nickname ?? "",
                // 서버가 followedByMe를 내려줄 수도 있고 아닐 수도 있음 -> 기본 false
                followedByMe: !!dto.followedByMe,
            }));
        } catch (err) {
            if (err?.response?.status === 403) {
                setErrorMessage("비공개 계정입니다. 팔로우 승인된 사용자만 볼 수 있어요.");
            }
            return [];
        }
    }, [username]);

    /* 로그인 사용자가 해당 유저를 팔로우 중인지 서버로 확인 (필요시) */
    const enrichFollowState = useCallback(async (users) => {
        if (!me) return users.map((u) => ({ ...u, followedByMe: false }));
        const res = await Promise.all(
            users.map(async (u) => {
                if (!u.username || u.username === me) return { ...u, followedByMe: false };
                try {
                    const { data } = await axios.get(`/user/profile/${encodeURIComponent(u.username)}`, {
                        headers: authHeaders(),
                    });
                    return { ...u, followedByMe: !!data?.followedByMe };
                } catch {
                    return { ...u, followedByMe: false };
                }
            })
        );
        return res;
    }, [me]);

    /* 전체 로드 */
    useEffect(() => {
        (async () => {
            setLoading(true);
            setErrorMessage("");
            const normalized = await fetchList(tab);
            // 팔로우 버튼은 "로그인 사용자 기준"이므로 로그인한 나 기준으로 보정
            const withState = await enrichFollowState(normalized);
            setList(withState);
            setLoading(false);
        })();
    }, [tab, fetchList, enrichFollowState]);

    /* 클릭 시 프로필 이동 */
    const goProfile = (target) => {
        if (!target) return;
        if (me && target === me) nav("/mypage");
        else nav(`/profile/${encodeURIComponent(target)}`);
    };

    /* 팔로우/언팔로우 토글 */
    const toggleFollow = async (target, isFollowed, e) => {
        e?.stopPropagation(); // 버튼 클릭이 카드 클릭으로 전파되는 것 방지
        try {
            if (isFollowed) {
                await axios.delete(`/user/profile/${encodeURIComponent(target)}/follow`, {
                    headers: authHeaders(),
                });
            } else {
                await axios.post(`/user/profile/${encodeURIComponent(target)}/follow`, null, {
                    headers: authHeaders(),
                });
            }
            setList((prev) =>
                prev.map((u) =>
                    u.username === target ? { ...u, followedByMe: !isFollowed } : u
                )
            );
        } catch (err) {
            if (err.response?.status === 401) {
                alert("로그인이 필요합니다.");
                nav(`/user/login?from=${encodeURIComponent(window.location.pathname)}`);
            } else {
                alert("팔로우 작업 중 오류가 발생했습니다.");
            }
        }
    };

    const initials = (nickname, uname) => {
        const base = (nickname || uname || "").trim();
        return base ? base.slice(0, 2).toUpperCase() : "U";
    };

    const tabLabel = tab === "followers" ? "팔로워" : "팔로잉";

    return (
        <div className="page-container follow-page">
            <div className="follow-header">
                <button
                    type="button"
                    className="follow-back"
                    onClick={() => nav(-1)}
                    aria-label="뒤로가기"
                >
                    ←
                </button>
                <h1>{username}의 {tabLabel} 목록</h1>
            </div>

            {/* 탭 */}
            <div className="follow-tabs">
                <button
                    onClick={() => setTab("followers")}
                    className={`follow-tab${tab === "followers" ? " is-active" : ""}`}
                    aria-pressed={tab === "followers"}
                >
                    팔로워
                </button>
                <button
                    onClick={() => setTab("following")}
                    className={`follow-tab${tab === "following" ? " is-active" : ""}`}
                    aria-pressed={tab === "following"}
                >
                    팔로잉
                </button>
            </div>

            {loading && <p className="sx-m sx-n"  >불러오는 중...</p>}
            {!loading && errorMessage && <p style={{ color: "#b91c1c", fontWeight: 700 }}>{errorMessage}</p>}
            {!loading && !errorMessage && list.length === 0 && <p>표시할 항목이 없습니다.</p>}

            {!loading && list.length > 0 && (
                <div className="follow-grid">
                    {list.map((u) => {
                        const isMe = me && u.username === me;
                        const display = u.nickname ? `${u.nickname} (${u.username})` : u.username;

                        // 팔로우 버튼은 "로그인한 나" 기준:
                        // - 나 자신: 버튼 X
                        // - 이미 내가 팔로우 중: "팔로잉" 회색 뱃지
                        // - 아직 팔로우 안 함: 초록 "팔로우" 버튼
                        // - (요구사항에 맞춰 '팔로워' 탭에서만 버튼 노출하려면 tab === 'followers' 조건 추가)
                        const showFollowBtn = !isMe && !u.followedByMe;
                        const showFollowingBadge = !isMe && u.followedByMe;

                        return (
                            <div
                                key={u.username}
                                className="follow-card"
                                role="button"
                                tabIndex={0}
                                onClick={() => goProfile(u.username)}
                                onKeyDown={(e) => { if (e.key === "Enter") goProfile(u.username); }}
                                aria-label={`${display} 프로필로 이동`}
                            >
                                <div className="follow-card-left">
                                    <div className="follow-card-avatar">{initials(u.nickname, u.username)}</div>
                                    <div className="follow-card-name">
                                        {display} {isMe && "· 나"}
                                    </div>
                                </div>

                                {showFollowingBadge && (
                                    <div className="follow-status follow-status--following">팔로잉</div>
                                )}
                                {showFollowBtn && (
                                    <button
                                        type="button"
                                        className="follow-action follow-action--follow"
                                        onClick={(e) => toggleFollow(u.username, false, e)}
                                    >
                                        팔로우
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FollowListPage;