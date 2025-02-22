import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./HouseholdMain.css"; // CSS 추가

const HouseholdLedgerMain = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState({});
  const [type, setType] = useState("income");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleAddTransaction = () => {
    if (!name || !amount) return;
    const dateKey = selectedDate.toDateString();
    const newTransaction = { type, name, amount: parseFloat(amount) };
    
    setTransactions((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), newTransaction],
    }));
    
    setName("");
    setAmount("");
  };

  return (
    <div className="ledger-container">
      {/* 왼쪽 달력 */}
      <div className="calendar-container">
        <Calendar
          onClickDay={handleDateClick}
          value={selectedDate}
          locale="en-US"
          tileContent={({ date }) => {
            
            const dateKey = date.toDateString();
            const dailyTransactions = transactions[dateKey] || [];
            const totalIncome = dailyTransactions
              .filter((t) => t.type === "income")
              .reduce((sum, t) => sum + t.amount, 0);
            const totalExpense = dailyTransactions
              .filter((t) => t.type === "expense")
              .reduce((sum, t) => sum + t.amount, 0);
            return (
              <div className="calendar-tile">
                {totalIncome > 0 && <div className="income">+{totalIncome}</div>}
                {totalExpense > 0 && <div className="expense">-{totalExpense}</div>}
              </div>
            );
          }}
          
        />
      </div>
      
      {/* 오른쪽 상세내역 입력 */}
      <div className="details-container">
        <h2>{selectedDate.toDateString()}</h2>
        <div className="input-group">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="income">수입</option>
            <option value="expense">지출</option>
          </select>
          <input
            type="text"
            placeholder="항목명"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="number"
            placeholder="금액"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button onClick={handleAddTransaction}>추가</button>
        </div>
        
        <ul className="transaction-list">
          {(transactions[selectedDate.toDateString()] || []).map((t, index) => (
            <li key={index} className={t.type === "income" ? "income" : "expense"}>
              {t.name}: {t.type === "income" ? "+" : "-"}{t.amount}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default HouseholdLedgerMain;