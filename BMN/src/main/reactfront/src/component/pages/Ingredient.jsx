import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import './Ingredient.css';

const Ingredient = () => {
    const location = useLocation();

    // 1. location.state에서 cost와 ingredients 데이터를 추출합니다.
    const initialCost = location.state?.cost ?? 0;
    const rawIngredientsData = location.state?.ingredients;

    // 2. 전달받은 ingredients 데이터(문자열)를 자바스크립트 배열로 파싱합니다.
    const ingredients = useMemo(() => {
        if (typeof rawIngredientsData === 'string') {
            try {
                // JSON 문자열을 배열로 변환
                const parsedData = JSON.parse(rawIngredientsData);
                // 만약을 위해 배열이 맞는지 한 번 더 확인
                return Array.isArray(parsedData) ? parsedData : [];
            } catch (e) {
                console.error("재료 데이터를 파싱하는 데 실패했습니다.", e);
                return []; // 파싱 실패 시 빈 배열 반환
            }
        }
        // 이미 배열 형태라면 그대로 사용
        return Array.isArray(rawIngredientsData) ? rawIngredientsData : [];
    }, [rawIngredientsData]);


    const [cost, setCost] = useState(initialCost);
    const [selectedIngredient, setSelectedIngredient] = useState(null);

    const handleReflectBudget = () => {
        alert(`가계부에 ${cost}원을 반영했습니다.`);
    };

    if (ingredients.length === 0) {
        return (
            <div className="ingredient-page" style={{ textAlign: 'center', paddingTop: '50px' }}>
                <h2>표시할 재료 정보가 없습니다.</h2>
                <p>레시피 상세 페이지에서 '담기'를 눌러주세요.</p>
            </div>
        );
    }

    return (
        <div className="ingredient-page">
            <div className="ingredient-top-box">
                <div className="thumbnail">
                    <img src="https://via.placeholder.com/150" alt="썸네일" />
                </div>
                <div className="cost-section">
                    <label htmlFor="cost-input">예상비용:</label>
                    <input
                        id="cost-input"
                        type="number"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                    />
                    <span>원</span>
                </div>
                <div className="reflect-button">
                    <button onClick={handleReflectBudget}>가계부 반영</button>
                </div>
            </div>

            <div className="ingredient-bottom-box">
                <div className="ingredient-list">
                    <h3>재료 목록</h3>
                    <ul>
                        {/* 3. 이제 'ingredients'는 항상 배열이므로 .map()을 안전하게 사용할 수 있습니다. */}
                        {ingredients.map((item, index) => (
                            <li
                                key={index}
                                onClick={() => setSelectedIngredient(item)}
                                className={selectedIngredient?.name === item.name ? 'selected' : ''}
                            >
                                {item.name}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="ingredient-link">
                    {selectedIngredient ? (
                        <div>
                            <h3>{selectedIngredient.name} 구매처</h3>
                            {selectedIngredient.link ? (
                                <a href={selectedIngredient.link} target="_blank" rel="noopener noreferrer">
                                    {selectedIngredient.link}
                                </a>
                            ) : (
                                <p>등록된 구매 링크가 없습니다.</p>
                            )}
                        </div>
                    ) : (
                        <p>재료를 클릭하면 구매처 링크가 여기에 표시됩니다.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Ingredient;