import React, { useRef } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Metric } from '../components/Metric.jsx';
import { PageHeading } from '../components/PageHeading.jsx';
import { displayDate } from '../utils/date.js';

export function SalesPage({ sales, setSales, onReset }) {
  const inputRef = useRef(null);
  const average = Math.round(sales.reduce((sum, row) => sum + Number(row.sold || 0), 0) / Math.max(sales.length, 1));
  const max = sales.length ? Math.max(...sales.map(row => Number(row.sold || 0))) : 0;
  const handleFile = async event => { const file = event.target.files?.[0]; if (!file) return; const text = await file.text(); const parsed = text.trim().split(/\r?\n/).slice(1).map(line => { const [date, day, sold, note = '업로드'] = line.split(',').map(cell => cell.trim()); return { date, day, sold: Number(sold), note }; }).filter(row => row.date && Number.isFinite(row.sold)); if (parsed.length) setSales(parsed.slice(-30)); event.target.value = ''; };
  const handleClear = () => { if (!sales.length) return; if (!window.confirm('현재 판매기록을 전부 삭제할까요? 예측을 다시 보려면 CSV를 올리거나 예시 데이터로 되돌려야 합니다.')) return; setSales([]); };
  return <><PageHeading page="sales"/><section className="content-grid sales-layout"><article className="panel upload-panel"><span className="section-kicker">CSV 가져오기</span><h2>판매기록을 추가하세요</h2><p>첫 행은 <code>날짜,요일,판매수량,메모</code> 형식을 사용합니다. 날짜는 YYYY-MM-DD 형식입니다.</p><input ref={inputRef} type="file" accept=".csv,text/csv" onChange={handleFile} hidden/><button className="outline-button" onClick={() => inputRef.current?.click()}><Icon name="upload"/>CSV 파일 선택</button><button className="text-button" onClick={onReset}>예시 데이터로 되돌리기</button><button className="text-button danger" onClick={handleClear}>전체 삭제</button></article><div className="summary-stack"><Metric label="최근 평균 판매량" value={average} tone="sage"/><Metric label="최고 판매량" value={max} tone="oat"/></div><article className="panel table-panel"><div className="table-title"><div><span className="section-kicker">최근 기록</span><h2>크루아상 판매수량</h2></div><span>{sales.length}일</span></div>{sales.length === 0 ? <p className="table-empty">판매기록이 없습니다. CSV를 업로드하거나 예시 데이터로 되돌려주세요.</p> : <div className="data-table" role="table"><div className="table-row header" role="row"><span>날짜</span><span>요일</span><span>판매수량</span><span>구분</span></div>{sales.map((row, index) => <div className="table-row" role="row" key={`${row.date}-${index}`}><span>{displayDate(row.date)}</span><span>{row.day}</span><strong>{row.sold}개</strong><span className="pill">{row.note}</span></div>)}</div>}</article></section></>;
}
