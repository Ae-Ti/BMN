import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./postCreate.css"; // 스타일 파일 추가

const PostCreate = () => {
  const [extraDescription, setExtraDescription] = useState("");
  const navigate = useNavigate();

  const [recipeName, setRecipeName] = useState("");
  const [photo, setPhoto] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState("");
  const [purchaseLink, setPurchaseLink] = useState("");
  const [cookingTime, setCookingTime] = useState("");
  const [cookingMethod, setCookingMethod] = useState("");
  const [cookingTools, setCookingTools] = useState("");
  const [cookingSteps, setCookingSteps] = useState([]);
  const [estimatedPrice, setEstimatedPrice] = useState("");

  const cookingMethods = ["굽기", "삶기", "튀기기", "찌기", "볶기", "조리기"];
  const cookingTimes = ["10분", "20분", "30분", "40분", "50분", "60분"];

  const handlePhotoUpload = (e) => {
    setPhoto(URL.createObjectURL(e.target.files[0]));
  };

  const addIngredient = () => {
    if (newIngredient.trim()) {
      setIngredients([...ingredients, { name: newIngredient, link: purchaseLink }]);
      setNewIngredient("");
      setPurchaseLink("");
    }
  };

  const addCookingStep = (e) => {
    setCookingSteps([...cookingSteps, URL.createObjectURL(e.target.files[0])]);
  };



  // ✅ 등록하기 버튼 클릭 시 유효성 검사
  const handleSubmit = () => {
    if (!recipeName) return alert("요리 이름을 입력하세요.");
    if (!photo) return alert("대표 사진을 업로드하세요.");
    if (ingredients.length === 0) return alert("최소 하나 이상의 재료를 추가하세요.");
    if (!cookingTime) return alert("소요 시간을 선택하세요.");
    if (!cookingMethod) return alert("조리 방법을 선택하세요.");
    if (!cookingTools) return alert("조리 도구를 입력하세요.");
    if (cookingSteps.length === 0) return alert("조리 순서를 최소 하나 이상 추가하세요.");
    if (!estimatedPrice) return alert("총 예상 가격을 입력하세요.");

    // ✅ 모든 조건이 충족되면 등록 완료 후 RecipeMain 페이지로 이동
    alert("등록 완료!");
    navigate("/");
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h2>게시글 작성</h2>

      {/* 요리 이름 */}
      <div style={{ marginBottom: "15px" }}>
        <label>요리 이름:</label>
        <input
          type="text"
          value={recipeName}
          onChange={(e) => setRecipeName(e.target.value)}
          placeholder="요리 이름을 입력하세요"
          required
          style={{ width: "100%", padding: "8px", marginTop: "5px" }}
        />
      </div>

      {/* 대표 사진 */}
      <div style={{ marginBottom: "15px" }}>
        <label>대표 사진:</label>
        <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ marginTop: "5px" }} />
        {photo && <img src={photo} alt="대표 사진" style={{ width: "100%", marginTop: "10px" }} />}
      </div>

      {/* 들어가는 재료 */}
      <div style={{ marginBottom: "15px" }}>
        <label>들어가는 재료:</label>
        <input
          type="text"
          value={newIngredient}
          onChange={(e) => setNewIngredient(e.target.value)}
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
          {ingredients.map((ingredient, index) => (
            <li key={index}>{ingredient.name} {ingredient.link && `(${ingredient.link})`}</li>
          ))}
        </ul>
      </div>

      {/* 소요 시간 (드롭다운) */}
      <div style={{ marginBottom: "15px" }}>
        <label>소요 시간:</label>
        <select value={cookingTime} onChange={(e) => setCookingTime(e.target.value)} style={{ width: "100%", padding: "8px", marginTop: "5px" }}>
          <option value="">시간 선택</option>
          {cookingTimes.map((time, index) => (
            <option key={index} value={time}>{time}</option>
          ))}
        </select>
      </div>

      {/* 조리 방법 (드롭다운) */}
      <div style={{ marginBottom: "15px" }}>
        <label>조리 방법:</label>
        <select value={cookingMethod} onChange={(e) => setCookingMethod(e.target.value)} style={{ width: "100%", padding: "8px", marginTop: "5px" }}>
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
          value={cookingTools}
          onChange={(e) => setCookingTools(e.target.value)}
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
        <label htmlFor="extraDescription">추가 설명</label>
        <textarea
          id="extraDescription"
          name="extraDescription"
          rows="4"
          placeholder="레시피에 대한 추가적인 설명을 입력하세요."
          value={extraDescription}
          onChange={(e) => setExtraDescription(e.target.value)}
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
