import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import './Ingredient.css';

const Ingredient = () => {
    // 2. useLocation을 호출해 location 객체를 가져옵니다.
    const location = useLocation();

    // 3. location.state에서 cost와 ingredients 데이터를 추출합니다.
    // 데이터가 없는 경우를 대비해 기본값을 설정합니다. (Optional Chaining과 Nullish Coalescing 사용)
    const initialCost = location.state?.cost ?? 0;
    const ingredients = location.state?.ingredients ?? [];

    // 예상비용 state를 전달받은 값으로 초기화합니다.
    const [cost, setCost] = useState(initialCost);

    // 현재 선택된 재료 state
    const [selectedIngredient, setSelectedIngredient] = useState(null);

    const handleReflectBudget = () => {
        alert(`가계부에 ${cost}원을 반영했습니다.`);
    };

    // 4. 표시할 재료가 없는 경우를 위한 UI 처리
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
            {/* 상단 박스 */}
            <div className="ingredient-top-box">
                {/* 썸네일 (썸네일 정보는 전달되지 않았으므로 일단 placeholder 유지) */}
                <div className="thumbnail">
                    <img
                        src="https://via.placeholder.com/150"
                        alt="썸네일"
                    />
                </div>

                {/* 예상비용 */}
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

                {/* 가계부 반영 버튼 */}
                <div className="reflect-button">
                    <button onClick={handleReflectBudget}>가계부 반영</button>
                </div>
            </div>

            {/* 하단 박스 */}
            <div className="ingredient-bottom-box">
                {/* 재료 리스트 */}
                <div className="ingredient-list">
                    <h3>재료 목록</h3>
                    <ul>
                        {/* 5. 하드코딩된 배열 대신 전달받은 ingredients 배열을 사용해 목록을 만듭니다. */}
                        {ingredients.map((item, index) => (
                            <li
                                key={index}
                                onClick={() => setSelectedIngredient(item)}
                                className={
                                    selectedIngredient?.name === item.name ? 'selected' : ''
                                }
                            >
                                {item.name}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 구매처 링크 */}
                <div className="ingredient-link">
                    {selectedIngredient ? (
                        <div>
                            <h3>{selectedIngredient.name} 구매처</h3>
                            {selectedIngredient.link ? (
                                <a
                                    href={selectedIngredient.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
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

