import React, { useEffect, useMemo, useRef, useState } from 'react';
import { predict } from './api/client.js';

const toIsoDate = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const relativeDate = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return toIsoDate(date); };
const displayDate = value => value?.replace(/^\d{4}-/, '').replace('-', '.');
const TOMORROW = relativeDate(1);
const DEMO_SALES = [72, 78, 91, 88, 70, 75, 58].map((sold, index) => {
  const date = relativeDate(index - 6);
  const day = new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'Asia/Seoul' }).format(new Date(`${date}T12:00:00+09:00`)).replace('요일', '');
  return { date, day, sold, note: index === 2 || index === 3 ? '주말' : '평일' };
});

const pageMeta = {
  sales: ['데이터 입력', '판매기록', '날짜별 판매수량을 확인하거나 CSV 파일을 불러옵니다.'],
  product: ['상품 기준 관리', '제품관리', 'MVP 대상 상품과 생산 단위를 설정합니다.'],
  settings: ['매장 정보', '설정', '시연에 사용할 매장 정보와 기본값을 관리합니다.'],
};

function Icon({ name, size = 22 }) {
  const paths = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5M9 21v-7h6v7"/></>,
    chart: <><path d="M4 19V9M10 19V5M16 19v-8M22 19H2"/></>,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.13.37.35.7.65.96.3.25.68.4 1.07.4H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v5h16v-5"/></>,
    save: <><path d="M5 3h12l3 3v15H4V3h1Z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    shop: <><path d="M4 10v10h16V10M3 4h18l-2 6H5L3 4Z"/><path d="M9 20v-6h6v6"/></>,
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Brand() {
  return <div className="brand" aria-label="거기까지!"><div className="brand-mark"><i/>거기까지<span>!</span></div><p>좋은 빵이<br/>더 많은 사람에게</p></div>;
}

function Sidebar({ page, onNavigate }) {
  const items = [['plan', 'home', '생산계획'], ['sales', 'chart', '판매기록'], ['product', 'box', '제품관리'], ['settings', 'settings', '설정']];
  return <aside className="sidebar"><Brand/><nav aria-label="주요 메뉴">{items.map(([id, icon, label]) => <button key={id} className={page === id ? 'nav-item active' : 'nav-item'} onClick={() => onNavigate(id)}><Icon name={icon}/><span>{label}</span></button>)}</nav><div className="store-mini"><div className="store-name"><Icon name="shop" size={20}/><strong>행복한 빵집</strong></div><p>오늘도 맛있는 하루<br/>감사합니다.</p></div></aside>;
}

function Topbar() {
  const date = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());
  return <header className="topbar"><span>{date}</span><i/><span className="top-store">행복한 빵집 <b>›</b></span></header>;
}

function QuantityBars({ values }) {
  return <div className="bar-chart" aria-label="기존 계획, 예상 판매량, 조정안 수량 비교"><div className="axis-labels">{[120,100,80,60,40,20,0].map(n => <span key={n}>{n}</span>)}</div><div className="plot">{[120,100,80,60,40,20,0].map(n => <span className="grid-line" style={{ bottom: `${n / 1.2}%` }} key={n}/>)}<div className="bars">{values.map((item, index) => <div className="bar-column" key={item.label}><strong>{item.value}</strong><div className={`bar bar-${index + 1}`} style={{ height: `${item.value / 1.2}%` }}/><span>{item.label}</span></div>)}</div></div></div>;
}

function Metric({ label, value, tone }) {
  return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}<small>개</small></strong></div>;
}

function PlanPage({ sales, prediction, predictionError, loading, finalQuantity, setFinalQuantity, onSaved }) {
  const baseline = 100;
  const fallback = Math.round(sales.reduce((sum, row) => sum + Number(row.sold || 0), 0) / Math.max(sales.length, 1));
  const predicted = prediction ? Math.round(prediction.predicted_sales) : fallback;
  const adjusted = prediction ? prediction.recommended_quantity : Math.ceil(predicted / 10) * 10;
  const change = adjusted - baseline;
  const chartValues = [{ label: '기존 계획', value: baseline }, { label: '예상 판매량', value: predicted }, { label: '조정안', value: adjusted }];
  const changeQuantity = amount => setFinalQuantity(value => Math.max(10, Math.min(200, value + amount)));
  return <><section className="page-heading plan-heading"><div><span className="eyebrow">시연용 예시 데이터</span><h1>내일 생산계획</h1><p>맛있는 하루가, 더 오래 이어지도록</p></div><div className="botanical">좋은 빵이<br/>좋은 하루를 만듭니다.<span>⌁</span></div></section><section className="plan-grid">
    <article className="panel chart-panel"><div className="product-line"><h2>크루아상</h2><span>내일은 몇 개를 만들까요?</span></div><QuantityBars values={chartValues}/></article>
    <div className="decision-column"><section className="metric-grid"><Metric label="기존 계획" value={baseline} tone="sage"/><Metric label="예상 판매량" value={predicted} tone="oat"/><Metric label="조정안" value={adjusted} tone="clay"/><Metric label="변경 수량" value={change > 0 ? `+${change}` : change} tone="mint"/></section><section className="panel quantity-panel"><div className="quantity-title"><h3>최종 생산량</h3><span>생산 단위 10개</span></div><div className="stepper"><button onClick={() => changeQuantity(-10)} aria-label="10개 줄이기">−</button><strong>{finalQuantity}<small>개</small></strong><button onClick={() => changeQuantity(10)} aria-label="10개 늘리기">＋</button></div><p>최종 수량은 점주가 결정합니다.</p></section></div>
    <aside className="panel product-card"><div className="croissant-art" aria-label="크루아상 일러스트"><span>🥐</span></div><h2>크루아상</h2><p>매일 구워내는<br/>우리 가게의 시그니처</p><dl><div><dt>생산 단위</dt><dd>10개</dd></div><div><dt>보관 방법</dt><dd>상온</dd></div><div><dt>판매 기한</dt><dd>당일</dd></div></dl><blockquote>“ 좋은 빵이<br/>좋은 하루를 만듭니다. ”</blockquote></aside>
    <div className="estimate-note"><span className="info-mark">i</span><div><strong>{loading ? '최종 결합 모델을 계산하고 있습니다.' : prediction ? `최종 결합 모델 · ${prediction.mode === 'research' ? '연구 모델' : '요일 기준 대체'}` : '모델 API 연결이 필요합니다.'}</strong><p>{prediction ? `P75 ${prediction.p75.toFixed(1)}개 · 기록 ${prediction.history_count}일${prediction.warnings?.length ? ` · ${prediction.warnings[0]}` : ''}` : predictionError || 'FastAPI 서버를 실행하면 실제 모델 결과로 교체됩니다.'}</p></div></div><button className="save-plan" onClick={() => onSaved({ baseline, predicted, adjusted, finalQuantity, model: prediction?.model || 'fallback' })}><Icon name="save" size={25}/><span>계획 저장</span><b>→</b></button>
  </section></>;
}

function SalesPage({ sales, setSales }) {
  const inputRef = useRef(null);
  const average = Math.round(sales.reduce((sum, row) => sum + Number(row.sold || 0), 0) / Math.max(sales.length, 1));
  const max = Math.max(...sales.map(row => Number(row.sold || 0)));
  const handleFile = async event => { const file = event.target.files?.[0]; if (!file) return; const text = await file.text(); const parsed = text.trim().split(/\r?\n/).slice(1).map(line => { const [date, day, sold, note = '업로드'] = line.split(',').map(cell => cell.trim()); return { date, day, sold: Number(sold), note }; }).filter(row => row.date && Number.isFinite(row.sold)); if (parsed.length) setSales(parsed.slice(-30)); event.target.value = ''; };
  return <><PageHeading page="sales"/><section className="content-grid sales-layout"><article className="panel upload-panel"><span className="section-kicker">CSV 가져오기</span><h2>판매기록을 추가하세요</h2><p>첫 행은 <code>날짜,요일,판매수량,메모</code> 형식을 사용합니다. 날짜는 YYYY-MM-DD 형식입니다.</p><input ref={inputRef} type="file" accept=".csv,text/csv" onChange={handleFile} hidden/><button className="outline-button" onClick={() => inputRef.current?.click()}><Icon name="upload"/>CSV 파일 선택</button><button className="text-button" onClick={() => setSales(DEMO_SALES)}>예시 데이터로 되돌리기</button></article><div className="summary-stack"><Metric label="최근 평균 판매량" value={average} tone="sage"/><Metric label="최고 판매량" value={max} tone="oat"/></div><article className="panel table-panel"><div className="table-title"><div><span className="section-kicker">최근 기록</span><h2>크루아상 판매수량</h2></div><span>{sales.length}일</span></div><div className="data-table" role="table"><div className="table-row header" role="row"><span>날짜</span><span>요일</span><span>판매수량</span><span>구분</span></div>{sales.map((row, index) => <div className="table-row" role="row" key={`${row.date}-${index}`}><span>{displayDate(row.date)}</span><span>{row.day}</span><strong>{row.sold}개</strong><span className="pill">{row.note}</span></div>)}</div></article></section></>;
}

function ProductPage() {
  return <><PageHeading page="product"/><section className="content-grid product-layout"><article className="panel product-profile"><div className="large-croissant">🥐</div><div><span className="status-dot">운영 중</span><h2>크루아상</h2><p>해커톤 MVP에서 예측할 단일 상품입니다.</p></div></article><article className="panel form-panel"><h2>생산 기준</h2><div className="form-grid"><label>생산 단위<input value="10개" readOnly/></label><label>보관 방법<input value="상온" readOnly/></label><label>판매 기한<input value="당일" readOnly/></label><label>기본 계획량<input value="100개" readOnly/></label></div><p className="form-help">생산 단위는 한 번에 만들 수 있는 수량입니다. 추천값을 10개 단위로 올림할 때 사용합니다.</p></article><article className="panel scope-panel"><span className="section-kicker">MVP 범위</span><h2>하나의 상품부터 정확하게</h2><ul><li><Icon name="check"/>크루아상 1종</li><li><Icon name="check"/>매장 1곳</li><li><Icon name="check"/>최근 판매기록 기반 예측</li><li><Icon name="check"/>점주의 최종 결정</li></ul></article></section></>;
}

function SettingsPage() {
  const [store, setStore] = useState('행복한 빵집'); const [saved, setSaved] = useState(false);
  return <><PageHeading page="settings"/><section className="content-grid settings-layout"><article className="panel form-panel"><h2>매장 정보</h2><div className="form-grid single"><label>매장명<input value={store} onChange={event => { setStore(event.target.value); setSaved(false); }}/></label><label>기본 생산 단위<select defaultValue="10"><option value="5">5개</option><option value="10">10개</option><option value="20">20개</option></select></label></div><button className="primary-button" onClick={() => setSaved(true)}>{saved ? '저장되었습니다' : '설정 저장'}</button></article><article className="panel data-status"><span className="section-kicker">데이터 상태</span><h2>현재는 시연 단계입니다</h2><div className="status-list"><div><span>판매기록</span><strong className="ready">예시 데이터</strong></div><div><span>예측 모델</span><strong>최근 7일 평균</strong></div><div><span>날씨·예약·재고</span><strong>확장 기능</strong></div></div><p>실제 매장 데이터가 확보되면 같은 화면에서 모델 결과로 교체합니다.</p></article></section></>;
}

function PageHeading({ page }) { const [eyebrow, title, description] = pageMeta[page]; return <section className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div></section>; }

export default function App() {
  const [page, setPage] = useState('plan'); const [sales, setSales] = useState(DEMO_SALES); const initialSaved = useMemo(() => Number(localStorage.getItem('geogikkaji-final')) || 90, []); const [finalQuantity, setFinalQuantity] = useState(initialSaved); const [toast, setToast] = useState(''); const [prediction, setPrediction] = useState(null); const [predictionError, setPredictionError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true; setLoading(true); setPredictionError('');
    predict({ product_id: 'croissant', target_date: TOMORROW, sales_history: sales.map(row => ({ date: row.date, sales: Number(row.sold), stockout: false })), inventory: 0, reservations: 0, batch_size: 10, capacity: 200 })
      .then(result => { if (active) { setPrediction(result); setFinalQuantity(result.recommended_quantity); } })
      .catch(error => { if (active) { setPrediction(null); setPredictionError(error.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sales]);
  const handleSaved = plan => { localStorage.setItem('geogikkaji-final', String(plan.finalQuantity)); localStorage.setItem('geogikkaji-plan', JSON.stringify({ ...plan, savedAt: new Date().toISOString() })); setToast(`${plan.finalQuantity}개 생산계획을 저장했습니다.`); window.setTimeout(() => setToast(''), 2600); };
  return <div className="app-shell"><Sidebar page={page} onNavigate={setPage}/><div className="workspace"><Topbar/><main className="main-content">{page === 'plan' && <PlanPage sales={sales} prediction={prediction} predictionError={predictionError} loading={loading} finalQuantity={finalQuantity} setFinalQuantity={setFinalQuantity} onSaved={handleSaved}/>} {page === 'sales' && <SalesPage sales={sales} setSales={setSales}/>} {page === 'product' && <ProductPage/>}{page === 'settings' && <SettingsPage/>}</main></div>{toast && <div className="toast"><Icon name="check" size={20}/>{toast}</div>}</div>;
}
