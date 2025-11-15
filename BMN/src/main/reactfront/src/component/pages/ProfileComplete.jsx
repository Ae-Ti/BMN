import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ProfileComplete = () => {
    const [nickname, setNickname] = useState("");
    const [age, setAge] = useState(0);
    const [sex, setSex] = useState("");
    const [introduction, setIntroduction] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        // If token present in query param, store it to localStorage for ProtectedRoute checks
        const params = new URLSearchParams(window.location.search);
        const t = params.get("token");
        if (t) {
            localStorage.setItem("token", t);
            // remove token from URL (clean UX)
            params.delete("token");
            const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
            window.history.replaceState({}, document.title, newUrl);
        }

        // fetch current profile to prefill fields (server authenticates via cookie)
        axios.get("/user/profile/me")
            .then(res => {
                const d = res.data;
                setNickname(d.nickname || "");
                setAge(d.age || 0);
                setSex(d.sex || "");
                setIntroduction(d.introduction || "");
            })
            .catch(err => {
                // If 401, redirect to login
                if (err.response && err.response.status === 401) {
                    window.location.href = '/user/login';
                }
            });
    }, []);

    const onSubmit = (e) => {
        e.preventDefault();
        axios.post('/user/profile/complete', {
            nickname: nickname,
            age: age || null,
            sex: sex || null,
            introduction: introduction || null
        })
        .then(() => {
            alert('프로필이 저장되었습니다.');
            navigate('/mypage');
        })
        .catch(err => {
            if (err.response && err.response.status === 400) {
                alert('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해 주세요.');
            } else if (err.response && err.response.status === 401) {
                window.location.href = '/user/login';
            } else {
                alert('프로필 저장 중 오류가 발생했습니다.');
            }
        });
    }

    return (
        <div style={{maxWidth: 640, margin: '40px auto', padding: 20, border: '1px solid #ddd', borderRadius: 8}}>
            <h2>프로필 보완</h2>
            <p>처음 로그인하셨습니다. 서비스를 정상 이용하려면 기본 프로필을 입력해주세요.</p>
            <form onSubmit={onSubmit}>
                <div style={{marginBottom:12}}>
                    <label>닉네임</label><br/>
                    <input value={nickname} onChange={e=>setNickname(e.target.value)} required style={{width:'100%', padding:8}} />
                </div>
                <div style={{marginBottom:12}}>
                    <label>나이</label><br/>
                    <input type="number" value={age} onChange={e=>setAge(Number(e.target.value))} style={{width:120, padding:8}} />
                </div>
                <div style={{marginBottom:12}}>
                    <label>성별</label><br/>
                    <select value={sex} onChange={e=>setSex(e.target.value)} style={{width:200, padding:8}}>
                        <option value="">선택 안함</option>
                        <option value="male">남성</option>
                        <option value="female">여성</option>
                        <option value="other">기타</option>
                    </select>
                </div>
                <div style={{marginBottom:12}}>
                    <label>자기소개</label><br/>
                    <textarea value={introduction} onChange={e=>setIntroduction(e.target.value)} rows={4} style={{width:'100%', padding:8}} />
                </div>
                <div>
                    <button type="submit" style={{padding:'8px 16px', background:'#f2536d', color:'#fff', border:'none', borderRadius:4}}>저장</button>
                </div>
            </form>
        </div>
    );
}

export default ProfileComplete;
