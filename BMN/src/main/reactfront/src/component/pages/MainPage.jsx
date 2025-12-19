// src/component/pages/MainPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MainPage.css';

const MainPage = () => {
    const navigate = useNavigate();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Trigger animations shortly after component mounts
        const timer = setTimeout(() => {
            setVisible(true);
        }, 100); // Small delay to ensure styles are applied

        return () => clearTimeout(timer);
    }, []);

    const handleCardClick = (path) => {
        navigate(path);
    };

    return (
        <div className="main-page-container">
            <div className="content-wrapper">
                <div className="welcome-section">
                    <h1 className={`welcome-text ${visible ? 'text-fade-in' : ''}`}>
                        환영합니다,<br />
                        당신을 위한 라이프 매니저. <span className="highlight-text">솔티</span>
                    </h1>
                </div>

                <div className={`cards-section ${visible ? 'cards-fade-in' : ''}`}>
                    <div className="nav-card" onClick={() => handleCardClick('/RecipeMain')}>
                        <div>
                            <h2 className="card-title">레시피 커뮤니티</h2>
                            <p className="card-description">오늘 뭐 먹지? 솔티가 도와줄게요!</p>
                        </div>
                        <span className="card-arrow">→</span>
                    </div>
                    <div className="nav-card" onClick={() => handleCardClick('/household-ledger')}>
                        <div>
                            <h2 className="card-title">가계부 페이지</h2>
                            <p className="card-description">솔티와 함께, 한층 더 빠른 가계부!</p>
                        </div>
                        <span className="card-arrow">→</span>
                    </div>
                </div>

                <div className={`tips-card ${visible ? 'cards-fade-in' : ''}`} onClick={() => handleCardClick('/guide')}>
                    <div className="tips-icon" aria-hidden>💡</div>
                    <div className="tips-text">
                        <p className="tips-kicker">솔티 가이드</p>
                        <p className="tips-title">솔티 사용 방법을 알려드려요</p>
                    </div>
                    <span className="card-arrow">→</span>
                </div>
            </div>

        </div>
    );
};

export default MainPage;