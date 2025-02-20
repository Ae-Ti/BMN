import React from "react";

const categories = ["맞춤레시피", "초스피드", "최신", "요리고수", "가성비"];

const RecipeCategoryTabs = () => {
  return (
    <div className="recipe-tabs">
      {categories.map((category) => (
        <button key={category} className="tab-button">
          {category}
        </button>
      ))}
    </div>
  );
};

export default RecipeCategoryTabs;
