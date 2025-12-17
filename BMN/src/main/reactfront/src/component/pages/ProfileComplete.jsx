import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./ProfileComplete.css";

const ProfileComplete = () => {
    const [nickname, setNickname] = useState("");
    const [username, setUsername] = useState("");
    const [birthYear, setBirthYear] = useState("");
    const [birthMonth, setBirthMonth] = useState("");
    const [birthDay, setBirthDay] = useState("");
    const [sex, setSex] = useState("");
    const [introduction, setIntroduction] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        // If token present in query param, store it to localStorage for ProtectedRoute checks
        const params = new URLSearchParams(window.location.search);
        const t = params.get("token");
        if (t) {
            // Mark that we're in an OAuth-first flow so the global 401 interceptor won't
            // treat the inevitable 401 (no local user yet) as a session-expiry and kick the user out.
            try { sessionStorage.setItem('oauthInProgress', '1'); } catch(e) {}
            localStorage.setItem("token", t);
            // set Authorization header for subsequent requests (helps when cookie-based auth isn't established yet)
            axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
            // remove token from URL (clean UX)
            params.delete("token");
            const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
            window.history.replaceState({}, document.title, newUrl);
        } else {
            // if token already in localStorage, ensure axios sends it
            const stored = localStorage.getItem('token');
            // Do NOT mark oauthInProgress for a plain stored token — that flag should
            // only be set when we're in an OAuth-first handshake (token came via URL)
            // or when the user explicitly started an OAuth flow. Marking it here
            // caused normal users with a stored token to be treated as "oauth in
            // progress" which led to incorrect redirects to profile completion.
            if (stored) axios.defaults.headers.common['Authorization'] = `Bearer ${stored}`;
        }

        // Install temporary axios interceptors to log outgoing requests/responses for debugging
        const reqId = axios.interceptors.request.use(cfg => {
            try {
                console.log('[ProfileComplete] OUTGOING REQUEST', cfg.method, cfg.url, cfg.headers && cfg.headers.Authorization, cfg.data);
            } catch (e) {
                console.warn('[ProfileComplete] failed to log outgoing request', e);
            }
            return cfg;
        }, err => { console.warn('[ProfileComplete] request error', err); return Promise.reject(err); });

        const resId = axios.interceptors.response.use(res => {
            try { console.log('[ProfileComplete] RESPONSE', res.status, res.data); } catch (e) {}
            return res;
        }, err => {
            try { console.log('[ProfileComplete] RESPONSE ERROR', err && err.response && err.response.status, err && err.message); } catch (e) {}
            return Promise.reject(err);
        });

        // fetch current profile to prefill fields (server authenticates via cookie or Authorization header)
        axios.get("/user/profile/me")
            .then(res => {
                const d = res.data;
                
                // 이미 프로필이 완성된 사용자는 마이페이지로 리다이렉트
                if (d.profileComplete === true) {
                    try { sessionStorage.removeItem('oauthInProgress'); } catch(e) {}
                    navigate('/mypage');
                    return;
                }
                
                // If we're in an OAuth-first flow (temporary token set), do NOT prefill username or nickname.
                let oauthInProgress = false;
                try { oauthInProgress = sessionStorage.getItem('oauthInProgress') === '1'; } catch(e) { oauthInProgress = false; }

                if (!oauthInProgress) {
                    setNickname(d.nickname || "");
                }
                if (d.dateOfBirth) {
                    // expected format: YYYY-MM-DD
                    try {
                        const parts = String(d.dateOfBirth).split('-').map(Number);
                        if (parts.length === 3) {
                            setBirthYear(parts[0] || "");
                            setBirthMonth(parts[1] || "");
                            setBirthDay(parts[2] || "");
                        }
                    } catch (e) {
                        // ignore parse errors
                    }
                }
                setSex(d.sex || "");
                if (!oauthInProgress) {
                    setUsername(d.userName || d.userName || "");
                }
                // introduction removed from form
            })
            .catch(err => {
                // If 401, only redirect to login when we don't have a token.
                // For OAuth-first users we expect 401 until they submit the profile completion form.
                if (err.response && err.response.status === 401) {
                    const stored = localStorage.getItem('token');
                    if (!stored) {
                        window.location.href = '/user/login';
                    }
                    // otherwise - we have a token (user is OAuth-first). Let the page stay and user submit profile.
                }
            });

        return () => {
            // cleanup interceptors when component unmounts
            try { axios.interceptors.request.eject(reqId); } catch (e) {}
            try { axios.interceptors.response.eject(resId); } catch (e) {}
        };
    }, []);

    const onSubmit = (e) => {
        // Debug logs to ensure handler is called and token/payload are correct
        console.log('[ProfileComplete] onSubmit called');
        console.log('[ProfileComplete] localStorage.token=', localStorage.getItem('token'));
        e.preventDefault();
        // Ensure axios Authorization header is set right before submitting
        try {
            const tkn = localStorage.getItem('token');
            if (tkn) {
                axios.defaults.headers.common['Authorization'] = `Bearer ${tkn}`;
                console.log('[ProfileComplete] axios.defaults Authorization set');
            } else {
                console.log('[ProfileComplete] no token found in localStorage');
            }
            console.log('[ProfileComplete] axios.defaults.headers.common.Authorization=', axios.defaults.headers.common['Authorization']);
        } catch (ex) {
            console.warn('[ProfileComplete] failed to set axios header', ex);
        }
        // prepare birth fields from dropdowns
        const by = birthYear ? Number(birthYear) : null;
        const bm = birthMonth ? Number(birthMonth) : null;
        const bd = birthDay ? Number(birthDay) : null;

        axios.post('/user/profile/complete', {
            username: username,
            nickname: nickname,
            birthYear: by,
            birthMonth: bm,
            birthDay: bd,
            sex: sex || null,
            introduction: introduction || null
        })
        .then((res) => {
            // profile completion done — clear the oauthInProgress flag
            try { sessionStorage.removeItem('oauthInProgress'); } catch(e) {}
            const msg = res && res.data && res.data.message ? res.data.message : '프로필이 저장되었습니다.';
            // If backend returned a JWT, store it and set Authorization header so user is logged in immediately
            if (res && res.data && res.data.token) {
                try {
                    localStorage.setItem('token', res.data.token);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
                    window.dispatchEvent(new Event('auth-changed'));
                } catch (e) { console.warn('Failed to store token', e); }
            } else {
                // remove any temporary token we had
                try { localStorage.removeItem('token'); delete axios.defaults.headers.common['Authorization']; } catch(e) {}
            }
            if (res && res.data && res.data.userName) {
                setUsername(res.data.userName);
            }
            alert(msg);
            navigate('/mypage');
        })
        .catch(err => {
            if (err.response && err.response.status === 401) {
                // 인증 필요: 로그인 페이지로
                window.location.href = '/user/login';
            } else if (err.response && err.response.data && err.response.data.message) {
                // 서버가 사용자 메시지를 제공하면 표시
                alert(err.response.data.message);
            } else {
                // 기타 에러는 일반 안내
                alert('프로필 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
            }
        });
    }

    return (
        <div className="signup-container">
            <form className="signup-box" onSubmit={onSubmit} noValidate>
                <h2>프로필 완성하기</h2>
                <p>구글 계정으로 처음 로그인하셨습니다.</p>
                <p>서비스를 이용하시려면 기본 프로필을 입력해주세요!</p>
                <div>
                    <input placeholder="아이디" value={username} onChange={e=>setUsername(e.target.value)} required />
                </div>
                <div>
                    <input placeholder="닉네임" value={nickname} onChange={e=>setNickname(e.target.value)} required />
                </div>

                <label className="label-title">생년월일</label>
                <div className="row">
                    <select value={birthYear} onChange={e=>setBirthYear(e.target.value)}>
                        <option value="">년</option>
                        {(() => {
                            const now = new Date().getFullYear();
                            const years = [];
                            for (let i = 0; i < 80; i++) years.push(now - i);
                            return years.map(y => <option key={y} value={y}>{y}</option>);
                        })()}
                    </select>
                    <select value={birthMonth} onChange={e=>setBirthMonth(e.target.value)}>
                        <option value="">월</option>
                        {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                    </select>
                    <select value={birthDay} onChange={e=>setBirthDay(e.target.value)}>
                        <option value="">일</option>
                        {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                    </select>
                </div>

                <label className="label-title">성별</label>
                <select value={sex} onChange={e=>setSex(e.target.value)}>
                    <option value="">선택 안함</option>
                    <option value="male">남성</option>
                    <option value="female">여성</option>
                    <option value="other">기타</option>
                </select>

                <label className="label-title">자기소개 (선택)</label>
                <textarea 
                    placeholder="간단한 자기소개를 작성해주세요 (선택사항)" 
                    value={introduction} 
                    onChange={e=>setIntroduction(e.target.value)} 
                    rows="3"
                />

                <div>
                    <button type="submit">저장</button>
                </div>
            </form>
        </div>
    );
}

export default ProfileComplete;
