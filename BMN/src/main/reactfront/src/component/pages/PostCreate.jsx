import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const PostCreate = () => {
    // 텍스트 필드
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");
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
    const [stepCaptions, setStepCaptions] = useState([]); // 캡션 배열

    // 파일 input은 ref로 안전하게 접근
    const thumbRef = useRef(null);
    const stepsRef = useRef(null);

    const navigate = useNavigate();

    // 재료 추가/삭제
    const addIngredient = () => {
        const name = ingredientsName.trim();
        const link = ingredientsLink.trim();
        if (!name) return;
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
        if (f) setThumbnailPreview(URL.createObjectURL(f));
        else setThumbnailPreview(null);
    };

    // 스텝 이미지 선택
    const handleStepsChange = (e) => {
        const files = Array.from(e.target.files || []);
        // 미리보기 생성
        const urls = files.map((f) => URL.createObjectURL(f));
        setStepPreviews(urls);
        // 캡션 배열 길이를 파일 수에 맞춤
        setStepCaptions((prev) => {
            const copy = [...prev];
            copy.length = files.length;
            return copy.map((v) => v ?? "");
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
        // 텍스트 필드
        fd.append("subject", subject);
        fd.append("ingredients", JSON.stringify(ingredientsList)); // 서버는 문자열로 받음
        fd.append("cookingTimeMinutes", String(cookingTimeMinutes));
        fd.append("description", description);
        fd.append("tools", tools);
        fd.append("estimatedPrice", String(estimatedPrice));
        fd.append("content", content);

        // ✅ 썸네일: 키 이름 정확히 'thumbnail'
        const thumb = thumbRef.current.files[0];
        fd.append("thumbnail", thumb);

        // ✅ 스텝 이미지: 키 이름 정확히 'stepImages'
        const files = Array.from(stepsRef.current.files);
        files.forEach((f) => fd.append("stepImages", f));

        // (선택) 캡션: 파일 순서와 동일하게 여러 번 append
        stepCaptions.forEach((c) => {
            if (typeof c === "string") fd.append("captions", c);
            else fd.append("captions", "");
        });

        // 디버그: 전송 키/값 확인
        // console.log([...fd.entries()].map(([k, v]) => [k, v?.name ?? v]));

        try {
            const res = await fetch("/recipe/create", {
                method: "POST",
                // Content-Type은 설정하지 말 것 (브라우저가 boundary 포함 자동 세팅)
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
        <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
            <h2 style={{ marginBottom: 12 }}>레시피 등록</h2>

            <div style={{ display: "grid", gap: 12 }}>
                {/* 제목 */}
                <div>
                    <label>요리 이름</label>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="예) 김치볶음밥"
                        style={{ width: "100%", padding: 8 }}
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
                        <div style={{ marginTop: 8 }}>
                            <img src={thumbnailPreview} alt="thumbnail" style={{ maxWidth: "100%" }} />
                        </div>
                    )}
                </div>

                {/* 재료 */}
                <div>
                    <label>재료 추가</label>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <input
                            type="text"
                            value={ingredientsName}
                            onChange={(e) => setIngredientsName(e.target.value)}
                            placeholder="재료명"
                            style={{ flex: 1, padding: 8 }}
                        />
                        <input
                            type="text"
                            value={ingredientsLink}
                            onChange={(e) => setIngredientsLink(e.target.value)}
                            placeholder="구매 링크(선택)"
                            style={{ flex: 2, padding: 8 }}
                        />
                        <button type="button" onClick={addIngredient}>
                            추가
                        </button>
                    </div>
                    {ingredientsList.length > 0 && (
                        <ul style={{ marginTop: 8 }}>
                            {ingredientsList.map((it, i) => (
                                <li key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
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

                {/* 시간/도구/가격 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                        <label>소요 시간(분)</label>
                        <input
                            type="number"
                            value={cookingTimeMinutes}
                            onChange={(e) => setCookingTimeMinutes(e.target.value)}
                            style={{ width: "100%", padding: 8 }}
                            min={0}
                        />
                    </div>
                    <div>
                        <label>조리 도구</label>
                        <input
                            type="text"
                            value={tools}
                            onChange={(e) => setTools(e.target.value)}
                            style={{ width: "100%", padding: 8 }}
                            placeholder="예) 국자, 후라이팬"
                        />
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                        <label>총 예상 가격(원)</label>
                        <input
                            type="number"
                            value={estimatedPrice}
                            onChange={(e) => setEstimatedPrice(e.target.value)}
                            style={{ width: "100%", padding: 8 }}
                            min={0}
                        />
                    </div>
                    <div>
                        <label>조리 설명(한 줄)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{ width: "100%", padding: 8 }}
                            placeholder="예) 센 불에서 3분간 볶기"
                        />
                    </div>
                </div>

                {/* 본문(추가 설명) */}
                <div>
                    <label>추가 설명</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={5}
                        style={{ width: "100%", padding: 8 }}
                        placeholder="레시피 팁, 주의사항 등을 적어주세요."
                    />
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
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))", gap: 8, marginTop: 8 }}>
                            {stepPreviews.map((url, i) => (
                                <div key={i} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8 }}>
                                    <img src={url} alt={`step-${i + 1}`} style={{ width: "100%", height: 100, objectFit: "cover" }} />
                                    <input
                                        type="text"
                                        value={stepCaptions[i] ?? ""}
                                        onChange={(e) => updateCaption(i, e.target.value)}
                                        placeholder={`스텝 ${i + 1} 캡션(선택)`}
                                        style={{ width: "100%", padding: 6, marginTop: 6 }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 제출 */}
                <div style={{ marginTop: 12 }}>
                    <button type="button" onClick={handleSubmit} style={{ width: "100%", padding: 12, fontWeight: 600 }}>
                        등록하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostCreate;
