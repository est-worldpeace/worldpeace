import React, { useState } from 'react';
import { PageHeading } from '../components/PageHeading.jsx';
import { updateStore } from '../api/client.js';

export function SettingsPage({ store, onStoreUpdated }) {
  const [name, setName] = useState(store?.name || '');
  const [batchSize, setBatchSize] = useState(store?.default_batch_size ?? 10);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleSave = async () => {
    setStatus('saving');
    setError('');
    try {
      const result = await updateStore({ name, default_batch_size: Number(batchSize) });
      onStoreUpdated(result);
      setStatus('saved');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  return <><PageHeading page="settings"/><section className="content-grid settings-layout"><article className="panel form-panel"><h2>매장 정보</h2><div className="form-grid single"><label>매장명<input value={name} onChange={event => { setName(event.target.value); setStatus('idle'); }}/></label><label>기본 생산 단위<select value={String(batchSize)} onChange={event => { setBatchSize(Number(event.target.value)); setStatus('idle'); }}><option value="5">5개</option><option value="10">10개</option><option value="20">20개</option></select></label></div><button className="primary-button" onClick={handleSave}>{status === 'saved' ? '저장되었습니다' : '설정 저장'}</button>{error && <p className="form-error">{error}</p>}</article><article className="panel data-status"><span className="section-kicker">데이터 상태</span><h2>현재는 시연 단계입니다</h2><div className="status-list"><div><span>판매기록</span><strong className="ready">예시 데이터</strong></div><div><span>예측 모델</span><strong>최근 7일 평균</strong></div><div><span>날씨·예약·재고</span><strong>확장 기능</strong></div></div><p>실제 매장 데이터가 확보되면 같은 화면에서 모델 결과로 교체합니다.</p></article></section></>;
}
