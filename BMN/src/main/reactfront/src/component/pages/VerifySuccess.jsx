import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const VerifySuccess = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const status = query.get('status');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // No automatic redirect/close: show a friendly message and let the user decide
    // to return to the original page. We keep a visual countdown but do not act on it.
    const t = setInterval(() => {
      setCountdown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [navigate]);

  const message = status === 'success' ? '이메일 인증이 완료되었습니다. 곧 로그인 페이지로 이동합니다.' : '이메일 인증에 실패했습니다.';

  return (
    <div style={{padding: 24, maxWidth: 720, margin: '40px auto', textAlign: 'center'}}>
      <h2>{status === 'success' ? '인증 성공' : '인증 실패'}</h2>
      <p>
        {status === 'success'
          ? '이메일 인증이 완료되었습니다. 로그인이 성공 처리되었으니, 원래 페이지로 돌아가시면 됩니다.'
          : '이메일 인증에 실패했습니다.'}
      </p>
      {status === 'success' && (
        <p>원하시면 아래 버튼으로 원래 페이지로 돌아가거나 로그인 페이지로 이동할 수 있습니다.</p>
      )}
      <div style={{marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center'}}>
        <button onClick={() => {
            try {
              if (window.opener && !window.opener.closed) {
                try { window.opener.focus(); } catch(e) {}
                // do not force-navigate opener; user may handle login state when they return
                try { window.close(); return; } catch(e) {}
              }
            } catch(e) {}
            // fallback: go back in history
            try { window.history.back(); return; } catch(e) {}
            navigate('/');
          }}
          style={{padding: '8px 16px'}}>원래 페이지로 돌아가기</button>

        <button onClick={() => navigate('/user/login')} style={{padding: '8px 16px'}}>로그인하러 가기</button>
      </div>
    </div>
  );
};

export default VerifySuccess;
