// src/component/pages/ChatPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../config";
import "./ChatPage.css";

axios.defaults.baseURL = API_BASE;

const TOKEN_KEY = "token";
const PAGE_SIZE = 20;

const decodeJwtPayload = (segment) => {
    try {
        const pad = (s) => s + "===".slice((s.length + 3) % 4);
        const b64 = pad(segment.replace(/-/g, "+").replace(/_/g, "/"));
        const bin = atob(b64);
        const json = decodeURIComponent(
            Array.prototype
                .map
                .call(bin, (ch) => `%${("00" + ch.charCodeAt(0).toString(16)).slice(-2)}`)
                .join("")
        );
        return JSON.parse(json);
    } catch (e) {
        return {};
    }
};

const usernameFromToken = () => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) return "";
    const parts = t.split(".");
    if (parts.length < 2) return "";
    const payload = decodeJwtPayload(parts[1]);
    return payload.username || payload.userName || payload.sub || "";
};

const authHeaders = () => {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? { Authorization: `Bearer ${t}` } : {};
};

const normalizeConversation = (item) => {
    const partner = item.partner || item.username || item.userName || "";
    const latestMsg = item.latestMessage || item.latest || item.lastMessage || {};
    return {
        partner,
        nickname: item.nickname || item.partnerNickname || "",
        latestMessage: latestMsg.content || latestMsg.text || "",
        latestAt: latestMsg.createdAt || latestMsg.at || item.latestAt || null,
        unreadCount: Number(item.unreadCount || item.unread || 0),
    };
};

const normalizeMessage = (item, me) => {
    return {
        id: item.id || `${item.createdAt || item.at || Date.now()}-${item.content || item.text}`,
        text: item.content || item.text || "",
        createdAt: item.createdAt || item.at || item.time || null,
        fromMe: !!(item.fromMe !== undefined ? item.fromMe : item.sender === me || item.senderUsername === me),
        read: item.read ?? item.isRead ?? false,
    };
};

const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    if (sameDay) return `${hh}:${mm}`;
    return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
};

const ChatPage = () => {
    const nav = useNavigate();
    const me = useMemo(() => usernameFromToken(), []);

    const [search, setSearch] = useState("");
    const [followings, setFollowings] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState(null);

    const [messagesByPartner, setMessagesByPartner] = useState({});
    const [pageByPartner, setPageByPartner] = useState({});
    const [hasMoreByPartner, setHasMoreByPartner] = useState({});
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const [draft, setDraft] = useState("");
    const scrollRef = useRef(null);

    const partnerMap = useMemo(() => {
        const map = new Map();
        followings.forEach((p) => map.set(p.username, p));
        return map;
    }, [followings]);

    const canSendToSelected = useMemo(() => {
        return !!(selectedPartner && partnerMap.has(selectedPartner));
    }, [partnerMap, selectedPartner]);

    const partnerDisplay = useCallback((partner, nicknameHint) => {
        const p = partnerMap.get(partner) || { username: partner };
        const username = p.username || partner;
        const nickname = nicknameHint || p.nickname || "";
        const display = nickname || username;
        const avatar = (nickname || username || "?").slice(0, 2).toUpperCase();
        return { username, nickname, display, avatar };
    }, [partnerMap]);

    const filteredFollowings = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return followings;
        return followings.filter((p) =>
            (p.username || "").toLowerCase().includes(q) || (p.nickname || "").toLowerCase().includes(q)
        );
    }, [followings, search]);

    const sortedConversations = useMemo(() => {
        return [...conversations].sort((a, b) => {
            const aTime = a.latestAt ? new Date(a.latestAt).getTime() : 0;
            const bTime = b.latestAt ? new Date(b.latestAt).getTime() : 0;
            return bTime - aTime;
        });
    }, [conversations]);

    const selectedConversation = useMemo(() => {
        return conversations.find((c) => c.partner === selectedPartner) || null;
    }, [conversations, selectedPartner]);

    const currentMessages = useMemo(() => {
        return messagesByPartner[selectedPartner] || [];
    }, [messagesByPartner, selectedPartner]);

    const fetchFollowings = useCallback(async (query = "") => {
        setFollowLoading(true);
        try {
            const { data } = await axios.get("/user/profile/me/following", {
                params: { q: query || undefined, page: 0, size: 30 },
                headers: authHeaders(),
            });
            const raw = data?.content || data || [];
            const normalized = raw.map((p) => ({
                username: p.username || p.userName || "",
                nickname: p.nickname || "",
            }));
            setFollowings(normalized);
        } catch (err) {
            console.warn("[chat] follow fetch failed", err.message);
        } finally {
            setFollowLoading(false);
        }
    }, []);

    const fetchConversations = useCallback(async () => {
        setLoadingConversations(true);
        try {
            const { data } = await axios.get("/chat/conversations", {
                params: { page: 0, size: 50 },
                headers: authHeaders(),
            });
            const list = (data?.content || data || []).map(normalizeConversation);
            setConversations(list);
            if (!selectedPartner && list.length > 0) {
                setSelectedPartner(list[0].partner);
            }
        } catch (err) {
            console.warn("[chat] conversation fetch failed", err.message);
            setError("채팅 목록을 불러오지 못했습니다.");
        } finally {
            setLoadingConversations(false);
        }
    }, [selectedPartner]);

    const fetchMessages = useCallback(async (partner, page = 0) => {
        if (!partner) return;
        setLoadingMessages(true);
        try {
            const { data } = await axios.get(`/chat/conversations/${encodeURIComponent(partner)}/messages`, {
                params: { page, size: PAGE_SIZE },
                headers: authHeaders(),
            });
            const items = data?.content || data?.messages || data || [];
            const normalized = items.map((m) => normalizeMessage(m, me)).filter((m) => m.text || m.createdAt);
            const merged = (prev) => {
                const existing = prev[partner] || [];
                const combined = [...existing, ...normalized];
                const byId = new Map();
                combined.forEach((m) => {
                    byId.set(m.id, m);
                });
                const deduped = Array.from(byId.values());
                deduped.sort((a, b) => {
                    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return at - bt;
                });
                return { ...prev, [partner]: deduped };
            };
            setMessagesByPartner(merged);

            const hasMore = data?.last === false || (data?.hasNext ?? false) || items.length === PAGE_SIZE;
            setHasMoreByPartner((prev) => ({ ...prev, [partner]: hasMore }));
            setPageByPartner((prev) => ({ ...prev, [partner]: page }));
        } catch (err) {
            console.warn("[chat] message fetch failed", err.message);
            setError("메시지를 불러오지 못했습니다.");
        } finally {
            setLoadingMessages(false);
        }
    }, [me]);

    const markAsRead = useCallback(async (partner) => {
        if (!partner) return;
        try {
            await axios.post(`/chat/conversations/${encodeURIComponent(partner)}/read`, null, { headers: authHeaders() });
        } catch {
            // Best-effort; ignore errors
        }
    }, []);

    useEffect(() => {
        fetchFollowings("");
        fetchConversations();
    }, [fetchConversations, fetchFollowings]);

    useEffect(() => {
        const handle = setTimeout(() => {
            fetchFollowings(search);
        }, 200);
        return () => clearTimeout(handle);
    }, [search, fetchFollowings]);

    useEffect(() => {
        if (!selectedPartner) return;
        fetchMessages(selectedPartner, 0);
        markAsRead(selectedPartner);
        setConversations((prev) => prev.map((c) => (c.partner === selectedPartner ? { ...c, unreadCount: 0 } : c)));
    }, [selectedPartner, fetchMessages, markAsRead]);

    const appendUniqueMessage = useCallback((partner, message) => {
        if (!partner || !message) return;
        setMessagesByPartner((prev) => {
            const list = prev[partner] || [];
            const exists = message.id && list.some((m) => m.id === message.id);
            if (exists) return prev;
            const next = [...list, message];
            next.sort((a, b) => {
                const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return at - bt;
            });
            return { ...prev, [partner]: next };
        });
    }, []);

    const loadMore = async () => {
        if (!selectedPartner) return;
        const nextPage = (pageByPartner[selectedPartner] || 0) + 1;
        await fetchMessages(selectedPartner, nextPage);
    };

    const scrollToBottom = () => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    };

    useEffect(() => {
        scrollToBottom();
    }, [currentMessages]);

    const handleSend = async (e) => {
        e.preventDefault();
        const msg = draft.trim();
        if (!msg || !selectedPartner) return;
        if (!canSendToSelected) {
            setError("상대방을 팔로우한 후 메시지를 보낼 수 있습니다.");
            return;
        }
        setSending(true);
        setError("");
        try {
            const { data } = await axios.post(
                `/chat/conversations/${encodeURIComponent(selectedPartner)}/messages`,
                { content: msg },
                { headers: authHeaders() }
            );
            const saved = normalizeMessage(data || { content: msg, createdAt: new Date().toISOString() }, me);
            appendUniqueMessage(selectedPartner, saved);
            setConversations((prev) => {
                const next = prev.filter((c) => c.partner !== selectedPartner);
                const latest = {
                    partner: selectedPartner,
                    nickname: prev.find((c) => c.partner === selectedPartner)?.nickname || "",
                    latestMessage: saved.text,
                    latestAt: saved.createdAt,
                    unreadCount: 0,
                };
                return [latest, ...next];
            });
            setDraft("");
            scrollToBottom();
        } catch (err) {
            console.warn("[chat] send failed", err.message);
            setError("메시지 전송에 실패했습니다.");
        } finally {
            setSending(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        const urlBase = (API_BASE || "").replace(/\/$/, "");
        const streamUrl = `${urlBase}/chat/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`;
        let es;
        try {
            es = new EventSource(streamUrl, { withCredentials: true });
            es.onmessage = (evt) => {
                try {
                    const payload = JSON.parse(evt.data || "{}");
                    const partner = payload.partner || payload.from || payload.sender;
                    const message = payload.message || payload;
                    if (!partner || !message) return;
                    const normalized = normalizeMessage(message, me);

                    // Skip duplicates and ignore echo of my own send (client already added)
                    if (!normalized.id || !normalized.fromMe) {
                        appendUniqueMessage(partner, normalized);
                    } else {
                        setMessagesByPartner((prev) => {
                            const list = prev[partner] || [];
                            const exists = list.some((m) => m.id === normalized.id);
                            return exists ? prev : { ...prev, [partner]: [...list, normalized] };
                        });
                    }

                    setConversations((prev) => {
                        const others = prev.filter((c) => c.partner !== partner);
                        const existing = prev.find((c) => c.partner === partner);
                        const unread = partner === selectedPartner ? 0 : (existing?.unreadCount || 0) + 1;
                        const latest = {
                            partner,
                            nickname: existing?.nickname || "",
                            latestMessage: normalized.text,
                            latestAt: normalized.createdAt,
                            unreadCount: unread,
                        };
                        return [latest, ...others];
                    });

                    if (partner === selectedPartner) {
                        markAsRead(partner);
                    }
                } catch (err) {
                    console.warn("[chat] SSE parse failed", err.message);
                }
            };
            es.onerror = () => {
                es.close();
            };
        } catch (err) {
            console.warn("[chat] SSE init failed", err.message);
        }
        return () => {
            if (es) es.close();
        };
    }, [me, selectedPartner, markAsRead]);

    const statusText = useMemo(() => {
        if (error) return error;
        if (sending) return "전송 중...";
        if (loadingMessages) return "불러오는 중...";
        return "";
    }, [error, loadingMessages, sending]);

    const ensureConversationSlot = useCallback((partner) => {
        if (!partner) return;
        setConversations((prev) => {
            const exists = prev.some((c) => c.partner === partner);
            if (exists) return prev;
            const placeholder = {
                partner,
                nickname: partnerMap.get(partner)?.nickname || "",
                latestMessage: "",
                latestAt: null,
                unreadCount: 0,
            };
            return [placeholder, ...prev];
        });
    }, [partnerMap]);

    const handleSelectPartner = useCallback((partner) => {
        setSelectedPartner(partner);
        ensureConversationSlot(partner);
        setConversations((prev) => prev.map((c) => c.partner === partner ? { ...c, unreadCount: 0 } : c));
        markAsRead(partner);
    }, [ensureConversationSlot, markAsRead]);

    useEffect(() => {
        if (selectedPartner) {
            ensureConversationSlot(selectedPartner);
        }
    }, [selectedPartner, ensureConversationSlot]);

    return (
        <div className="chat-page">
            <div className="chat-header">
                <h2>채팅</h2>
                <input
                    className="chat-search"
                    type="text"
                    placeholder="팔로우한 사람 검색"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="chat-body">
                <aside className="chat-list">
                    <div className="chat-follow-list">
                        {followLoading && <div className="pill-info">불러오는 중...</div>}
                        {!followLoading && filteredFollowings.length === 0 && (
                            <div className="pill-info">팔로우한 사람이 없습니다.</div>
                        )}
                        {filteredFollowings.map((p) => (
                            <button
                                type="button"
                                key={p.username}
                                className="follow-pill"
                                onClick={() => handleSelectPartner(p.username)}
                                aria-label={`${p.nickname || p.username}와 대화 열기`}
                            >
                                {partnerDisplay(p.username, p.nickname).display}
                            </button>
                        ))}
                    </div>

                    <div className="chat-conversations">
                        {loadingConversations && <div className="empty">채팅 목록을 불러오는 중...</div>}
                        {!loadingConversations && sortedConversations.length === 0 && (
                            <div className="empty">대화를 시작해보세요.</div>
                        )}
                        {!loadingConversations &&
                            sortedConversations.map((conv) => {
                                const info = partnerDisplay(conv.partner, conv.nickname);
                                const isActive = selectedPartner === conv.partner;
                                return (
                                    <button
                                        key={conv.partner}
                                        className={`chat-conv-item ${isActive ? "active" : ""}`}
                                        onClick={() => handleSelectPartner(conv.partner)}
                                    >
                                        <div className="conv-top">
                                            <div className="conv-name">{info.nickname || info.display}</div>
                                            <div className="conv-time">{formatTime(conv.latestAt)}</div>
                                        </div>
                                        <div className="conv-bottom">
                                            <div className="conv-latest">{conv.latestMessage || "메시지가 없습니다."}</div>
                                            {conv.unreadCount > 0 && <span className="conv-unread">{conv.unreadCount}</span>}
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                </aside>

                <section className="chat-panel">
                    {selectedPartner ? (
                        <>
                            <button
                                type="button"
                                className="chat-panel-header"
                                onClick={() => nav(`/profile/${encodeURIComponent(selectedPartner)}`)}
                                aria-label="프로필로 이동"
                            >
                                {(() => {
                                    const info = partnerDisplay(selectedPartner, selectedConversation?.nickname);
                                    const nicknameLine = info.nickname || info.username;
                                    return (
                                        <div className="chat-profile">
                                            <div className="chat-avatar">{info.avatar}</div>
                                            <div className="chat-meta">
                                                <div className="chat-nickname">{nicknameLine}</div>
                                                <div className="chat-username">@{info.username}</div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </button>

                            <div className="chat-messages" ref={scrollRef} onScroll={(e) => {
                                const node = e.currentTarget;
                                if (node.scrollTop < 32 && hasMoreByPartner[selectedPartner] && !loadingMessages) {
                                    loadMore();
                                }
                            }}>
                                {hasMoreByPartner[selectedPartner] && (
                                    <button className="load-more" onClick={loadMore} disabled={loadingMessages}>
                                        이전 메시지 불러오기
                                    </button>
                                )}
                                {currentMessages.length === 0 && (
                                    <div className="empty">아직 메시지가 없습니다.</div>
                                )}
                                {currentMessages.map((m) => (
                                    <div key={m.id} className={`chat-message ${m.fromMe ? "me" : "them"}`}>
                                        <div className="bubble">{m.text}</div>
                                        <span className="time">{formatTime(m.createdAt)}</span>
                                    </div>
                                ))}
                            </div>

                            {statusText && <div className="chat-status">{statusText}</div>}

                            <form
                                className={`chat-input-row ${!canSendToSelected ? "disabled" : ""}`}
                                onSubmit={handleSend}
                            >
                                <input
                                    type="text"
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    placeholder={canSendToSelected ? "메시지 보내기" : "팔로우해야 메시지를 보낼 수 있습니다."}
                                    disabled={sending || !canSendToSelected}
                                />
                                <button type="submit" disabled={sending || !draft.trim() || !canSendToSelected}>
                                    {sending ? "전송 중" : "전송"}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="chat-empty">대화를 선택하세요.</div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default ChatPage;
