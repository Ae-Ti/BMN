import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const PostCreate = () => {
    // 텍스트 필드
    const [subject, setSubject] = useState("");
    const [ingredientsName, setIngredientsName] = useState("");
    const [ingredientsLink, setIngredientsLink] = useState("");
    const [ingredientsList, setIngredientsList] = useState([]); // [{name, link}]
    const [cookingTimeMinutes, setCookingTimeMinutes] = useState("");
    const [description, setDescription] = useState("");
    const [tools, setTools] = useState("");
    const [estimatedPrice, setEstimatedPrice] = useState("");

    // 이미지 미리보기/캡션
    const [thumbnailPreview, setThumbnailPreview] = useState(null);
    const [stepPreviews, setStepPreviews] = useState([]); // blob urls
    const [stepCaptions, setStepCaptions] = useState([]); // 문자열 배열

    // 파일 input ref
    const thumbRef = useRef(null);
    const stepsRef = useRef(null);

    const navigate = useNavigate();

    // 재료 추가/삭제 (링크 http/https 자동 보정)
    const addIngredient = () => {
        const name = ingredientsName.trim();
        let link = ingredientsLink.trim();
        if (!name) return;

        if (link && !/^https?:\/\//i.test(link)) link = "http://" + link;

        setIngredientsList((prev) => [...prev, { name, link }]);
        setIngredientsName("");
        setIngredientsLink("");
    };
    const removeIngredient = (i) => {
        setIngredientsList((prev) => prev.filter((_, idx) => idx !== i));
    };

    // 썸네일 미리보기
    const handlePhotoUpload = (e) => {
        const f = e.target.files?.[0];
        setThumbnailPreview(f ? URL.createObjectURL(f) : null);
    };

    // 스텝 이미지 선택 (캡션 배열 정규화)
    const handleStepsChange = (e) => {
        const files = Array.from(e.target.files || []);
        setStepPreviews(files.map((f) => URL.createObjectURL(f)));

        setStepCaptions((prev) => {
            const next = Array(files.length).fill("");
            for (let i = 0; i < files.length; i++) next[i] = (prev?.[i] ?? "").toString();
            return next;
        });
    };

    const updateCaption = (i, v) => {
        setStepCaptions((prev) => {
            const copy = [...prev];
            copy[i] = v;
            return copy;
        });
    };

    // 전송
    const handleSubmit = async (e) => {
        e?.preventDefault?.();

        if (!subject.trim()) return alert("요리 이름(제목)을 입력하세요.");
        if (!cookingTimeMinutes) return alert("소요 시간을 입력하세요.");
        if (!description.trim()) return alert("조리 설명을 입력하세요.");
        if (!tools.trim()) return alert("조리 도구를 입력하세요.");
        if (!estimatedPrice) return alert("총 예상 가격을 입력하세요.");
        if (ingredientsList.length === 0) return alert("재료를 1개 이상 추가하세요.");
        if (!thumbRef.current?.files?.length) return alert("대표 사진(썸네일)을 선택하세요.");
        if (!stepsRef.current?.files?.length) return alert("스텝 이미지를 1개 이상 선택하세요.");

        const fd = new FormData();
        fd.append("subject", subject);

        // ingredients: JSON 배열
        const ingredientsBlob = new Blob([JSON.stringify(ingredientsList)], {
            type: "application/json",
        });
        fd.append("ingredients", ingredientsBlob);

        // 숫자/텍스트 필드
        fd.append("cookingTimeMinutes", String(cookingTimeMinutes));
        fd.append("description", description);
        fd.append("tools", tools);
        fd.append("estimatedPrice", String(estimatedPrice));

        // 파일들
        fd.append("thumbnail", thumbRef.current.files[0]);
        Array.from(stepsRef.current.files).forEach((f) => fd.append("stepImages", f));

        // 캡션들 JSON 배열로
        const captionsArray = (stepCaptions ?? []).map((c) => (c ?? "").toString());
        const captionsBlob = new Blob([JSON.stringify(captionsArray)], {
            type: "application/json",
        });
        fd.append("captions", captionsBlob);

        try {
            const res = await fetch("/recipe/create", {
                method: "POST",
                headers: (() => {
                    const token = localStorage.getItem("token");
                    return token ? { Authorization: `Bearer ${token}` } : undefined;
                })(),
                body: fd,
            });
            if (!res.ok) throw new Error(`업로드 실패: ${res.status}`);
            alert("등록 완료!");
            navigate("/");
        } catch (err) {
            console.error(err);
            alert("등록 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="sx-2t sx-2u sx-2v"  >
            <h2 >레시피 등록</h2>

            <div >
                {/* 제목 */}
                <div>
                    <label>요리 이름</label>
                    <input className="sx-2w"
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="예) 김치볶음밥"
                         />
                </div>

                {/* 대표 사진 */}
                <div>
                    <label>대표 사진(썸네일)</label>
                    <input
                        id="thumbnail"
                        ref={thumbRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                    />
                    {thumbnailPreview && (
                        <div className="sx-2x sx-2y"  >
                            <img src={thumbnailPreview} alt="thumbnail" />
                        </div>
                    )}
                </div>

                {/* 재료 */}
                <div>
                    <label>재료 추가</label>
                    <div className="sx-2z"  >
                        <input className="sx-30"
                            type="text"
                            value={ingredientsName}
                            onChange={(e) => setIngredientsName(e.target.value)}
                            placeholder="재료명"
                             />
                        <input className="sx-31"
                            type="text"
                            value={ingredientsLink}
                            onChange={(e) => setIngredientsLink(e.target.value)}
                            placeholder="구매 링크(선택)"
                             />
                        <button type="button" onClick={addIngredient}>
                            추가
                        </button>
                    </div>
                    {ingredientsList.length > 0 && (
                        <ul className="sx-32 sx-6"  >
                            {ingredientsList.map((it, i) => (
                                <li key={i} >
                                    <span>
                                        {it.name} {it.link ? `— ${it.link}` : ""}
                                    </span>
                                    <button type="button" onClick={() => removeIngredient(i)}>
                                        삭제
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* 시간/도구/가격/설명 */}
                <div className="sx-33"  >
                    <div>
                        <label>소요 시간(분)</label>
                        <input className="sx-34"
                            type="number"
                            value={cookingTimeMinutes}
                            onChange={(e) => setCookingTimeMinutes(e.target.value)}
                             min={0}
                        />
                    </div>
                    <div>
                        <label>조리 도구</label>
                        <input className="sx-34"
                            type="text"
                            value={tools}
                            onChange={(e) => setTools(e.target.value)}
                             placeholder="예) 국자, 후라이팬"
                        />
                    </div>
                </div>

                <div className="sx-33"  >
                    <div>
                        <label>총 예상 가격(원)</label>
                        <input className="sx-34"
                            type="number"
                            value={estimatedPrice}
                            onChange={(e) => setEstimatedPrice(e.target.value)}
                             min={0}
                        />
                    </div>
                    <div>
                        <label>조리 설명</label>
                        <input className="sx-34"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                             placeholder="예) 센 불에서 3분간 볶기"
                        />
                    </div>
                </div>

                {/* 스텝 이미지 + 캡션 */}
                <div>
                    <label>스텝 이미지 (여러 장 선택 가능)</label>
                    <input
                        id="cookingSteps"
                        ref={stepsRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleStepsChange}
                    />
                    {stepPreviews.length > 0 && (
                        <div className="sx-35 sx-36"
                             >
                            {stepPreviews.map((url, i) => (
                                <div key={i} >
                                    <img className="sx-37"
                                        src={url}
                                        alt={`step-${i + 1}`}
                                         />
                                    <input className="sx-38"
                                        type="text"
                                        value={stepCaptions[i] ?? ""}
                                        onChange={(e) => updateCaption(i, e.target.value)}
                                        placeholder={`스텝 ${i + 1} 캡션(선택)`}
                                         />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 제출 */}
                <div className="sx-39 sx-3a"  >
                    <button
                        type="button"
                        onClick={handleSubmit}
                        >
                        등록하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostCreate;