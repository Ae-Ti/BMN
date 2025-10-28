// src/component/pages/RecipeForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { onImgError } from "../lib/placeholder";

axios.defaults.baseURL = "http://localhost:8080";

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

    function handleThumbChange(e) {
        const f = e.target.files?.[0] || null;
        if (thumbnailPreview && thumbnailPreview.startsWith("blob:")) {
            URL.revokeObjectURL(thumbnailPreview);
        }
        setThumbnail(f);
        setThumbnailPreview(f ? URL.createObjectURL(f) : null);
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
    const updateNewStep = (idx, field, value) => {
        setNewSteps((prev) => {
            const copy = [...prev];
            if (field === "file") {
                if (copy[idx].previewUrl && copy[idx].previewUrl.startsWith("blob:")) {
                    try { URL.revokeObjectURL(copy[idx].previewUrl); } catch {}
                }
                const file = value || null;
                copy[idx].file = file;
                copy[idx].previewUrl = file ? URL.createObjectURL(file) : null;
            } else {
                copy[idx][field] = value;
            }
            return copy;
        });
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
        try {
            const fd = new FormData();
            fd.append("subject", String(subject ?? ""));
            fd.append("description", String(description ?? ""));
            fd.append("tools", String(tools ?? ""));
            fd.append("cookingTimeMinutes", String(cookingTimeMinutes ?? ""));
            fd.append("estimatedPrice", String(estimatedPrice ?? ""));

            if (thumbnail) fd.append("thumbnail", thumbnail);

            // 재료 JSON
            fd.append("ingredients", new Blob([JSON.stringify(ingredients ?? [])], { type: "application/json" }));

            // 파일 있는 새 스텝만 파일+캡션 함께
            newSteps.forEach((s) => {
                if (s.file) {
                    fd.append("stepImages", s.file);
                    fd.append("captions", s.description || "");
                }
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

                {/* 썸네일 업로드 + 미리보기 */}
                <div className="sx-39"  >
                    <label>썸네일</label>
                    <input type="file" accept="image/*" onChange={handleThumbChange} />
                    {thumbnailPreview && (
                        <div className="sx-32 sx-4j"  >
                            <img
                                src={thumbnailPreview}
                                alt="thumbnail-preview"
                                onError={onImgError}
                            />
                        </div>
                    )}
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
                            />
                            <input
                                placeholder="구매 링크"
                                value={ing.link ?? ""}
                                onChange={(e) => updateIngredient(idx, "link", e.target.value)}
                            />
                            <button type="button" onClick={() => removeIngredient(idx)}>삭제</button>
                        </div>
                    ))}
                    <button type="button" onClick={addIngredient}>재료 추가</button>
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
                                <button type="button" onClick={() => handleRemoveExistingStep(s.id)}>삭제</button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 새 스텝 */}
                <div className="sx-46 sx-4n"  >
                    <h3>새 단계 추가</h3>
                    {newSteps.map((s, idx) => (
                        <div key={idx} >
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => updateNewStep(idx, "file", e.target.files?.[0] || null)}
                            />
                            {s.previewUrl && (
                                <div className="sx-32"  >
                                    <img className="sx-4o"
                                        src={s.previewUrl}
                                        alt={`new-step-${idx}`}
                                         />
                                </div>
                            )}
                            <input className="sx-4p"
                                type="text"
                                placeholder="설명"
                                value={s.description}
                                onChange={(e) => updateNewStep(idx, "description", e.target.value)}
                                 />
                            <button className="sx-3f" type="button" onClick={() => removeNewStep(idx)}  >삭제</button>
                        </div>
                    ))}
                    <button type="button" onClick={addNewStep}>단계 추가</button>
                </div>

                <button className="sx-46" type="submit"  >
                    {isEdit ? "수정 완료" : "등록"}
                </button>
            </form>
        </div>
    );
}