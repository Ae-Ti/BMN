import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./postCreate.css"; // 스타일 파일 추가

const PostCreate = () => {
    const [content, setcontent] = useState("");
    const navigate = useNavigate();

    const [subject, setsubject] = useState("");
    const [thumbnail, setthumbnail] = useState(null);
    const [GetIngredients, setGetIngredients] = useState([]); // ✅ 수정됨
    const [ingredients, setIngredients] = useState(""); // ✅ 수정됨
    const [purchaseLink, setPurchaseLink] = useState("");
    const [cookingTimeMinutes, setCookingTimeMinutes] = useState("");
    const [description, setdescription] = useState("");
    const [tools, settools] = useState("");
    const [cookingSteps, setCookingSteps] = useState([]);
    const [estimatedPrice, setEstimatedPrice] = useState("");

    const cookingMethods = ["굽기", "삶기", "튀기기", "찌기", "볶기", "조리기"];
    const cookingTimes = ["10분", "20분", "30분", "40분", "50분", "60분"];

    const handlePhotoUpload = (e) => {
        setthumbnail(URL.createObjectURL(e.target.files[0]));
    };

    const addIngredient = () => {
        if (ingredients.trim()) { // ✅ 수정됨
            setGetIngredients([...GetIngredients, { name: ingredients, link: purchaseLink }]); // ✅ 수정됨
            setIngredients(""); // ✅ 수정됨
            setPurchaseLink("");
        }
    };

    const addCookingStep = (e) => {
        setCookingSteps([...cookingSteps, URL.createObjectURL(e.target.files[0])]);
    };

    // ✅ 등록하기 버튼 클릭 시 유효성 검사
    const handleSubmit = async () => {
        if (!subject) return alert("요리 이름을 입력하세요.");
        if (!thumbnail) return alert("대표 사진을 업로드하세요.");
        if (GetIngredients.length === 0) return alert("최소 하나 이상의 재료를 추가하세요.");
        if (!cookingTimeMinutes) return alert("소요 시간을 입력하세요.");
        if (!description) return alert("조리 방법을 선택하세요.");
        if (!tools) return alert("조리 도구를 입력하세요.");
        if (cookingSteps.length === 0) return alert("조리 순서를 최소 하나 이상 추가하세요.");
        if (!estimatedPrice) return alert("총 예상 가격을 입력하세요.");

        // ✅ FormData 객체 생성
        const formData = new FormData();
        formData.append("subject", subject);
        formData.append("thumbnail", document.querySelector('input[type="file"]').files[0]); // 대표 사진
        formData.append("cookingTimeMinutes", Number(cookingTimeMinutes)); // 숫자형으로 변환
        formData.append("description", description);
        formData.append("tools", tools);
        formData.append("estimatedPrice", Number(estimatedPrice));
        formData.append("content", content);

        // ✅ 재료 리스트 JSON으로 변환 후 추가
        formData.append("ingredients", JSON.stringify(GetIngredients));

        // ✅ 조리 순서 파일 여러 개 추가
        const cookingStepFiles = document.querySelector('input[accept="image/*,video/*"]').files;
        for (let i = 0; i < cookingStepFiles.length; i++) {
            formData.append("cookingSteps", cookingStepFiles[i]);
        }

        try {
            const response = await fetch("http://localhost:8080/recipe/create", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`, // 저장된 토큰 사용
                },
                body: formData,
            });

            if (!response.ok) throw new Error("업로드 실패");

            alert("등록 완료!");
            navigate("/");
        } catch (error) {
            console.error(error);
            alert("등록 중 오류가 발생했습니다.");
        }
    };


    return (
        <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
            <h2>게시글 작성</h2>

            {/* 요리 이름 */}
            <div style={{ marginBottom: "15px" }}>
                <label>요리 이름:</label>
                <input
                    type="text"
                    value={subject}
                    onChange={(e) => setsubject(e.target.value)}
                    placeholder="요리 이름을 입력하세요"
                    required
                    style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                />
            </div>

            {/* 대표 사진 */}
            <div style={{ marginBottom: "15px" }}>
                <label>대표 사진:</label>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ marginTop: "5px" }} />
                {thumbnail && <img src={thumbnail} alt="대표 사진" style={{ width: "100%", marginTop: "10px" }} />}
            </div>

            {/* 들어가는 재료 */}
            <div style={{ marginBottom: "15px" }}>
                <label>들어가는 재료:</label>
                <input
                    type="text"
                    value={ingredients} // ✅ 수정됨
                    onChange={(e) => setIngredients(e.target.value)} // ✅ 수정됨
                    placeholder="재료 이름"
                    style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                />
                <input
                    type="url"
                    value={purchaseLink}
                    onChange={(e) => setPurchaseLink(e.target.value)}
                    placeholder="구매 링크 (선택)"
                    style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                />
                <button onClick={addIngredient} style={{ marginTop: "5px", padding: "5px" }}>추가</button>
                <ul>
                    {GetIngredients.map((ingredient, index) => ( // ✅ 수정됨
                        <li key={index}>{ingredient.name} {ingredient.link && `(${ingredient.link})`}</li>
                    ))}
                </ul>
            </div>

            {/* 소요 시간 (숫자 입력 + '분' 표시) */}
            <div style={{ marginBottom: "15px" }}>
                <label>소요 시간:</label>
                <div style={{ display: "flex", alignItems: "center", marginTop: "5px" }}>
                    <input
                        type="number"
                        value={cookingTimeMinutes}
                        onChange={(e) => setCookingTimeMinutes(e.target.value)}
                        placeholder="시간 (숫자만)"
                        style={{ width: "100%", padding: "8px" }}
                    />
                    <span style={{ marginLeft: "8px" }}>분</span>
                </div>
            </div>

            {/* 조리 방법 (드롭다운) */}
            <div style={{ marginBottom: "15px" }}>
                <label>조리 방법:</label>
                <select value={description} onChange={(e) => setdescription(e.target.value)} style={{ width: "100%", padding: "8px", marginTop: "5px" }}>
                    <option value="">방법 선택</option>
                    {cookingMethods.map((method, index) => (
                        <option key={index} value={method}>{method}</option>
                    ))}
                </select>
            </div>

            {/* 조리 도구 */}
            <div style={{ marginBottom: "15px" }}>
                <label>조리 도구:</label>
                <input
                    type="text"
                    value={tools}
                    onChange={(e) => settools(e.target.value)}
                    placeholder="조리 도구 입력"
                    style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                />
            </div>

            {/* 조리 순서 (사진/영상 업로드) */}
            <div style={{ marginBottom: "15px" }}>
                <label>조리 순서:</label>
                <input type="file" accept="image/*,video/*" onChange={addCookingStep} style={{ marginTop: "5px" }} multiple />
                <ul>
                    {cookingSteps.map((step, index) => (
                        <li key={index}>
                            <img src={step} alt={`조리 과정 ${index + 1}`} style={{ width: "100px", marginTop: "5px" }} />
                        </li>
                    ))}
                </ul>
            </div>

            {/* 총 예상 가격 */}
            <div style={{ marginBottom: "15px" }}>
                <label>총 예상 가격:</label>
                <input
                    type="number"
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(e.target.value)}
                    placeholder="총 예상 가격 입력"
                    style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                />
            </div>

            <div className="post-create-container">
                <h2>게시글 작성</h2>

                {/* ✅ 추가 설명 입력 칸 */}
                <div className="form-group">
                    <label htmlFor="content">추가 설명</label>
                    <textarea
                        id="content"
                        name="content"
                        rows="4"
                        placeholder="레시피에 대한 추가적인 설명을 입력하세요."
                        value={content}
                        onChange={(e) => setcontent(e.target.value)}
                    ></textarea>
                </div>
            </div>

            {/* 등록하기 버튼 */}
            <button onClick={handleSubmit} style={{ width: "100%", padding: "10px", backgroundColor: "#eed3a2", color: "black", fontSize: "16px" }}>
                등록하기
            </button>
        </div>
    );
};

export default PostCreate;