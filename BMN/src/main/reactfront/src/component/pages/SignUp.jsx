import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const SignUp = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        username: "",
        nickname: "",
        birthYear: "",
        birthMonth: "",
        birthDay: "",
        gender: "",
        password: "",
        confirmPassword: "",
        email: "",
        introduction: "",
    });
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
        // clear field-specific error when user edits that field
        setFieldErrors(prev => {
            const copy = { ...prev };
            const key = String(name).toLowerCase();
            if (copy[key]) delete copy[key];
            return copy;
        });

        if (name === "password") {
            checkPasswordStrength(value);
        }

        if (name === "confirmPassword") {
            setPasswordError(value !== form.password ? "비밀번호와 일치하지 않습니다." : "");
        }
    };

    const checkPasswordStrength = (password) => {
        let strength = "";
        if (password.length >= 8) {
            const hasUpperCase = /[A-Z]/.test(password);
            const hasLowerCase = /[a-z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            const hasSpecialChar = /[~!@#$%^&*]/.test(password);

            const strengthCount = hasUpperCase + hasLowerCase + hasNumber + hasSpecialChar;

            if (strengthCount === 4) {
                strength = "강함";
            } else if (strengthCount === 3) {
                strength = "보통";
            } else {
                strength = "약함";
            }
        } else {
            strength = "너무 짧음";
        }
        setPasswordStrength(strength);
    };

    const togglePasswordVisibility = () => {
        setPasswordVisible(!passwordVisible);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (passwordError) {
            alert("비밀번호가 일치하지 않습니다.");
            return;
        }
        if (passwordStrength === "약함" || passwordStrength === "너무 짧음") {
            alert("비밀번호를 더 강력하게 설정하세요!");
            return;
        }

        const userData = {
            userName: form.username,
            email: form.email,
            password1: form.password,
            password2: form.confirmPassword,
            introduction: form.introduction || "",
            nickname: form.nickname,
            birthYear: form.birthYear ? Number(form.birthYear) : null,
            birthMonth: form.birthMonth ? Number(form.birthMonth) : null,
            birthDay: form.birthDay ? Number(form.birthDay) : null,
            sex: form.gender,
        };

        const extractMessage = (payload) => {
            if (!payload) return { message: null, fieldErrors: {} };
            // If payload is a simple string
            if (typeof payload === "string") return { message: payload, fieldErrors: {} };

            // If payload is an object, try to extract structured field errors
            if (typeof payload === "object") {
                // common shapes: { message: '...', errors: { field: [...] } }
                const fieldErrors = {};
                let general = null;

                if (payload.message) general = payload.message;
                if (payload.error) general = general || payload.error;

                const candidate = payload.errors || payload.fieldErrors || payload.field_error || payload;

                if (candidate && typeof candidate === 'object') {
                    // candidate may be mapping of field->string or array
                    Object.entries(candidate).forEach(([k, v]) => {
                        if (!k) return;
                        const key = String(k).toLowerCase();
                        if (Array.isArray(v)) fieldErrors[key] = v.join(' / ');
                        else if (typeof v === 'string') fieldErrors[key] = v;
                        else fieldErrors[key] = JSON.stringify(v);
                    });
                }

                // If no field errors found but object has simple keys we can surface
                if (Object.keys(fieldErrors).length === 0) {
                    // try top-level simple values
                    const vals = Object.values(payload).filter(v => v !== null && v !== undefined && (typeof v === 'string' || Array.isArray(v)));
                    if (vals.length > 0 && !general) {
                        general = vals.map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join(' / ');
                    }
                }

                return { message: general, fieldErrors };
            }

            return { message: String(payload), fieldErrors: {} };
        };

        try {
            setSubmitting(true);
            const response = await axios.post("/user/signup", userData);
            const { message } = extractMessage(response.data);
            const msg = message || "회원가입이 성공적으로 완료되었습니다.";
            setSuccessMessage(msg);
            setErrorMessage("");
            setFieldErrors({});
            // Navigate immediately to verify instructions (removed artificial delay)
            navigate(`/verify-instructions?email=${encodeURIComponent(form.email)}`);
        } catch (error) {
            const serverPayload = error.response?.data;
            const { message, fieldErrors: srvFields } = extractMessage(serverPayload) || {};
            const general = message || error.message || "회원가입 실패";
            setErrorMessage(general);
            setSuccessMessage("");
            // normalize keys to lowercase for easy lookup
            const normalized = {};
            if (srvFields && typeof srvFields === 'object') {
                Object.entries(srvFields).forEach(([k, v]) => {
                    normalized[String(k).toLowerCase()] = v;
                });
            }
            setFieldErrors(normalized);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="signup-container">
            <form className="signup-box" onSubmit={handleSubmit}>
                <h2>회원가입</h2>

                <input type="text" name="username" placeholder="아이디" value={form.username} onChange={handleChange} required />
                { (fieldErrors.username || fieldErrors.username?.length) && <p className="field-error">{fieldErrors.username || fieldErrors.username}</p> }
                <input type="text" name="nickname" placeholder="닉네임" value={form.nickname} onChange={handleChange} required />
                { (fieldErrors.nickname || fieldErrors.nickname?.length) && <p className="field-error">{fieldErrors.nickname || fieldErrors.nickname}</p> }

                <label className="label-title">생년월일</label>
                <div className="row">
                    <select name="birthYear" value={form.birthYear} onChange={handleChange} required>
                        <option value="">년</option>
                        {[...Array(80)].map((_, i) => (
                            <option key={i} value={2024 - i}>
                                {2024 - i}
                            </option>
                        ))}
                    </select>
                    <select name="birthMonth" value={form.birthMonth} onChange={handleChange} required>
                        <option value="">월</option>
                        {[...Array(12)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {i + 1}
                            </option>
                        ))}
                    </select>
                    <select name="birthDay" value={form.birthDay} onChange={handleChange} required>
                        <option value="">일</option>
                        {[...Array(31)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {i + 1}
                            </option>
                        ))}
                    </select>
                </div>

                <label className="label-title">성별</label>
                <select name="gender" value={form.gender} onChange={handleChange} required>
                    <option value="">성별</option>
                    <option value="남">남</option>
                    <option value="여">여</option>
                </select>

                <div className="password-box">
                    <input type={passwordVisible ? "text" : "password"} name="password" placeholder="비밀번호" value={form.password} onChange={handleChange} required />
                    <span className="eye-icon" onClick={togglePasswordVisibility}>👁</span>
                </div>
                { fieldErrors.password && <p className="field-error">{fieldErrors.password}</p> }
                <p className={`password-strength ${passwordStrength}`}>{passwordStrength}</p>

                <div className="password-box">
                    <input type={passwordVisible ? "text" : "password"} name="confirmPassword" placeholder="비밀번호 확인" value={form.confirmPassword} onChange={handleChange} required />
                    <span className="eye-icon" onClick={togglePasswordVisibility}>👁</span>
                </div>
                { fieldErrors.confirmpassword && <p className="field-error">{fieldErrors.confirmpassword}</p> }
                {passwordError && <p className="password-error">{passwordError}</p>}

                <input type="email" name="email" placeholder="이메일" value={form.email} onChange={handleChange} required />
                { fieldErrors.email && <p className="field-error">{fieldErrors.email}</p> }

                <label className="label-title">자기소개 (선택)</label>
                <textarea 
                    name="introduction" 
                    placeholder="간단한 자기소개를 작성해주세요 (선택사항)" 
                    value={form.introduction} 
                    onChange={handleChange} 
                    rows="3"
                />
                { fieldErrors.introduction && <p className="field-error">{fieldErrors.introduction}</p> }

                <button type="submit" disabled={submitting}>가입하기</button>
                {submitting && !errorMessage && Object.keys(fieldErrors).length === 0 && (
                    <p className="info-message">잠시만 기다려주세요!</p>
                )}
                {errorMessage && <p className="error-message">{errorMessage}</p>}
                {successMessage && <p className="success-message">{successMessage}</p>}
            </form>
        </div>
    );
};

export default SignUp;
