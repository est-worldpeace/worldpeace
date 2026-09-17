import React, { useEffect, useState } from 'react';

const MIN_VISIBLE_MS = 1400;
const FADE_MS = 1500;

export function Splash({ ready, onDone }) {
  const [mountedAt] = useState(() => Date.now());
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const elapsed = Date.now() - mountedAt;
    const wait = Math.max(MIN_VISIBLE_MS - elapsed, 0);
    const timer = setTimeout(() => setFading(true), wait);
    return () => clearTimeout(timer);
  }, [ready, mountedAt]);

  useEffect(() => {
    if (!fading) return;
    const timer = setTimeout(onDone, FADE_MS);
    return () => clearTimeout(timer);
  }, [fading, onDone]);

  return (
    <div className={`splash${fading ? ' splash-fade' : ''}`}>
      <img src="/img/splash.png" alt="거기까지! 시작 화면" className="splash-image" />
    </div>
  );
}
