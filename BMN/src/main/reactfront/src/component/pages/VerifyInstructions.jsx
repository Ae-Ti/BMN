import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const VerifyInstructions = () => {
  const loc = useLocation();
  const nav = useNavigate();
  const params = new URLSearchParams(loc.search);
  const initialEmail = params.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [autoRedirecting, setAutoRedirecting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // if navigated without email, maybe we can prefill from profile (call /user/profile/me)
    if (!email) {
      axios.get('/user/profile/me')
        .then(res => {
          if (res && res.data && res.data.email) setEmail(res.data.email);
        })
        .catch(() => {});
    }
  }, []);

  // If we arrived here from signup (email param present), poll the server for
  // verification status. Only redirect to login after the server reports verified=true.
  useEffect(() => {
    if (!initialEmail) return;
    setMessage('회원가입이 접수되었습니다. 이메일 인증을 기다리는 중입니다.');
    setChecking(true);
    let stopped = false;
    const checkOnce = async () => {
      try {
        const res = await axios.get('/user/verify-status', { params: { email: initialEmail } });
        const data = res && res.data ? res.data : {};
        if (data.verified) {
          stopped = true;
          setVerified(true);
          setChecking(false);
          setMessage('이메일 인증이 확인되었습니다. 곧 로그인 페이지로 이동합니다.');
          setAutoRedirecting(true);
          setCountdown(3);
          // start short countdown then navigate
          const iv = setInterval(() => setCountdown(c => c - 1), 1000);
          const to = setTimeout(() => { try { nav('/user/login'); } catch (e) {} }, 3000);
          // cleanup for this branch
          return () => { clearInterval(iv); clearTimeout(to); };
        }
        // not verified yet -> continue polling
      } catch (e) {
        // ignore transient errors
      }
      return null;
    };

    // run immediately then every 3 seconds
    let poll = true;
    (async function runPoll() {
      while (poll && !stopped) {
        // eslint-disable-next-line no-await-in-loop
        await checkOnce();
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 3000));
      }
    })();

    return () => { poll = false; setChecking(false); };
  }, [initialEmail, nav]);

  const handleResend = async () => {
    setStatus('sending');
    setMessage('');
    try {
      const res = await axios.post('/user/resend-verification', { email });
      setStatus('sent');
      setMessage(res.data && res.data.message ? res.data.message : '인증 메일을 보냈습니다.');
    } catch (err) {
      setStatus('error');
      const m = err.response?.data?.message || err.message || '재전송 중 오류가 발생했습니다.';
      setMessage(m);
    }
  };

  return (
    <div
      className="signup-container"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - var(--header-height))', paddingTop: 'var(--header-height)' }}
    >
      <div className="signup-box" style={{ maxWidth: 540, width: '90%' }}>
        {/* Top notice to emphasize requirement */}
        <div style={{ background: '#fff8e6', border: '1px solid #ffe7b2', padding: 10, borderRadius: 6, marginBottom: 14, fontWeight: 700, color: '#6a4a00' }}>
          이메일 인증해야 회원가입이 완료됩니다
        </div>

        <h2>이메일 인증 안내</h2>
        <p>회원가입을 완료하려면 이메일의 인증 링크를 클릭하세요.</p>

        <div style={{ marginTop: 12 }}>
          <label>인증 이메일 주소</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12 }}>
          <button onClick={handleResend} style={{ padding: '8px 14px' }}>인증 메일 재전송</button>
          <button onClick={() => nav('/user/login')} style={{ padding: '8px 14px' }}>로그인으로 이동</button>
        </div>

        {status === 'sending' && <p style={{ marginTop: 12 }}>전송 중...</p>}
        {message && <p style={{ marginTop: 12 }}>{message} {autoRedirecting && <strong>({countdown})</strong>}</p>}
      </div>
    </div>
  );
}

export default VerifyInstructions;
