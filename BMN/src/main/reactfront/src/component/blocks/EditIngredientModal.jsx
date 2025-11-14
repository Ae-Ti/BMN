import React, { useState, useEffect } from "react";
import "./EditIngredientModal.css";

const EditIngredientModal = ({ show, onClose, ingredient, onSave, categories }) => {
    const [formData, setFormData] = useState({
        id: "",
        name: "",
        quantity: 1,
        unit: "",
        category: "REFRIGERATED",
        expireDate: "",
    });

    useEffect(() => {
        if (ingredient) {
            setFormData({
                id: ingredient.id || "",
                name: ingredient.name || "",
                quantity: ingredient.quantity || 1,
                unit: ingredient.unit || "",
                category: ingredient.category || "REFRIGERATED",
                expireDate: ingredient.expireDate || "",
            });
        }
    }, [ingredient]);

    if (!show) {
        return null;
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert("이름을 입력하세요.");
            return;
        }
        onSave(formData);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>재료 수정</h2>
                    <button className="close-button" onClick={onClose}>
                        &times;
                    </button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>이름:</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="이름"
                            />
                        </div>
                        <div className="form-group">
                            <label>수량:</label>
                            <input
                                type="number"
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleChange}
                                min="1"
                            />
                        </div>
                        <div className="form-group">
                            <label>단위:</label>
                            <input
                                type="text"
                                name="unit"
                                value={formData.unit}
                                onChange={handleChange}
                                placeholder="단위(예: 개, g, 묶음)"
                            />
                        </div>
                        <div className="form-group">
                            <label>카테고리:</label>
                            <select name="category" value={formData.category} onChange={handleChange}>
                                {categories.map((c) => (
                                    <option key={c.key} value={c.key}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>유통기한:</label>
                            <input
                                type="date"
                                name="expireDate"
                                value={formData.expireDate}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="modal-actions">
                            <button type="submit" className="save-button">
                                저장
                            </button>
                            <button type="button" className="cancel-button" onClick={onClose}>
                                취소
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditIngredientModal;