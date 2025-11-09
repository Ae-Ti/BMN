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
                        당신을 위한 라이프 매니저. 솔티
                    </h1>
                </div>

                <div className={`cards-section ${visible ? 'cards-fade-in' : ''}`}>
                    <div className="nav-card" onClick={() => handleCardClick('/')}>
                        <div>
                            <h2 className="card-title">레시피 커뮤니티</h2>
                            <p className="card-description">오늘 뭐 먹지? 솔티가 도와줄게요!</p>
                        </div>
                        <span className="card-arrow">→</span>
                    </div>
                    <div className="nav-card" onClick={() => handleCardClick('/household-ledger')}>
                        <div>
                            <h2 className="card-title">가계부 페이지</h2>
                            <p className="card-description">솔티와 함께, 한 단계 더 빠른 가계부!</p>
                        </div>
                        <span className="card-arrow">→</span>
                    </div>
                </div>
            </div>
            <footer className={`main-page-footer ${visible ? 'visible' : ''}`}>
                <div className="footer-content">
                    <p className="team-name">가보자IT</p>
                    <p>당신의 이야기를 귀담아 듣겠습니다.</p>
                    <p>문의: contact@gaboja-it.com</p>
                </div>
            </footer>
        </div>
    );
};

export default MainPage;