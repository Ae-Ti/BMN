import React, { useEffect, useState } from "react";
import axios from "axios";

axios.defaults.baseURL = "http://localhost:8080";

// --- Base64URL 디코더 (JWT payload 디코딩용)
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

// --- JWT에서 로그인 사용자 정보 가져오기
function getCurrentUserFromToken() {
    const token = localStorage.getItem("token");
    if (!token) return { userId: null, userName: null };

    const parts = token.split(".");
    if (parts.length < 2) return { userId: null, userName: null };

    try {
        const payload = JSON.parse(b64urlDecode(parts[1]) || "{}");
        return {
            userId:
                payload.userId ??
                payload.id ??
                payload.uid ??
                payload.user_id ??
                null,
            userName:
                payload.userName ??
                payload.username ??
                payload.sub ??
                null,
        };
    } catch {
        return { userId: null, userName: null };
    }
}

// --- 평균 별점 계산 유틸
function calcAvgFrom(list) {
    if (!Array.isArray(list) || list.length === 0) return null;
    const vals = list.map(v => Number(v?.rating || 0)).filter(n => Number.isFinite(n) && n > 0);
    if (vals.length === 0) return null;
    return +(vals.reduce((a,b)=>a+b,0) / vals.length).toFixed(1);
}

export default function RecipeComments({ recipeId, onAvgChange }) {
    const [comments, setComments] = useState([]);
    const [newContent, setNewContent] = useState("");
    const [newRating, setNewRating] = useState(5);
    const [editingId, setEditingId] = useState(null);
    const [editingContent, setEditingContent] = useState("");
    const [editingRating, setEditingRating] = useState(5);
    const [loading, setLoading] = useState(true);

    const { userId, userName } = getCurrentUserFromToken();
    const myIdStr = userId != null ? String(userId) : null;
    const token = localStorage.getItem("token");

    // 평균 갱신 콜백 호출
    const notifyAvg = (list) => {
        if (typeof onAvgChange === "function") {
            onAvgChange(calcAvgFrom(list));
        }
    };

    // ✅ 댓글 목록 불러오기
    useEffect(() => {
        if (!recipeId) return;
        setLoading(true);
        axios
            .get(`/recipe/api/${recipeId}/comments`)
            .then((res) => {
                const data = res.data || [];
                setComments(data);
                notifyAvg(data);
            })
            .catch((err) => console.error("댓글 불러오기 실패:", err))
            .finally(() => setLoading(false));
    }, [recipeId]);

    // ✅ 댓글 작성
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) return alert("로그인 후 댓글을 작성할 수 있습니다.");
        if (!newContent.trim()) return;

        try {
            const res = await axios.post(
                `/recipe/api/${recipeId}/comments`,
                { content: newContent, rating: newRating },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setComments((prev) => {
                const next = [...prev, res.data];
                notifyAvg(next);
                return next;
            });
            setNewContent("");
            setNewRating(5);
        } catch (err) {
            console.error("댓글 작성 실패:", err);
            alert("댓글 작성 중 오류가 발생했습니다.");
        }
    };

    // ✅ 댓글 수정
    const handleUpdate = async (id) => {
        try {
            const res = await axios.put(
                `/recipe/api/comments/${id}`,
                { content: editingContent, rating: editingRating },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setComments((prev) => {
                const next = prev.map((c) => (c.id === id ? res.data : c));
                notifyAvg(next);
                return next;
            });
            setEditingId(null);
        } catch (err) {
            console.error("댓글 수정 실패:", err);
            alert("댓글 수정 중 오류가 발생했습니다.");
        }
    };

    // ✅ 댓글 삭제
    const handleDelete = async (id) => {
        if (!window.confirm("정말 삭제하시겠습니까?")) return;
        try {
            await axios.delete(`/recipe/api/comments/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setComments((prev) => {
                const next = prev.filter((c) => c.id !== id);
                notifyAvg(next);
                return next;
            });
        } catch (err) {
            console.error("댓글 삭제 실패:", err);
            alert("댓글 삭제 중 오류가 발생했습니다.");
        }
    };

    if (loading) return <p>댓글 불러오는 중...</p>;

    return (
        <div style={{ marginTop: 24 }}>
            <h3>댓글</h3>

            {/* ✅ 작성 폼 */}
            <form
                onSubmit={handleSubmit}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginBottom: 20,
                }}
            >
                <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="댓글을 입력하세요"
                    rows={3}
                    style={{ width: "100%", padding: 8, borderRadius: 6 }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label>별점:</label>
                    <select
                        value={newRating}
                        onChange={(e) => setNewRating(parseInt(e.target.value))}
                    >
                        {[1, 2, 3, 4, 5].map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        style={{
                            background: "#007bff",
                            color: "white",
                            padding: "6px 12px",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                        }}
                    >
                        등록
                    </button>
                </div>
            </form>

            {/* ✅ 댓글 목록 */}
            {comments.length === 0 && <p>아직 댓글이 없습니다.</p>}
            <ul style={{ listStyle: "none", padding: 0 }}>
                {comments.map((c) => {
                    const isMine =
                        (c.authorId != null &&
                            myIdStr != null &&
                            String(c.authorId) === myIdStr) ||
                        (!!userName &&
                            !!c.authorUserName &&
                            c.authorUserName === userName);

                    return (
                        <li
                            key={c.id}
                            style={{
                                border: "1px solid #ddd",
                                borderRadius: 8,
                                padding: 12,
                                marginBottom: 12,
                            }}
                        >
                            {editingId === c.id ? (
                                <>
                                    <textarea
                                        value={editingContent}
                                        onChange={(e) => setEditingContent(e.target.value)}
                                        rows={3}
                                        style={{ width: "100%", padding: 6 }}
                                    />
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            marginTop: 6,
                                        }}
                                    >
                                        <label>별점:</label>
                                        <select
                                            value={editingRating}
                                            onChange={(e) =>
                                                setEditingRating(parseInt(e.target.value))
                                            }
                                        >
                                            {[1, 2, 3, 4, 5].map((r) => (
                                                <option key={r} value={r}>
                                                    {r}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleUpdate(c.id)}
                                            style={{
                                                background: "#28a745",
                                                color: "white",
                                                padding: "4px 10px",
                                                border: "none",
                                                borderRadius: 6,
                                            }}
                                        >
                                            저장
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            style={{
                                                background: "#ccc",
                                                padding: "4px 10px",
                                                border: "none",
                                                borderRadius: 6,
                                            }}
                                        >
                                            취소
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <strong>
                                            {c.authorDisplayName ?? c.authorUserName ?? "익명"}
                                        </strong>
                                        <span style={{ color: "#999", fontSize: 13 }}>
                                            {c.createdAt
                                                ? new Date(c.createdAt).toLocaleString()
                                                : ""}
                                        </span>
                                    </div>
                                    <div style={{ margin: "6px 0" }}>⭐ {c.rating}/5</div>
                                    <div style={{ whiteSpace: "pre-wrap" }}>{c.content}</div>

                                    {isMine && (
                                        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                                            <button
                                                onClick={() => {
                                                    setEditingId(c.id);
                                                    setEditingContent(c.content);
                                                    setEditingRating(c.rating);
                                                }}
                                                style={{
                                                    background: "#4caf50",
                                                    color: "white",
                                                    padding: "4px 10px",
                                                    border: "none",
                                                    borderRadius: 6,
                                                }}
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={() => handleDelete(c.id)}
                                                style={{
                                                    background: "#f44336",
                                                    color: "white",
                                                    padding: "4px 10px",
                                                    border: "none",
                                                    borderRadius: 6,
                                                }}
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}