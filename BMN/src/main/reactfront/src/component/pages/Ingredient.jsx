// src/component/pages/Ingredient.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './Ingredient.css';

const apiBase = 'http://localhost:8080';

// 로컬 타임존 기준 YYYY-MM-DD (UTC 변환 없이 하루 밀림 방지)
const localTodayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

// 재료명 정규화(괄호/단위/공백 정리)
const normalizeName = (s) => {
    if (!s) return '';
    return String(s)
        .replace(/\(.*?\)/g, ' ')
        .replace(/\d+\s*(g|kg|ml|l|개|큰술|작은술|컵)/gi, ' ')
        .replace(/[^\w가-힣\s]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .toLowerCase();
};

const Ingredient = () => {
    const location = useLocation();

    // ✅ 항상 배열 [{ name, link }] 로 온다고 가정
    const ingredients = Array.isArray(location.state?.ingredients) ? location.state.ingredients : [];
    const thumbnail = location.state?.thumbnail;
    const initialCostRaw = location.state?.cost ?? 0;
    const initialCost = Number.isFinite(Number(initialCostRaw)) ? Number(initialCostRaw) : 0;

    // 이름 배열
    const ingredientNames = useMemo(
        () => ingredients.map(it => it?.name).filter(Boolean),
        [ingredients]
    );

    // 상태
    const [selectedIngredient, setSelectedIngredient] = useState(null);
    const [priceMap, setPriceMap] = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [debug, setDebug] = useState(null);
    const [checked, setChecked] = useState({}); // { "<키>": { price, title } }

    // 냉장고 보유 재료
    const [fridgeSet, setFridgeSet] = useState(() => new Set());

    // 모달/반영 상태
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitMsg, setSubmitMsg] = useState('');

    // 첫 진입 시 자동 선택
    useEffect(() => {
        if (!selectedIngredient && ingredients.length > 0) {
            setSelectedIngredient(ingredients[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ingredients]);

    // 냉장고 재료 불러오기
    useEffect(() => {
        let abort = false;
        (async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${apiBase}/api/fridge/items`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                // data: ["양파","계란"] 또는 [{name:"양파"}, ...] 대응
                const names = Array.isArray(data) ? data.map(x => (typeof x === 'string' ? x : x?.name)).filter(Boolean) : [];
                const set = new Set(names.map(normalizeName));
                if (!abort) setFridgeSet(set);
            } catch {
                if (!abort) setFridgeSet(new Set()); // 실패해도 기능은 계속
            }
        })();
        return () => { abort = true; };
    }, []);

    // 네이버 검색 호출 (기본순 sim은 서버에서 처리)
    useEffect(() => {
        let abort = false;
        (async () => {
            if (!ingredientNames.length) return;
            setLoading(true);
            setErr(null);
            setDebug(null);
            try {
                const res = await fetch(`${apiBase}/api/price/compare`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ingredients: ingredientNames,
                        perIngredient: 5,
                        excludeUsed: true
                    })
                });
                const txt = await res.text();
                if (!res.ok) {
                    if (!abort) {
                        setErr(`가격 조회 실패: HTTP ${res.status}`);
                        setDebug(txt);
                    }
                    return;
                }
                const json = JSON.parse(txt);
                if (!abort) setPriceMap(json);
            } catch (e) {
                if (!abort) setErr(`네트워크 오류: ${e.message}`);
            } finally {
                if (!abort) setLoading(false);
            }
        })();
        return () => { abort = true; };
    }, [ingredientNames]);

    // 파생 값/헬퍼
    const selectedName = selectedIngredient?.name ?? null;

    const findBestKey = (name) => {
        if (!name || !priceMap) return null;
        const keys = Object.keys(priceMap);
        let k = keys.find(k => k === name);
        if (k) return k;
        k = keys.find(k => name.includes(k)) || keys.find(k => k.includes(name));
        if (k) return k;
        const n1 = normalizeName(name);
        k = keys.find(x => normalizeName(x) === n1) || keys.find(x => n1.includes(normalizeName(x))) || keys.find(x => normalizeName(x).includes(n1));
        return k || null;
    };

    const matchedKey = selectedName ? findBestKey(selectedName) : null;

    const toggleCheck = (rowKey, price, title) => {
        setChecked(prev => {
            const next = { ...prev };
            if (next[rowKey]) delete next[rowKey];
            else next[rowKey] = { price: Number(price) || 0, title };
            return next;
        });
    };

    // 최종비용(선택합계)
    const finalTotal = useMemo(
        () => Object.values(checked).reduce((sum, v) => sum + (Number(v.price) || 0), 0),
        [checked]
    );

    const userLink = useMemo(() => {
        if (!selectedIngredient) return null;
        const link = selectedIngredient.link || '';
        if (!link) return null;
        return /^https?:\/\//i.test(link) ? link : `http://${link}`;
    }, [selectedIngredient]);

    const renderTitleHTML = (html) => <span dangerouslySetInnerHTML={{ __html: html || '' }} />;

    const noIngredients = ingredients.length === 0;

    // 유틸: HTML 태그 제거 + 길이 제한
    const plain = (s, maxLen = 80) => {
        const t = String(s || '').replace(/<[^>]+>/g, '').trim();
        return t.length > maxLen ? `${t.slice(0, maxLen - 1)}…` : t;
    };

    // 모달 열기
    const openConfirm = () => {
        if (Object.keys(checked).length === 0) {
            alert('선택된 상품이 없습니다.');
            return;
        }
        setSubmitMsg('');
        setConfirmOpen(true);
    };

    // 가계부 반영(항목별 EXPENSE 생성) - ✅ 오늘 날짜(로컬)로 고정
    const confirmApplyToLedger = async () => {
        if (submitting) return;
        setSubmitting(true);
        setSubmitMsg('');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setSubmitMsg('로그인이 필요합니다.');
                setSubmitting(false);
                return;
            }
            const dateISO = localTodayISO();
            const entries = Object.values(checked);

            for (const { price, title } of entries) {
                await fetch(`${apiBase}/api/ledger/transactions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        date: dateISO,              // ✅ 로컬 오늘 날짜
                        type: 'EXPENSE',
                        name: plain(title),
                        amount: Number(price) || 0
                    })
                }).then(async r => {
                    if (!r.ok) {
                        const txt = await r.text();
                        throw new Error(`가계부 반영 실패 (HTTP ${r.status}): ${txt}`);
                    }
                });
            }

            setSubmitMsg('가계부에 반영되었습니다.');
            setChecked({});
            setTimeout(() => {
                setConfirmOpen(false);
                setSubmitMsg('');
            }, 700);
        } catch (e) {
            setSubmitMsg(e.message || '반영 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    // 냉장고에 있는 재료 여부
    const inFridge = (name) => fridgeSet.has(normalizeName(name));

    return (
        <div className="ingredient-page">
            <div className="ingredient-top-box">
                <div className="thumbnail">
                    <img
                        src={thumbnail || "https://via.placeholder.com/150"}
                        alt="썸네일"
                        onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/150"; }}
                    />
                </div>

                {/* 예상비용(고정) */}
                <div className="cost-section" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div><strong>예상비용</strong></div>
                    <div>{initialCost.toLocaleString()}원</div>
                </div>

                {/* 최종비용(선택합계) + 가계부 반영 버튼 */}
                <div className="reflect-button" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <strong>최종비용(선택합계)</strong>
                        <span style={{ fontSize: 18 }}>{finalTotal.toLocaleString()}원</span>
                    </div>
                    <button
                        style={{ marginTop: 8, padding: '8px 12px' }}
                        onClick={openConfirm}
                        disabled={Object.keys(checked).length === 0}
                        title={Object.keys(checked).length === 0 ? '선택한 상품이 없습니다' : '선택한 항목을 가계부에 반영'}
                    >
                        가계부 반영
                    </button>
                </div>
            </div>

            {noIngredients ? (
                <div style={{ textAlign: 'center', paddingTop: '50px' }}>
                    <h2>표시할 재료 정보가 없습니다.</h2>
                    <p>레시피 상세 페이지에서 '담기'를 눌러주세요.</p>
                </div>
            ) : (
                <div className="ingredient-bottom-box">
                    {/* 좌측: 재료 목록 */}
                    <div className="ingredient-list">
                        <h3>재료 목록</h3>
                        <ul>
                            {ingredients.map((item, index) => {
                                const name = item?.name;
                                if (!name) return null;
                                const isSelected = (selectedName === name);
                                const exists = inFridge(name);
                                return (
                                    <li
                                        key={index}
                                        onClick={() => setSelectedIngredient(item)}
                                        className={isSelected ? 'selected' : ''}
                                        style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                                    >
                                        <span>{name}</span>
                                        {exists && <span style={{ color: '#b00020', fontSize: 12 }}>이미 있음</span>}
                                    </li>
                                );
                            })}
                        </ul>

                        {/* 선택한 상품 요약 */}
                        {Object.keys(checked).length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <h4>선택한 상품</h4>
                                <ul style={{ fontSize: 13, color: '#444' }}>
                                    {Object.entries(checked).map(([k, v]) => (
                                        <li key={k}>
                                            {plain(v.title)} — {Number(v.price).toLocaleString()}원
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* 우측: 선택 재료의 링크/검색 결과 */}
                    <div className="ingredient-link">
                        {loading && <p>네이버 쇼핑에서 가격을 불러오는 중…</p>}
                        {err && (
                            <div style={{ color: 'crimson' }}>
                                <p>{err}</p>
                                {debug && (
                                    <details>
                                        <summary>응답 본문 보기</summary>
                                        <pre style={{ whiteSpace: 'pre-wrap' }}>{debug}</pre>
                                    </details>
                                )}
                            </div>
                        )}

                        {!loading && !err && (
                            <>
                                {selectedName ? (
                                    <div>
                                        <h3>{selectedName} 구매처</h3>

                                        {/* 사용자 업로드 링크 (자동 가격반영 안됨) */}
                                        <div style={{ margin: '8px 0 14px', fontSize: 14 }}>
                                            <div style={{ marginBottom: 4, fontWeight: 600 }}>사용자 등록 구매링크</div>
                                            {userLink ? (
                                                <div>
                                                    <a href={userLink} target="_blank" rel="noreferrer">{userLink}</a>
                                                    <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                                                        이 링크는 자동 가격반영이 되지 않습니다.
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ color: '#888' }}>등록된 구매 링크가 없습니다.</div>
                                            )}
                                        </div>

                                        {/* 네이버 검색 결과 (체크박스로 최종 비용 반영) */}
                                        {!priceMap || !matchedKey || !priceMap[matchedKey] || priceMap[matchedKey].length === 0 ? (
                                            <p>네이버 쇼핑 검색 결과가 없습니다.</p>
                                        ) : (
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                <tr>
                                                    <th style={{ width: 36 }}></th>
                                                    <th style={{ textAlign: 'left' }}>상품명</th>
                                                    <th style={{ textAlign: 'right' }}>가격</th>
                                                    <th style={{ textAlign: 'left' }}>몰</th>
                                                    <th>바로가기</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {priceMap[matchedKey].map((it, idx) => {
                                                    const rowKey = `${matchedKey}-${idx}`;
                                                    const price = Number(it.lprice) || 0;
                                                    const isChecked = !!checked[rowKey];
                                                    return (
                                                        <tr key={rowKey} style={{ borderTop: '1px solid #eee' }}>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => toggleCheck(rowKey, price, it.title)}
                                                                    aria-label="가격 반영"
                                                                />
                                                            </td>
                                                            <td>{renderTitleHTML(it.title)}</td>
                                                            <td style={{ textAlign: 'right' }}>
                                                                {price.toLocaleString()}원
                                                            </td>
                                                            <td>{it.mallName}</td>
                                                            <td>
                                                                <a href={it.link} target="_blank" rel="noreferrer">열기</a>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                ) : (
                                    <p>재료를 클릭하면 검색 결과가 표시됩니다.</p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ✅ 확인 모달 (최종비용만 표시) */}
            {confirmOpen && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                    }}
                    onClick={() => !submitting && setConfirmOpen(false)}
                >
                    <div
                        style={{
                            width: 'min(560px, 92vw)', background: '#fff', borderRadius: 12,
                            padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ marginTop: 0 }}>가계부에 반영할까요?</h3>

                        {/* 선택 항목 목록 */}
                        <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>항목</th>
                                    <th style={{ textAlign: 'right' }}>금액</th>
                                </tr>
                                </thead>
                                <tbody>
                                {Object.entries(checked).map(([k, v]) => (
                                    <tr key={k} style={{ borderTop: '1px solid #f1f1f1' }}>
                                        <td>{plain(v.title)}</td>
                                        <td style={{ textAlign: 'right' }}>{Number(v.price).toLocaleString()}원</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 최종비용만 표시 */}
                        <div style={{ marginTop: 10, fontSize: 14 }}>
                            최종비용(선택합계): <strong>{finalTotal.toLocaleString()}원</strong>
                        </div>

                        <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'flex-end', alignItems: 'baseline' }}>
                            <button onClick={() => setConfirmOpen(false)} disabled={submitting}>취소</button>
                            <button onClick={confirmApplyToLedger} disabled={submitting}>
                                {submitting ? '반영 중…' : '확인'}
                            </button>
                        </div>

                        {submitMsg && (
                            <div style={{ marginTop: 10, fontSize: 13, color: submitMsg.includes('반영되었습니다') ? '#2e7d32' : '#b00020' }}>
                                {submitMsg}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Ingredient;