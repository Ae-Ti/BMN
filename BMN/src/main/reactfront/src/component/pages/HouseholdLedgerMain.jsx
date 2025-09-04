// HouseholdLedgerMain.jsx
import React, { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./HouseholdMain.css";

import axios from "axios";
const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

const toISO = (dateObj) => dateObj.toISOString().slice(0, 10); // YYYY-MM-DD

function LoginBox({ onLoggedIn }) {
    const [username, setUsername] = useState("user");
    const [password, setPassword] = useState("password");
    const [msg, setMsg] = useState("");

    const doLogin = async () => {
        try {
            const { data } = await api.post("/auth/login", { username, password });
            localStorage.setItem("token", data.token);
            setMsg("로그인 성공");
            onLoggedIn?.();
        } catch (e) {
            setMsg("로그인 실패");
        }
    };

    return (
        <div className="login-box">
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
            <button onClick={doLogin}>로그인</button>
            <span className="login-msg">{msg}</span>
        </div>
    );
}

const HouseholdLedgerMain = () => {
    const [authed, setAuthed] = useState(!!localStorage.getItem("token"));
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [dayTransactions, setDayTransactions] = useState([]); // [{id,date,type,name,amount}]
    const [monthData, setMonthData] = useState(null); // {year,month,days:[{date,totalIncome,totalExpense}]}

    const [type, setType] = useState("income"); // 입력폼(소문자) → 서버 전송 시 대문자
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");

    // 수정 상태
    const [editingId, setEditingId] = useState(null);
    const [editType, setEditType] = useState("income");
    const [editName, setEditName] = useState("");
    const [editAmount, setEditAmount] = useState("");

    const tileTotals = useMemo(() => {
        const map = new Map();
        if (monthData?.days) for (const d of monthData.days) map.set(d.date, d);
        return map;
    }, [monthData]);

    const handleDateClick = (date) => setSelectedDate(date);

    const fetchMonthTotals = async (dateObj) => {
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        const { data } = await api.get("/ledger/calendar", { params: { year, month } });
        setMonthData(data);
    };

    const fetchDayList = async (dateObj) => {
        const { data } = await api.get("/ledger/transactions", { params: { date: toISO(dateObj) } });
        setDayTransactions(data);
    };

    const refreshBoth = async () => {
        const [dayRes, monthRes] = await Promise.all([
            api.get("/ledger/transactions", { params: { date: toISO(selectedDate) } }),
            api.get("/ledger/calendar", {
                params: { year: selectedDate.getFullYear(), month: selectedDate.getMonth() + 1 },
            }),
        ]);
        setDayTransactions(dayRes.data);
        setMonthData(monthRes.data);
    };

    const handleAddTransaction = async () => {
        if (!name || !amount) return;
        await api.post("/ledger/transactions", {
            date: toISO(selectedDate),
            type: type.toUpperCase(), // INCOME | EXPENSE
            name,
            amount: Number(amount),
        });
        setName("");
        setAmount("");
        await refreshBoth();
    };

    // 편집 시작
    const startEdit = (t) => {
        setEditingId(t.id);
        setEditType(t.type === "INCOME" ? "income" : "expense"); // UI는 소문자 유지
        setEditName(t.name);
        setEditAmount(String(t.amount));
    };

    // 편집 저장 (PATCH)
    const saveEdit = async () => {
        if (!editingId) return;
        await api.patch(`/ledger/transactions/${editingId}`, {
            type: editType.toUpperCase(),
            name: editName,
            amount: Number(editAmount),
            // date를 바꾸고 싶다면 아래 주석 해제
            // date: toISO(selectedDate),
        });
        setEditingId(null);
        await refreshBoth();
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditType("income");
        setEditName("");
        setEditAmount("");
    };

    // 삭제
    const deleteTx = async (id) => {
        if (!window.confirm("삭제할까요?")) return;
        await api.delete(`/ledger/transactions/${id}`);
        await refreshBoth();
    };

    useEffect(() => {
        if (!authed) return;
        (async () => {
            await fetchMonthTotals(selectedDate);
            await fetchDayList(selectedDate);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authed]);

    useEffect(() => {
        if (!authed) return;
        (async () => {
            await fetchDayList(selectedDate);
            await fetchMonthTotals(selectedDate);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate]);

    if (!authed) {
        return (
            <div className="ledger-container" style={{ padding: 16 }}>
                <h3>로그인이 필요합니다</h3>
                <LoginBox onLoggedIn={() => setAuthed(true)} />
            </div>
        );
    }

    return (
        <div className="ledger-container">
            {/* 왼쪽 달력 */}
            <div className="calendar-container">
                <Calendar
                    onClickDay={handleDateClick}
                    value={selectedDate}
                    locale="ko-KR"
                    tileContent={({ date }) => {
                        const d = tileTotals.get(toISO(date));
                        if (!d) return null;
                        return (
                            <div className="calendar-tile">
                                {d.totalIncome > 0 && <div className="income">+{Number(d.totalIncome).toLocaleString()}</div>}
                                {d.totalExpense > 0 && <div className="expense">-{Number(d.totalExpense).toLocaleString()}</div>}
                            </div>
                        );
                    }}
                />
            </div>

            {/* 오른쪽 상세내역 입력/목록 */}
            <div className="details-container">
                <h2>{selectedDate.toDateString()}</h2>

                {/* 입력 행 */}
                <div className="input-group">
                    <select value={type} onChange={(e) => setType(e.target.value)}>
                        <option value="income">수입</option>
                        <option value="expense">지출</option>
                    </select>
                    <input type="text" placeholder="항목명" value={name} onChange={(e) => setName(e.target.value)} />
                    <input type="number" placeholder="금액" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    <button onClick={handleAddTransaction}>추가</button>
                </div>

                {/* 목록 */}
                <ul className="transaction-list">
                    {dayTransactions.length === 0 && <li className="empty">내역이 없습니다</li>}
                    {dayTransactions.map((t) => {
                        const isEditing = editingId === t.id;
                        if (!isEditing) {
                            return (
                                <li key={t.id} className={t.type === "INCOME" ? "income row" : "expense row"}>
                                    <span className="name">{t.name}</span>
                                    <span className="amount">
                    {t.type === "INCOME" ? "+" : "-"}
                                        {Number(t.amount).toLocaleString()}
                  </span>
                                    <div className="actions">
                                        <button onClick={() => startEdit(t)}>수정</button>
                                        <button className="danger" onClick={() => deleteTx(t.id)}>삭제</button>
                                    </div>
                                </li>
                            );
                        }
                        // 편집 모드
                        return (
                            <li key={t.id} className="edit row">
                                <select value={editType} onChange={(e) => setEditType(e.target.value)}>
                                    <option value="income">수입</option>
                                    <option value="expense">지출</option>
                                </select>
                                <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                                <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                                <div className="actions">
                                    <button onClick={saveEdit}>저장</button>
                                    <button onClick={cancelEdit}>취소</button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

export default HouseholdLedgerMain;