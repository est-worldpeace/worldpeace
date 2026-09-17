import React, { useEffect, useState } from 'react';
import { getHealth } from './api/client.js';

export default function App() {
  const [status, setStatus] = useState('백엔드 연결 확인 중');

  useEffect(() => {
    let active = true;
    getHealth()
      .then(() => { if (active) setStatus('FastAPI 연결됨'); })
      .catch(() => { if (active) setStatus('FastAPI 서버를 실행해 주세요.'); });
    return () => { active = false; };
  }, []);

  return (
    <main>
      <h1>Worldpeace</h1>
      <p>React + FastAPI 프로젝트 기본 구조</p>
      <p role="status">{status}</p>
    </main>
  );
}
