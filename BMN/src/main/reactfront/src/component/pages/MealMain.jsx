import React, { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./MealMain.css";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// ✅ 토큰 자동 헤더 추가
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ✅ 날짜를 YYYY-MM-DD 포맷으로 변환
const toLocalISO = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// ✅ 안전한 플레이스홀더 (SVG)
const PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90'>
      <rect width='100%' height='100%' fill='#f3f4f6'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-size='12'>No Image</text>
    </svg>`
    );

// ✅ 슬롯 정렬용
const SLOT_ORDER = ["아침", "점심", "저녁", "간식"];
const slotIndex = (s) => {
  const i = SLOT_ORDER.indexOf(s ?? "");
  return i === -1 ? 999 : i;
};

export default function MealMain() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthList, setMonthList] = useState([]);
  const [dayMeals, setDayMeals] = useState([]);

  // ✅ 달력 타일 데이터 매핑
  const tileMap = useMemo(() => {
    const m = new Map();
    monthList.forEach((mp) => {
      const key =
          mp.planDate?.length === 10 ? mp.planDate : mp.planDate?.substring(0, 10);
      if (!key) return;
      const arr = m.get(key) || [];
      arr.push(mp);
      m.set(key, arr);
    });
    return m;
  }, [monthList]);

  // ✅ 월 단위 데이터 가져오기
  const fetchRange = async (dateObj) => {
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth() + 1;
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const endDate = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, "0")}-${String(endDate).padStart(
        2,
        "0"
    )}`;
    const { data } = await api.get("/mealplan", { params: { start, end } });
    setMonthList(Array.isArray(data) ? data : []);
  };

  // ✅ 선택된 날짜의 식단 가져오기
  const fetchDay = async (dateObj) => {
    const { data } = await api.get("/mealplan/day", {
      params: { date: toLocalISO(dateObj) },
    });
    const list = Array.isArray(data) ? data : [];
    list.sort((a, b) => slotIndex(a.title) - slotIndex(b.title));
    setDayMeals(list);
  };

  // ✅ 초기 로드
  useEffect(() => {
    (async () => {
      await fetchRange(selectedDate);
      await fetchDay(selectedDate);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 날짜 클릭 시 상세만 갱신
  useEffect(() => {
    fetchDay(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // ✅ 달력 월 변경 시
  const onActiveStartDateChange = ({ activeStartDate, view }) => {
    if (view === "month") fetchRange(activeStartDate);
  };

  // ✅ 이미지 경로 결정
  const imgSrcOf = (mp) => {
    if (mp.thumbnailUrl) return mp.thumbnailUrl;
    if (mp.recipeId) return `/recipe/thumbnail/${mp.recipeId}`;
    return PLACEHOLDER;
  };

  return (
      <div className="meal-container">
        {/* 📅 달력 */}
        <div className="calendar-container">
          <Calendar
              onClickDay={setSelectedDate}
              onActiveStartDateChange={onActiveStartDateChange}
              value={selectedDate}
              locale="ko-KR"
              tileContent={({ date }) => {
                const arr = tileMap.get(toLocalISO(date));
                if (!arr || arr.length === 0) return null;
                const names = arr
                    .map((x) =>
                        (x.quantity ?? 1) > 1
                            ? `${x.recipeTitle || x.title} ×${x.quantity}`
                            : x.recipeTitle || x.title
                    )
                    .filter(Boolean);
                return (
                    <div className="calendar-tile">
                      {names.slice(0, 2).map((n, i) => (
                          <div key={i} className="mini-recipe" title={n}>
                            {n}
                          </div>
                      ))}
                      {names.length > 2 && (
                          <div className="mini-more">+{names.length - 2}</div>
                      )}
                    </div>
                );
              }}
          />
        </div>

        {/* 🍱 상세 패널 */}
        <div className="details-container">
          <h2>{selectedDate.toLocaleDateString("ko-KR")}</h2>
          <ul className="meal-card-list">
            {dayMeals.length === 0 && (
                <li className="empty">등록된 식단이 없습니다.</li>
            )}

            {dayMeals.map((mp) => (
                <li key={mp.id} className="meal-card">
                  <div className="row">
                    <img
                        className="thumb"
                        src={imgSrcOf(mp)}
                        alt="thumb"
                        onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
                    />
                    <div className="info">
                      <div className="slot">{mp.title}</div>
                      <div className="title">
                        {mp.recipeTitle || "(레시피 제목 없음)"}
                        {(mp.quantity ?? 1) > 1 && (
                            <span className="qty-badge">×{mp.quantity}</span>
                        )}
                      </div>
                      {mp.note && <div className="note">{mp.note}</div>}
                    </div>

                    {mp.recipeId && (
                        <a className="btn-link" href={`/recipes/${mp.recipeId}`}>
                          레시피 상세
                        </a>
                    )}
                  </div>
                </li>
            ))}
          </ul>
        </div>
      </div>
  );
}