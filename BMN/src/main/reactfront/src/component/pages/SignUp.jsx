import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SignUp.css";

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
  });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passwordError) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (passwordStrength === "약함" || passwordStrength === "너무 짧음") {
      alert("비밀번호를 더 강력하게 설정하세요!");
      return;
    }
    alert("회원가입 성공!");
    navigate("/recipe-main");
  };

  return (
    <div className="signup-container">
        <form className="signup-box" onSubmit={handleSubmit}>
            <h2>회원가입</h2>

            {/* 아이디 & 닉네임을 세로 배치 */}
            <input type="text" name="username" placeholder="아이디" value={form.username} onChange={handleChange} required />
            <input type="text" name="nickname" placeholder="닉네임" value={form.nickname} onChange={handleChange} required />

            {/* 생년월일 가로 배치 */}
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

            {/* 성별 선택 */}
            <label className="label-title">성별</label>
            <select name="gender" value={form.gender} onChange={handleChange} required>
            <option value="">성별</option>
            <option value="남">남</option>
            <option value="여">여</option>
            </select>

            {/* 비밀번호 */}
            <div className="password-box">
            <input type={passwordVisible ? "text" : "password"} name="password" placeholder="비밀번호" value={form.password} onChange={handleChange} required />
            <span className="eye-icon" onClick={togglePasswordVisibility}>👁</span>
            </div>
            <p className={`password-strength ${passwordStrength}`}>{passwordStrength}</p>

            {/* 비밀번호 확인 */}
            <div className="password-box">
            <input type={passwordVisible ? "text" : "password"} name="confirmPassword" placeholder="비밀번호 확인" value={form.confirmPassword} onChange={handleChange} required />
            <span className="eye-icon" onClick={togglePasswordVisibility}>👁</span>
            </div>
            {passwordError && <p className="password-error">{passwordError}</p>}

            <input type="email" name="email" placeholder="이메일" value={form.email} onChange={handleChange} required />
            <button type="submit">가입하기</button>
        </form>
        </div>

  );
};

export default SignUp;
