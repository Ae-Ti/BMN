import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    const handleNavigate = (path) => {
        navigate(path);
        onClose();
    };

    return (
        <>
            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <nav className="sidebar-nav">
                    <button className="nav-button" onClick={() => handleNavigate("/mypage")}>마이페이지</button>
                    <button className="nav-button" onClick={() => handleNavigate("/fridge")}>냉장고 관리</button>
                    <button className="nav-button" onClick={() => handleNavigate("/meal")}>식단 관리</button>
                    <div className="nav-divider" aria-hidden="true"></div>
                    <button className="nav-button" onClick={() => handleNavigate("/chat")}>채팅</button>
                </nav>
            </div>
            {isOpen && <div className="sidebar-backdrop" onClick={onClose}></div>}
        </>
    );
};

export default Sidebar;
