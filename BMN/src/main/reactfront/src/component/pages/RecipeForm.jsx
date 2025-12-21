// src/component/pages/RecipeForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { API_BASE } from '../../config';
import { onImgError } from "../lib/placeholder";
import "./RecipeForm.css";

axios.defaults.baseURL = API_BASE;

// ✅ 이미지 리사이징 헬퍼
async function resizeImage(file, options) {
    const { maxWidth, maxHeight, quality } = options;
    return new Promise((resolve, reject) => {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement("canvas");
            let { width, height } = img;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error("Canvas is empty"));
                        return;
                    }
                    resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
                },
                "image/jpeg",
                quality
            );
        };
        img.onerror = (err) => reject(err);
    });
}


export default function RecipeForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [tools, setTools] = useState("");
    const [cookingTimeMinutes, setCookingTimeMinutes] = useState("");
    const [estimatedPrice, setEstimatedPrice] = useState("");

    const [thumbnail, setThumbnail] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);

    const [ingredients, setIngredients] = useState([]);

    const [existingSteps, setExistingSteps] = useState([]);
    const [removeStepIds, setRemoveStepIds] = useState([]);

    // 새 스텝: { file, description, previewUrl }
    const [newSteps, setNewSteps] = useState([{ file: null, description: "", previewUrl: null }]);

    const serverThumbUrl = useMemo(() => (isEdit ? thumbnailPreview || null : null), [isEdit, thumbnailPreview]);

    useEffect(() => {
        if (!isEdit) return;
        const token = localStorage.getItem("token");
        axios
            .get(`/recipe/api/${id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            .then((res) => {
                const r = res.data;
                setSubject(r.subject ?? "");
                setDescription(r.description ?? "");
                setTools(r.tools ?? "");
                setCookingTimeMinutes(r.cookingTimeMinutes ?? "");
                setEstimatedPrice(r.estimatedPrice ?? "");
                setIngredients(Array.isArray(r.ingredientRows) ? r.ingredientRows : []);
                setExistingSteps(Array.isArray(r.stepImages) ? r.stepImages : []);

                if (r.thumbnailUrl) setThumbnailPreview(r.thumbnailUrl);
            })
            .catch((err) => {
                console.error(err);
                alert("레시피 불러오기 실패");
            });
    }, [id, isEdit]);

    async function handleThumbChange(e) {
        const f = e.target.files?.[0] || null;
        if (thumbnailPreview && thumbnailPreview.startsWith("blob:")) {
            URL.revokeObjectURL(thumbnailPreview);
        }
        if (f) {
            try {
                const resizedFile = await resizeImage(f, { maxWidth: 500, maxHeight: 500, quality: 0.8 });
                setThumbnail(resizedFile);
                setThumbnailPreview(URL.createObjectURL(resizedFile));
            } catch (error) {
                console.error("Thumbnail resize failed:", error);
                setThumbnail(f); // fallback to original
                setThumbnailPreview(URL.createObjectURL(f));
            }
        } else {
            setThumbnail(null);
            setThumbnailPreview(null);
        }
    }

    const addIngredient = () => setIngredients([...ingredients, { name: "", link: "" }]);
    const updateIngredient = (idx, field, value) => {
        const copy = [...ingredients];
        copy[idx][field] = value;
        setIngredients(copy);
    };
    const removeIngredient = (idx) => {
        const copy = [...ingredients];
        copy.splice(idx, 1);
        setIngredients(copy);
    };

    const addNewStep = () => setNewSteps([...newSteps, { file: null, description: "", previewUrl: null }]);
    const updateNewStep = async (idx, field, value) => {
        if (field === "file") {
            const file = value || null;
            let resizedFile = null;
            let previewUrl = null;

            if (file) {
                try {
                    resizedFile = await resizeImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 });
                    previewUrl = URL.createObjectURL(resizedFile);
                } catch (error) {
                    console.error(`Step ${idx} resize failed:`, error);
                    resizedFile = file; // fallback to original
                    previewUrl = URL.createObjectURL(file);
                }
            }

            setNewSteps(prevSteps =>
                prevSteps.map((step, i) => {
                    if (i !== idx) return step;
                    if (step.previewUrl && step.previewUrl.startsWith("blob:")) {
                        URL.revokeObjectURL(step.previewUrl);
                    }
                    return { ...step, file: resizedFile, previewUrl: previewUrl };
                })
            );
        } else {
            setNewSteps(prevSteps =>
                prevSteps.map((step, i) =>
                    i === idx ? { ...step, [field]: value } : step
                )
            );
        }
    };
    const removeNewStep = (idx) => {
        setNewSteps((prev) => {
            const copy = [...prev];
            const target = copy[idx];
            if (target?.previewUrl && target.previewUrl.startsWith("blob:")) {
                try { URL.revokeObjectURL(target.previewUrl); } catch {} 
            }
            copy.splice(idx, 1);
            return copy;
        });
    };

    const handleRemoveExistingStep = (stepId) => {
        if (!window.confirm("이 단계를 삭제하시겠습니까?")) return;
        setRemoveStepIds((prev) => [...prev, stepId]);
        setExistingSteps((prev) => prev.filter((s) => s.id !== stepId));
    };

    useEffect(() => {
        return () => {
            if (thumbnailPreview && thumbnailPreview.startsWith("blob:")) {
                try { URL.revokeObjectURL(thumbnailPreview); } catch {} 
            }
            newSteps.forEach((s) => {
                if (s.previewUrl && s.previewUrl.startsWith("blob:")) {
                    try { URL.revokeObjectURL(s.previewUrl); } catch {} 
                }
            });
        };
    }, [thumbnailPreview, newSteps]);

    async function handleSubmit(e) {
        e.preventDefault();
        const trimmedSubject = (subject || "").trim();
        const usableNewSteps = newSteps.filter((s) => (s.description || "").trim() !== "" || s.file);
        const remainingExistingCount = existingSteps.length;
        const totalStepCount = remainingExistingCount + usableNewSteps.length;

        if (!trimmedSubject) {
            alert("제목을 입력해주세요.");
            return;
        }
        if (totalStepCount < 1) {
            alert("요리 순서를 최소 1개 이상 입력해주세요.");
            return;
        }

        try {
            const fd = new FormData();
            fd.append("subject", trimmedSubject);
            fd.append("description", String(description ?? ""));
            fd.append("tools", String(tools ?? ""));
            fd.append("cookingTimeMinutes", String(cookingTimeMinutes ?? ""));
            fd.append("estimatedPrice", String(estimatedPrice ?? ""));

            if (thumbnail) fd.append("thumbnail", thumbnail);

            // 재료 JSON
            fd.append("ingredients", new Blob([JSON.stringify(ingredients ?? [])], { type: "application/json" }));

            // 파일 있는 새 스텝만 파일+캡션 함께
            usableNewSteps.forEach((s) => {
                if (s.file) {
                    fd.append("stepImages", s.file);
                }
                fd.append("captions", s.description || "");
            });

            // 삭제할 기존 스텝
            removeStepIds.forEach((sid) => fd.append("removeStepIds", String(sid)));

            const token = localStorage.getItem("token");
            const config = {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    "Content-Type": "multipart/form-data",
                },
            };

            if (isEdit) {
                await axios.put(`/recipe/${id}`, fd, config);
                alert("레시피가 수정되었습니다.");
            } else {
                await axios.post(`/recipe/create`, fd, config);
                alert("레시피가 등록되었습니다.");
            }
            navigate("/recipes");
        } catch (err) {
            console.error(err);
            alert("저장 실패");
        }
    }

    return (
        <div className="sx-4i"  >
            <h2>{isEdit ? "레시피 수정" : "새 레시피 작성"}</h2>
            <div className="separator"></div>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>제목</label>
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
                </div>

                <div>
                    <label>설명</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>

                <div>
                    <label>도구</label>
                    <textarea value={tools} onChange={(e) => setTools(e.target.value)} />
                </div>

                <div className="form-group-horizontal">
                    <div>
                        <label>조리 시간(분)</label>
                        <input
                            type="number"
                            value={cookingTimeMinutes}
                            onChange={(e) => setCookingTimeMinutes(e.target.value)}
                        />
                    </div>

                    <div>
                        <label>예상 비용(원)</label>
                        <input
                            type="number"
                            value={estimatedPrice}
                            onChange={(e) => setEstimatedPrice(e.target.value)}
                        />
                    </div>
                </div>

                {/* 썸네일 업로드 + 미리보기 */}
                <div className="sx-39"  >
                    <label>썸네일</label>
                    <input type="file" accept="image/*" onChange={handleThumbChange} />
                    {/* 썸네일 미리보기는 UI에서 숨깁니다 (업로드는 가능) */}
                </div>

                {/* 재료 */}
                <div className="sx-46 sx-4k"  >
                    <h3>재료</h3>
                    {ingredients.map((ing, idx) => (
                        <div key={idx} >
                            <input
                                placeholder="재료명"
                                value={ing.name ?? ""}
                                onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                                className="recipe-ingredient-input"
                            />
                            <input
                                placeholder="구매 링크"
                                value={ing.link ?? ""}
                                onChange={(e) => updateIngredient(idx, "link", e.target.value)}
                                className="recipe-ingredient-input"
                            />
                            <button type="button" onClick={() => removeIngredient(idx)} className="recipe-delete-button">삭제</button>
                        </div>
                    ))}
                    <button type="button" onClick={addIngredient} className="recipe-add-button">재료 추가</button>
                </div>


                {/* 새 스텝 */}
                <div className="sx-46 sx-4n"  >
                    <h3>요리 순서</h3>
                    {newSteps.map((s, idx) => (
                        <div key={idx} className="recipe-step-item">
                            <div className="recipe-step-controls">
                                <span>{idx + 1}. </span>
                                <input className="sx-4p recipe-ingredient-input"
                                    type="text"
                                    placeholder="요리 과정을 적어주세요."
                                    value={s.description}
                                    onChange={(e) => updateNewStep(idx, "description", e.target.value)}
                                />
                                <button type="button" onClick={() => removeNewStep(idx)} className="recipe-delete-button">삭제</button>
                            </div>
                            <div className="recipe-step-image-upload">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => updateNewStep(idx, "file", e.target.files?.[0] || null)}
                                />
                                {s.previewUrl && (
                                    <div className="sx-32">
                                        <img className="sx-4o"
                                            src={s.previewUrl}
                                            alt={`new-step-${idx}`}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={addNewStep} className="recipe-add-button">단계 추가</button>
                </div>

                {/* 기존 스텝 */}
                {isEdit && existingSteps.length > 0 && (
                    <div className="sx-46 sx-4l"  >
                        <h3>기존 단계</h3>
                        {existingSteps.map((s) => (
                            <div key={s.id} >
                                <div>
                                    <strong>Step {s.stepOrder ?? s.stepIndex}</strong> {s.description ?? s.caption}
                                </div>
                                {s.imageUrl && (
                                    <img className="sx-4m"
                                        src={s.imageUrl}
                                        alt="step"
                                         onError={onImgError}
                                    />
                                )}
                                <button type="button" onClick={() => handleRemoveExistingStep(s.id)} className="recipe-delete-button">삭제</button>
                            </div>
                        ))}
                    </div>
                )}

                <button className="sx-submit" type="submit"  >
                    {isEdit ? "수정 완료" : "레시피 등록"}
                </button>
            </form>
        </div>
    );
}