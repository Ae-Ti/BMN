// src/component/pages/UsageTips.jsx
import React, { useEffect, useState } from 'react';
import './UsageTips.css';

const tips = [
    {
        title: '빠른 시작',
        detail: '레시피 메인에서 인기/최신 레시피를 훑고, 검색창에서 원하는 재료를 바로 찾아보세요.',
    },
    {
        title: '내 냉장고 관리',
        detail: '냉장고 관리에 재료를 추가하면 유통기한 알림과 재료별 맞춤 추천을 받을 수 있어요.',
    },
    {
        title: '식단 & 가계부',
        detail: '식단 관리로 일주일 식단을 계획하고, 가계부에서 식비를 함께 추적해 보세요.',
    },
    {
        title: '프로필 & 팔로우',
        detail: '프로필에서 내가 올린 레시피를 모아보고, 팔로우로 다른 셰프들의 새 레시피를 받아보세요.',
    },
];

const UsageTips = () => {
    const [index, setIndex] = useState(0);

    const next = () => setIndex((prev) => (prev + 1) % tips.length);
    const prev = () => setIndex((prev) => (prev - 1 + tips.length) % tips.length);
    const goTo = (i) => setIndex(i);

    useEffect(() => {
        const id = setInterval(next, 5000);
        return () => clearInterval(id);
    }, []);

    const active = tips[index];

    return (
        <div className="usage-tips-container">
            <div className="usage-tips-header">
                <div className="usage-tips-icon" aria-hidden>💡</div>
                <div>
                    <p className="usage-tips-kicker">카드 뉴스</p>
                    <h1 className="usage-tips-title">솔티 사용 방법을 한눈에</h1>
                    <p className="usage-tips-subtitle">순서대로 따라가며 핵심 기능을 익혀보세요.</p>
                </div>
            </div>

            <div className="usage-tips-slider">
                <button className="usage-tips-nav" onClick={prev} aria-label="이전">
                    ←
                </button>

                <div className="usage-tip-card active">
                    <div className="usage-tip-badge" aria-hidden>{String(index + 1).padStart(2, '0')}</div>
                    <div className="usage-tip-body">
                        <h2 className="usage-tip-title">{active.title}</h2>
                        <p className="usage-tip-detail">{active.detail}</p>
                    </div>
                    <div className="usage-tip-pill" aria-hidden>TIP</div>
                </div>

                <button className="usage-tips-nav" onClick={next} aria-label="다음">
                    →
                </button>
            </div>

            <div className="usage-tips-dots" role="tablist" aria-label="사용 팁 슬라이드">
                {tips.map((_, i) => (
                    <button
                        key={i}
                        className={`usage-tips-dot ${i === index ? 'active' : ''}`}
                        onClick={() => goTo(i)}
                        aria-label={`${i + 1}번째 팁 보기`}
                    />
                ))}
            </div>
        </div>
    );
};

export default UsageTips;
