import React, {useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./recipeMain.css"; // 스타일 파일 추가
import axios from "axios";

axios.defaults.baseURL = "http://localhost:8080";


const RecipeMain = () => {

  const navigate = useNavigate();
  const [bestRecipes, setBestRecipes] = useState([]); // 베스트 레시피 리스트
  const [favoriteRecipes, setFavoriteRecipes] = useState([]); // 즐겨찾기 레시피 리스트
    const [userName, setUserName] = useState(""); // 사용자 이름 상태 추가

    // 로그인한 사용자 정보 가져오기
    useEffect(() => {
        axios.get("/user/info")
            .then((response) => {
                if (response.data && response.data.userName) {
                    setUserName(response.data.userName);
                } else {
                    console.error("잘못된 사용자 정보 데이터 형식:", response.data);
                }
            })
            .catch((error) => console.error("사용자 정보 가져오기 오류:", error));
    }, []);

    // 백엔드에서 데이터 가져오기 (GET 요청)
  useEffect(() => {
    axios.get("/recipe/data")
      .then((response) => {
        if (Array.isArray(response.data)) {
          setBestRecipes(response.data.slice(0, 4)); // 상위 4개만 사용
        } else {
          console.error("잘못된 베스트 레시피 데이터 형식:", response.data);
        }
      })
      .catch((error) => console.error("베스트 레시피 가져오기 오류:", error));
  }, []);


    // 즐겨찾기 레시피 데이터 가져오기 (userName이 설정된 후 실행)
    useEffect(() => {
        if (userName) {
            axios.get(`/favorite/data/${userName}`)
                .then((response) => {
                    if (Array.isArray(response.data)) {
                        setFavoriteRecipes(response.data.slice(0, 4));
                    } else {
                        console.error("잘못된 즐겨찾기 데이터 형식:", response.data);
                    }
                })
                .catch((error) => console.error("즐겨찾기 가져오기 오류:", error));
        }
    }, [userName]); // userName이 설정될 때만 실행


  const handleUploadClick = () => {
    navigate("/post-create");
  };

    console.log("즐겨찾기 레시피 데이터:", favoriteRecipes);

  // 예제 게시물 데이터 (베스트 레시피)

  return (
    <div className="recipe-main">
      
      {/* 베스트 레시피 섹션 */}
      <h2 className="title">베스트 레시피</h2>
      <div className="recipe-list">
        {bestRecipes.length > 0 ? (
          bestRecipes.map((recipe) => (
            <div key={recipe.id} className="recipe-card">
              <img src={recipe.image || "/images/default.jpg"} alt={recipe.subject} className="recipe-image" />
              <p className="recipe-title">{recipe.subject}</p>
            </div>
          ))
        ) : (
          <p>등록된 베스트 레시피가 없습니다.</p>
        )}
      </div>

      {/* 즐겨찾기 섹션 */}
      <h2 className="title">즐겨찾기</h2>
      <div className="recipe-list">
        {favoriteRecipes.length > 0 ? (
          favoriteRecipes.map((recipe) => (
            <div key={recipe.id} className="recipe-card">
              <img src={recipe.image || "/images/default.jpg"} alt={recipe.subject} className="recipe-image" />
              <p className="recipe-title">{recipe.subject}</p>
            </div>
          ))
        ) : (
          <p>즐겨찾기한 레시피가 없습니다.</p>
        )}
      </div>


      

      {/* ✅ 가로로 긴 타원형 '업로드' 버튼 */}
      <button
        onClick={handleUploadClick}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          backgroundColor: "#e7c555",
          color: "black",
          border: "none",
          height: "40px",
          width: "80px",// 가로로 긴 버튼
          fontSize: "16px",
          borderRadius: "25px", // 타원형 버튼
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
          cursor: "pointer",
        }}
      >
        업로드
      </button>
    
    </div>
  );
};

export default RecipeMain;
