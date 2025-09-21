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
    const [content, setContent] = useState("");
    const [cookingTimeMinutes, setCookingTimeMinutes] = useState("");
    const [estimatedPrice, setEstimatedPrice] = useState("");

    // 썸네일 파일 + 미리보기
    const [thumbnail, setThumbnail] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null); // string(url)

    // 재료
    const [ingredients, setIngredients] = useState([]);

    // 기존 스텝
    const [existingSteps, setExistingSteps] = useState([]);
    const [removeStepIds, setRemoveStepIds] = useState([]);

    // 새 스텝: { file, description, previewUrl }
    const [newSteps, setNewSteps] = useState([{ file: null, description: "", previewUrl: null }]);

    // 현재 레시피 썸네일(수정 모드에서 서버 이미지)
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
                setContent(r.content ?? "");
                setCookingTimeMinutes(r.cookingTimeMinutes ?? "");
                setEstimatedPrice(r.estimatedPrice ?? "");
                setIngredients(Array.isArray(r.ingredientRows) ? r.ingredientRows : []);
                setExistingSteps(Array.isArray(r.stepImages) ? r.stepImages : []);

                // 서버 썸네일 미리보기
                if (r.thumbnailUrl) {
                    setThumbnailPreview(r.thumbnailUrl);
                }
            })
            .catch((err) => {
                console.error(err);
                alert("레시피 불러오기 실패");
            });
    }, [id, isEdit]);

    // 썸네일 선택 -> 미리보기 생성
    function handleThumbChange(e) {
        const f = e.target.files?.[0] || null;
        if (thumbnailPreview && thumbnailPreview.startsWith("blob:")) {
            URL.revokeObjectURL(thumbnailPreview);
        }
        setThumbnail(f);
        setThumbnailPreview(f ? URL.createObjectURL(f) : null);
    }

    // 재료
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

    // 새 스텝
    const addNewStep = () => setNewSteps([...newSteps, { file: null, description: "", previewUrl: null }]);

    const updateNewStep = (idx, field, value) => {
        setNewSteps((prev) => {
            const copy = [...prev];
            if (field === "file") {
                // 기존 URL revoke
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

    // 기존 스텝 삭제
    const handleRemoveExistingStep = (stepId) => {
        if (!window.confirm("이 단계를 삭제하시겠습니까?")) return;
        setRemoveStepIds((prev) => [...prev, stepId]);
        setExistingSteps((prev) => prev.filter((s) => s.id !== stepId));
    };

    // 언마운트 시 blob URL 정리
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
            fd.append("content", String(content ?? ""));
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
        <div style={{ maxWidth: 800, margin: "32px auto", padding: "0 16px" }}>
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
                    <label>본문</label>
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} />
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
                <div style={{ marginTop: 12 }}>
                    <label>썸네일</label>
                    <input type="file" accept="image/*" onChange={handleThumbChange} />
                    {thumbnailPreview && (
                        <div style={{ marginTop: 8 }}>
                            <img
                                src={thumbnailPreview}
                                alt="thumbnail-preview"
                                style={{ width: 240, height: 180, objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }}
                                onError={onImgError}
                            />
                        </div>
                    )}
                </div>

                {/* 재료 */}
                <div style={{ marginTop: 16 }}>
                    <h3>재료</h3>
                    {ingredients.map((ing, idx) => (
                        <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
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
                    <div style={{ marginTop: 16 }}>
                        <h3>기존 단계</h3>
                        {existingSteps.map((s) => (
                            <div key={s.id} style={{ marginBottom: 12 }}>
                                <div>
                                    <strong>Step {s.stepOrder ?? s.stepIndex}</strong> {s.description ?? s.caption}
                                </div>
                                {s.imageUrl && (
                                    <img
                                        src={s.imageUrl}
                                        alt="step"
                                        style={{ width: 200, borderRadius: 8 }}
                                        onError={onImgError}
                                    />
                                )}
                                <button type="button" onClick={() => handleRemoveExistingStep(s.id)}>삭제</button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 새 스텝 (파일 선택 시 미리보기) */}
                <div style={{ marginTop: 16 }}>
                    <h3>새 단계 추가</h3>
                    {newSteps.map((s, idx) => (
                        <div key={idx} style={{ marginBottom: 12, border: "1px solid #eee", padding: 8, borderRadius: 8 }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => updateNewStep(idx, "file", e.target.files?.[0] || null)}
                            />
                            {s.previewUrl && (
                                <div style={{ marginTop: 8 }}>
                                    <img
                                        src={s.previewUrl}
                                        alt={`new-step-${idx}`}
                                        style={{ width: 240, height: 160, objectFit: "cover", borderRadius: 6, border: "1px solid #eee" }}
                                    />
                                </div>
                            )}
                            <input
                                type="text"
                                placeholder="설명"
                                value={s.description}
                                onChange={(e) => updateNewStep(idx, "description", e.target.value)}
                                style={{ width: "100%", marginTop: 8 }}
                            />
                            <button type="button" onClick={() => removeNewStep(idx)} style={{ marginTop: 6 }}>삭제</button>
                        </div>
                    ))}
                    <button type="button" onClick={addNewStep}>단계 추가</button>
                </div>

                <button type="submit" style={{ marginTop: 16 }}>
                    {isEdit ? "수정 완료" : "등록"}
                </button>
            </form>
        </div>
    );
}