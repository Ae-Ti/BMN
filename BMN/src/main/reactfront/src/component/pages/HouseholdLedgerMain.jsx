import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./HouseholdMain.css"; // CSS 추가

const HouseholdLedgerMain = () => {
  const [date, setDate] = useState(new Date());

  // 연도 및 월 변경 핸들러
  const handleYearChange = (event) => {
    const newYear = parseInt(event.target.value);
    setDate(new Date(newYear, date.getMonth(), 1));
  };

  const handleMonthChange = (event) => {
    const newMonth = parseInt(event.target.value);
    setDate(new Date(date.getFullYear(), newMonth, 1));
  };

  return (
    <div className="household-ledger-container">
      {/* 연도와 월 선택 드롭다운 */}
      

      {/* 달력 */}
      <Calendar
        onChange={setDate}
        value={date}
        locale="en-US"
        className="custom-calendar"
        tileClassName={({ date, view }) => {
          if (view === "month") {
            const day = date.getDay();
            if (day === 6) return "saturday"; // 토요일
            if (day === 0) return "sunday"; // 일요일
            if (date.getMonth() !== new Date().getMonth()) return "dimmed"; // 이번달이 아닌 날짜
          }
        }}
      />
    </div>
  );
};

export default HouseholdLedgerMain;
