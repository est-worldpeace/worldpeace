import React from 'react';

export function Topbar({ storeName }) {
  const date = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());
  return <header className="topbar"><span>{date}</span><i/><span className="top-store">{storeName || '매장'} <b>›</b></span></header>;
}
