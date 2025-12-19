import React from 'react';
import './ConfirmApplyModal.css';

const ConfirmApplyModal = ({
    open,
    type = 'ledger',
    items = [],
    total = 0,
    date,
    onDateChange,
    onClose,
    onConfirm,
    submitting,
    submitMsg,
}) => {
    if (!open) return null;
    const isLedger = type === 'ledger';

    const handleBackdrop = () => {
        if (!submitting && onClose) onClose();
    };

    const handleDateChange = (e) => {
        onDateChange?.(e.target.value);
    };

    return (
        <div className="confirm-modal-backdrop" onClick={handleBackdrop}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                <h3 className="confirm-modal__title">{isLedger ? '가계부에 반영할까요?' : '식단에 반영할까요?'}</h3>

                {isLedger && (
                    <div className="confirm-modal__table">
                        <table>
                            <thead>
                                <tr>
                                    <th>항목</th>
                                    <th>금액</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} className="confirm-modal__empty">선택된 항목이 없습니다.</td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={item.key}>
                                            <td>{item.title}</td>
                                            <td className="is-right">{Number(item.price).toLocaleString()}원</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="confirm-modal__date">
                    <label>
                        <span>일자 선택:</span>
                        <input
                            type="date"
                            value={date}
                            onChange={handleDateChange}
                            disabled={submitting}
                        />
                    </label>
                </div>

                {isLedger && (
                    <div className="confirm-modal__total">
                        최종비용(선택합계): <strong>{Number(total).toLocaleString()}원</strong>
                    </div>
                )}

                <div className="confirm-modal__actions">
                    <button type="button" onClick={onClose} disabled={submitting}>
                        취소
                    </button>
                    <button type="button" onClick={onConfirm} disabled={submitting}>
                        {submitting ? '반영 중…' : isLedger ? '가계부 반영' : '식단 반영'}
                    </button>
                </div>

                {submitMsg && (
                    <div className={`confirm-modal__message ${submitMsg.includes('반영되었습니다') ? 'is-success' : 'is-error'}`}>
                        {submitMsg}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConfirmApplyModal;
