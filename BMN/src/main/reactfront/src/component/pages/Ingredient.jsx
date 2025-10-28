// src/component/pages/Ingredient.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const apiBase = 'http://localhost:8080';

// 로컬 타임존 기준 YYYY-MM-DD (UTC 변환 없이 하루 밀림 방지)
const localTodayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

// 안전한 플레이스홀더(SVG data URL)
const PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'>
      <rect width='100%' height='100%' rx='12' fill='#f3f4f6'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-size='14'>No Image</text>
    </svg>`
    );

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
    const navigate = useNavigate();

    // ✅ 항상 배열 [{ name, link }] 로 온다고 가정
    const ingredients = Array.isArray(location.state?.ingredients) ? location.state.ingredients : [];
    const rawThumb = location.state?.thumbnail || location.state?.thumbnailUrl || null;
    const initialCostRaw = location.state?.cost ?? 0;
    const initialCost = Number.isFinite(Number(initialCostRaw)) ? Number(initialCostRaw) : 0;

    // ✅ 레시피 연결 정보(필수)
    const recipeIdFromState = Number(location.state?.recipeId) || null;

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

    // ✅ 식단 슬롯/메모
    const [mealSlot, setMealSlot] = useState('저녁'); // 아침/점심/저녁/간식
    const [mealNote, setMealNote] = useState('');     // 기본은 비워두기

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
                const names = Array.isArray(data) ? data.map(x => (typeof x === 'string' ? x : x?.name)).filter(Boolean) : [];
                const set = new Set(names.map(normalizeName));
                if (!abort) setFridgeSet(set);
            } catch {
                if (!abort) setFridgeSet(new Set()); // 실패해도 기능은 계속
            }
        })();
        return () => { abort = true; };
    }, []);

    // 네이버 검색 호출
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
                        date: dateISO,
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

    // ✅ 식단 반영 + 식단 페이지로 이동
    const applyMealAndGo = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('로그인이 필요합니다.');
                return;
            }
            if (!recipeIdFromState) {
                alert('레시피 ID가 없어 식단에 등록할 수 없습니다. 레시피 상세에서 다시 시도해주세요.');
                return;
            }
            const res = await fetch(`${apiBase}/api/mealplan/apply-purchases`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    planDate: localTodayISO(),
                    title: mealSlot,             // 아침/점심/저녁/간식
                    recipeId: recipeIdFromState, // ✅ 필수!
                    note: mealNote?.trim() || '' // ✅ 기본 문구 제거 (사용자 입력만)
                })
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`식단 반영 실패 (HTTP ${res.status}): ${txt}`);
            }
            navigate('/meal');
        } catch (e) {
            alert(e.message || '식단 반영 중 오류가 발생했습니다.');
        }
    };

    // 냉장고에 있는 재료 여부
    const inFridge = (name) => fridgeSet.has(normalizeName(name));

    // 최종 썸네일 선택
    const resolvedThumb = rawThumb || PLACEHOLDER;

    return (
        <div className="ingredient-page">
            <div className="ingredient-top-box">
                <div className="thumbnail">
                    <img
                        src={resolvedThumb}
                        alt="썸네일"
                        onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
                    />
                </div>

                {/* 예상비용(고정) */}
                <div className="cost-section sx-1h" >
                    <div><strong>예상비용</strong></div>
                    <div>{initialCost.toLocaleString()}원</div>
                </div>

                {/* 최종비용(선택합계) + 버튼들 */}
                <div className="reflect-button sx-1i sx-1j sx-1k" >
                    <div >
                        <strong>최종비용(선택합계)</strong>
                        <span >{finalTotal.toLocaleString()}원</span>
                    </div>

                    {/* ✅ 식단 슬롯 선택 */}
                    <div className="sx-1l sx-1m sx-1n"  >
                        <span >식단 시간대:</span>
                        {['아침','점심','저녁','간식'].map(opt => (
                            <label key={opt} >
                                <input
                                    type="radio"
                                    name="mealSlot"
                                    value={opt}
                                    checked={mealSlot === opt}
                                    onChange={(e)=> setMealSlot(e.target.value)}
                                />
                                {opt}
                            </label>
                        ))}
                    </div>

                    {/* ✅ 식단 메모(선택) */}
                    <input className="sx-1o"
                        type="text"
                        placeholder="메모(선택)"
                        value={mealNote}
                        onChange={(e)=> setMealNote(e.target.value)}
                         />

                    {/* 가계부 반영 */}
                    <button className="sx-1p"
                         onClick={openConfirm}
                        disabled={Object.keys(checked).length === 0}
                        title={Object.keys(checked).length === 0 ? '선택한 상품이 없습니다' : '선택한 항목을 가계부에 반영'}
                    >
                        가계부 반영
                    </button>

                    {/* ✅ 새 버튼: 식단 반영하고 바로 보기 */}
                    <button className="sx-1q"
                         onClick={applyMealAndGo}
                        title={!recipeIdFromState ? '레시피 ID가 없어 식단에 반영할 수 없습니다' : '식단에 추가하고 이동'}
                        disabled={!recipeIdFromState}
                    >
                        🍱 식단 반영하고 보기
                    </button>
                </div>
            </div>

            {noIngredients ? (
                <div className="sx-1r"  >
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
                                        {exists && <span className="sx-1s"  >이미 있음</span>}
                                    </li>
                                );
                            })}
                        </ul>

                        {/* 선택한 상품 요약 */}
                        {Object.keys(checked).length > 0 && (
                            <div className="sx-1t sx-1u"  >
                                <h4>선택한 상품</h4>
                                <ul >
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
                    <div className="ingredient-link sx-11">
                        {loading && <p>네이버 쇼핑에서 가격을 불러오는 중…</p>}
                        {err && (
                            <div >
                                <p>{err}</p>
                                {debug && (
                                    <details>
                                        <summary>응답 본문 보기</summary>
                                        <pre className="sx-1v"  >{debug}</pre>
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
                                        <div className="sx-1w sx-1x"  >
                                            <div >사용자 등록 구매링크</div>
                                            {userLink ? (
                                                <div>
                                                    <a href={userLink} target="_blank" rel="noreferrer">{userLink}</a>
                                                    <div className="sx-1y"  >
                                                        이 링크는 자동 가격반영이 되지 않습니다.
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="sx-1z"  >등록된 구매 링크가 없습니다.</div>
                                            )}
                                        </div>

                                        {/* 네이버 검색 결과 (체크박스로 최종 비용 반영) */}
                                        {!priceMap || !matchedKey || !priceMap[matchedKey] || priceMap[matchedKey].length === 0 ? (
                                            <p>네이버 쇼핑 검색 결과가 없습니다.</p>
                                        ) : (
                                            <table className="sx-20 sx-21"  >
                                                <thead>
                                                <tr>
                                                    <th ></th>
                                                    <th className="sx-22 sx-23 sx-22"  >상품명</th>
                                                    <th >가격</th>
                                                    <th >몰</th>
                                                    <th>바로가기</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {priceMap[matchedKey].map((it, idx) => {
                                                    const rowKey = `${matchedKey}-${idx}`;
                                                    const price = Number(it.lprice) || 0;
                                                    const isChecked = !!checked[rowKey];
                                                    return (
                                                        <tr className="sx-24 sx-25" key={rowKey}  >
                                                            <td >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => toggleCheck(rowKey, price, it.title)}
                                                                    aria-label="가격 반영"
                                                                />
                                                            </td>
                                                            <td>{renderTitleHTML(it.title)}</td>
                                                            <td className="sx-23"  >
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
                <div className="sx-26 sx-27"
                     onClick={() => !submitting && setConfirmOpen(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="sx-28 sx-29 sx-2a"  >가계부에 반영할까요?</h3>

                        {/* 선택 항목 목록 */}
                        <div >
                            <table >
                                <thead>
                                <tr>
                                    <th className="sx-22 sx-23"  >항목</th>
                                    <th >금액</th>
                                </tr>
                                </thead>
                                <tbody>
                                {Object.entries(checked).map(([k, v]) => (
                                    <tr className="sx-2b sx-23" key={k}  >
                                        <td>{plain(v.title)}</td>
                                        <td >{Number(v.price).toLocaleString()}원</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 최종비용만 표시 */}
                        <div className="sx-2c sx-2d"  >
                            최종비용(선택합계): <strong>{finalTotal.toLocaleString()}원</strong>
                        </div>

                        <div >
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