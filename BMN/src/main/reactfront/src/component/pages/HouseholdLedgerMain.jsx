// HouseholdLedgerMain.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

/** ✅ 로컬 타임존(KST) 기준으로 YYYY-MM-DD 생성 */
const toLocalISO = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

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

    const [dayTransactions, setDayTransactions] = useState([]);
    const [monthData, setMonthData] = useState(null);

    const [type, setType] = useState("income");
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");

    const [editingId, setEditingId] = useState(null);
    const [editType, setEditType] = useState("income");
    const [editName, setEditName] = useState("");
    const [editAmount, setEditAmount] = useState("");

    const tileTotals = useMemo(() => {
        const map = new Map();
        if (monthData?.days) for (const d of monthData.days) map.set(d.date, d);
        return map;
    }, [monthData]);

    // responsive calendar font sizing: we write a CSS variable on the calendar container
    // so CSS can use it for smooth scaling. This uses ResizeObserver to update the
    // variable based on the container's current size.
    const calendarRef = useRef(null);
    useEffect(() => {
        const el = calendarRef.current;
        if (!el) return;
        // parameters for linear mapping
        const minBasis = 240; // px -> minimum basis for scaling
        const maxBasis = 900; // px -> maximum basis for scaling
        const minFont = 12; // px
        const maxFont = 18; // px

        let raf = 0;
        const compute = () => {
            const rect = el.getBoundingClientRect();
            const basis = Math.min(rect.width, rect.height);
            let t = (basis - minBasis) / (maxBasis - minBasis);
            t = Math.max(0, Math.min(1, t));
            const font = minFont + t * (maxFont - minFont);
            // set both the CSS variable and an inline font-size with important priority
            // to ensure JS-driven sizing wins over any remaining stylesheet rules
            el.style.setProperty("--calendar-font-size", `${font}px`);
            try {
                el.style.setProperty('font-size', `${font}px`, 'important');
            } catch (e) {
                // some older browsers may not accept the priority param; fall back to plain set
                el.style.fontSize = `${font}px`;
            }
            // Also set the font-size directly on the generated .react-calendar element
            // so that rules like `.react-calendar { font-size: 18px; }` do not override.
            const inner = el.querySelector('.react-calendar');
            if (inner) {
                try {
                    inner.style.setProperty('--calendar-font-size', `${font}px`);
                    inner.style.setProperty('font-size', `${font}px`, 'important');
                } catch (e) {
                    inner.style.fontSize = `${font}px`;
                }
            }
        };

        // initial
        compute();

        // ResizeObserver with rAF to avoid layout thrash
        const ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(() => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(compute);
        }) : null;
        if (ro) ro.observe(el);
        window.addEventListener('resize', compute);

        return () => {
            if (ro) ro.disconnect();
            window.removeEventListener('resize', compute);
            cancelAnimationFrame(raf);
        };
    }, []);

    // Mark which weekday column corresponds to Sunday/Saturday and add classes
    // so CSS can color them correctly regardless of week-start ordering.
    useEffect(() => {
        const el = calendarRef.current;
        if (!el) return;

        const markWeekendCols = () => {
            try {
                const headerAbbrs = Array.from(el.querySelectorAll('.react-calendar__month-view__weekdays__weekday abbr'));
                let sunIdx = -1, satIdx = -1;
                headerAbbrs.forEach((abbr, i) => {
                    const t = (abbr.title || abbr.textContent || '').trim().toLowerCase();
                    if (t.startsWith('일') || t.startsWith('sun')) sunIdx = i;
                    if (t.startsWith('토') || t.startsWith('sat')) satIdx = i;
                });

                // Apply classes to weekday headers
                headerAbbrs.forEach((abbr, i) => {
                    const parent = abbr.closest('.react-calendar__month-view__weekdays__weekday');
                    if (!parent) return;
                    parent.classList.remove('weekday-sun', 'weekday-sat');
                    if (i === sunIdx) parent.classList.add('weekday-sun');
                    if (i === satIdx) parent.classList.add('weekday-sat');
                });

                // Apply classes to day cells according to their column index
                const dayCells = Array.from(el.querySelectorAll('.react-calendar__month-view__days > *'));
                dayCells.forEach((cell, i) => {
                    cell.classList.remove('weekday-sun', 'weekday-sat');
                    const col = i % 7;
                    if (col === sunIdx) cell.classList.add('weekday-sun');
                    if (col === satIdx) cell.classList.add('weekday-sat');
                });
            } catch (e) {
                // non-fatal
                // console.debug('markWeekendCols failed', e);
            }
        };

        markWeekendCols();
        const mo = new MutationObserver(() => markWeekendCols());
        mo.observe(el, { childList: true, subtree: true });
        window.addEventListener('resize', markWeekendCols);
        return () => {
            mo.disconnect();
            window.removeEventListener('resize', markWeekendCols);
        };
    }, [selectedDate]);

    const handleDateClick = (date) => setSelectedDate(date);

    const fetchMonthTotals = async (dateObj) => {
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        const { data } = await api.get("/ledger/calendar", { params: { year, month } });
        setMonthData(data);
    };

    const fetchDayList = async (dateObj) => {
        const { data } = await api.get("/ledger/transactions", { params: { date: toLocalISO(dateObj) } }); // ✅ 변경
        setDayTransactions(data);
    };

    const refreshBoth = async () => {
        const dateStr = toLocalISO(selectedDate); // ✅ 변경
        const [dayRes, monthRes] = await Promise.all([
            api.get("/ledger/transactions", { params: { date: dateStr } }),
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
            date: toLocalISO(selectedDate), // ✅ 변경
            type: type.toUpperCase(),
            name,
            amount: Number(amount),
        });
        setName("");
        setAmount("");
        await refreshBoth();
    };

    const startEdit = (t) => {
        setEditingId(t.id);
        setEditType(t.type === "INCOME" ? "income" : "expense");
        setEditName(t.name);
        setEditAmount(String(t.amount));
    };

    const saveEdit = async () => {
        if (!editingId) return;
        await api.patch(`/ledger/transactions/${editingId}`, {
            type: editType.toUpperCase(),
            name: editName,
            amount: Number(editAmount),
            // 날짜를 바꾸려면 아래 사용 (로컬 기준 날짜로!)
            // date: toLocalISO(selectedDate),
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

    const deleteTx = async (id) => {
        if (!window.confirm("삭제할까요?")) return;
        await api.delete(`/ledger/transactions/${id}`);
        await refreshBoth();
    };

    useEffect(() => {
        if (!authed) return;
        (async () => {
            await fetchMonthTotals(selectedDate);
            await fetchDayList(selectedDate); // ✅ 로컬 날짜로 조회
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authed]);

    useEffect(() => {
        if (!authed) return;
        (async () => {
            await fetchDayList(selectedDate);   // ✅ 로컬 날짜로 조회
            await fetchMonthTotals(selectedDate);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate]);

    if (!authed) {
        return (
            <div className="ledger-container sx-16" >
                <h3>로그인이 필요합니다</h3>
                <LoginBox onLoggedIn={() => setAuthed(true)} />
            </div>
        );
    }

    return (
        <div className="ledger-container">
            <div className="ledger-top-row">
            {/* 왼쪽 달력 */}
            <div className="calendar-container" ref={calendarRef}>
                <Calendar
                    onClickDay={handleDateClick}
                    value={selectedDate}
                    locale="ko-KR"
                    onActiveStartDateChange={({ activeStartDate }) => fetchMonthTotals(activeStartDate)}
                    tileContent={({ date }) => {
                    const d = tileTotals.get(toLocalISO(date)); // ✅ 변경
                    if (!d) return null;
                    const income = Number(d.totalIncome ?? 0);
                    const expense = Number(d.totalExpense ?? 0);
                    const net = income - expense;
                    return (
                        <div className="calendar-tile calendar-net">
                            {net > 0 ? (
                                <div className="income">+{net.toLocaleString()}</div>
                            ) : net < 0 ? (
                                <div className="expense">-{Math.abs(net).toLocaleString()}</div>
                            ) : (
                                <div className="neutral">0</div>
                            )}
                        </div>
                    );
                    }}
                />
                </div>

            {/* 오른쪽 상세내역 및 요약 */}
            <div className="details-section">
                {/* 상세내역 입력/목록 */}
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
                    <div className="transaction-list-header">
                        <span className="col type" aria-hidden="true"></span>
                        <span className="col name">항목명</span>
                        <span className="col amount">금액</span>
                        <span className="col actions" aria-hidden="true"></span>
                    </div>

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
                            return (
                                <li key={t.id} className="edit row">
                                    <select value={editType} onChange={(e) => setEditType(e.target.value)}>
                                        <option value="income">수입</option>
                                        <option value="expense">지출</option>
                                    </select>
                                    <input className="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                                    <input className="edit-amount" type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                                    <div className="actions">
                                        <button onClick={saveEdit}>저장</button>
                                        <button onClick={cancelEdit}>취소</button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* 월별 요약은 상세 섹션 외부에 렌더링합니다 (DOM에서 분리) */}
                </div>
                </div>
            {/* 월별 요약: details-section 외부에 렌더링하여 카드 높이에 영향을 주지 않음 */}
            {monthData && (
                <div className="summary-card">
                    <div>
                        <span>총 수입:</span>
                        <span>{Number(monthData.totalIncome ?? 0).toLocaleString()}원</span>
                    </div>
                    <div>
                        <span>총 지출:</span>
                        <span>{Number(monthData.totalExpense ?? 0).toLocaleString()}원</span>
                    </div>
                    <hr />
                    <div>
                        <span>손익:</span>
                        <span>{Number((monthData.totalIncome ?? 0) - (monthData.totalExpense ?? 0)).toLocaleString()}원</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HouseholdLedgerMain;
