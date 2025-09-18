import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { onImgError } from "../lib/placeholder";

// axios.defaults.baseURL = "http://localhost:8080";

export default function RecipeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [recipe, setRecipe] = useState(null);
    const [err, setErr] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        const token = localStorage.getItem("token");

        setLoading(true);
        axios
            .get(`/recipe/api/${id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                withCredentials: true,
            })
            .then((res) => {
                if (!alive) return;
                setRecipe(res.data);
            })
            .catch((e) => {
                if (!alive) return;
                setErr(e.response?.data?.message || e.message);
            })
            .finally(() => {
                if (!alive) return;
                setLoading(false);
            });

        return () => {
            alive = false;
        };
    }, [id]);

    const steps = useMemo(() => {
        const arr = recipe?.stepImages ?? [];
        return [...arr].sort((a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0));
    }, [recipe]);

    if (loading) return <div style={{ maxWidth: 920, margin: "32px auto" }}>불러오는 중…</div>;
    if (err) return <div style={{ maxWidth: 920, margin: "32px auto" }}>에러: {String(err)}</div>;
    if (!recipe) return null;

    const thumbSrc =
        recipe.thumbnailUrl || (recipe.id ? `http://localhost:8080/recipe/thumbnail/${recipe.id}` : undefined);

    return (
        <div style={{ maxWidth: 920, margin: "32px auto", padding: "0 16px" }}>
            <Link to="/recipes" style={{ textDecoration: "none" }}>
                ← 목록으로
            </Link>

            <Link
                to="/ingredient"
                state={{
                    cost: recipe.estimatedPrice,         // 예상비용 전달
                    ingredients: recipe.ingredientList,  // 재료 리스트 (API에서 받아온 배열)
                }}
                style={{
                    position: "fixed",
                    bottom: "20px",
                    right: "20px",
                    background: "#007bff",
                    color: "#fff",
                    padding: "10px 20px",
                    borderRadius: "50px",
                    textDecoration: "none"
                }}
            >
                담기
            </Link>

            <h1 style={{ margin: "8px 0 12px" }}>{recipe.subject ?? "(제목 없음)"}</h1>

            <div style={{ color: "#666", marginBottom: 16 }}>
                {recipe.cookingTimeMinutes ? <>조리시간 {recipe.cookingTimeMinutes}분</> : null}
                {recipe.cookingTimeMinutes && recipe.estimatedPrice ? " · " : null}
                {recipe.estimatedPrice ? <>예상비용 {recipe.estimatedPrice}원</> : null}
            </div>

            {thumbSrc && (
                <img
                    src={thumbSrc}
                    alt="thumbnail"
                    style={{ width: "100%", maxWidth: 860, borderRadius: 12, display: "block", marginBottom: 16 }}
                    loading="lazy"
                    onError={onImgError}
                />
            )}x

            {recipe.description && (
                <>
                    <h3 style={{ marginTop: 16 }}>설명</h3>
                    <p style={{ lineHeight: 1.7 }}>{recipe.description}</p>
                </>
            )}

            {recipe.ingredients && recipe.ingredients.trim() && (
                <>
                    <h3>재료</h3>
                    <p style={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>{recipe.ingredients}</p>
                </>
            )}

            {recipe.tools && recipe.tools.trim() && (
                <>
                    <h3>도구</h3>
                    <p style={{ whiteSpace: "pre-line" }}>{recipe.tools}</p>
                </>
            )}

            {steps.length > 0 && (
                <>
                    <h3>조리 단계</h3>
                    <ol style={{ paddingLeft: 20 }}>
                        {steps.map((s, idx) => {
                            const src = s.imageUrl || (s.imageBase64 ? `data:image/jpeg;base64,${s.imageBase64}` : undefined);
                            return (
                                <li key={`${s.stepOrder}-${idx}`} style={{ marginBottom: 24 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Step {s.stepOrder ?? idx + 1}</div>
                                    {s.description && <div style={{ marginBottom: 8 }}>{s.description}</div>}
                                    {src && (
                                        <img
                                            src={src}
                                            alt={`step-${s.stepOrder ?? idx + 1}`}
                                            style={{ width: "100%", maxWidth: 860, borderRadius: 12, display: "block" }}
                                            loading="lazy"
                                            onError={onImgError}
                                        />
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                </>
            )}
        </div>
    );
}