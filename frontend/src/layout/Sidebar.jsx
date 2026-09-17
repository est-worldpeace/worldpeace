import React from 'react';
import { Icon } from '../components/Icon.jsx';
import { Brand } from './Brand.jsx';

export function Sidebar({ page, onNavigate, storeName }) {
  const items = [['dashboard', 'grid', '대시보드'], ['plan', 'home', '생산계획'], ['sales', 'chart', '판매기록'], ['product', 'box', '제품관리'], ['settings', 'settings', '설정']];
  return <aside className="sidebar"><Brand/><nav aria-label="주요 메뉴">{items.map(([id, icon, label]) => <button key={id} className={page === id ? 'nav-item active' : 'nav-item'} onClick={() => onNavigate(id)}><Icon name={icon}/><span>{label}</span></button>)}</nav><div className="store-mini"><div className="store-name"><Icon name="shop" size={20}/><strong>{storeName || '매장'}</strong></div><p>오늘도 맛있는 하루<br/>감사합니다.</p></div></aside>;
}
