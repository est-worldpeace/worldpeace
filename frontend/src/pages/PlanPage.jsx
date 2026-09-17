import React, { useEffect, useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Metric } from '../components/Metric.jsx';
import { RiskBadge } from '../components/RiskBadge.jsx';
import { wasteRisk, savings, formatWon } from '../utils/planning.js';

function QuantityBars({ values }) {
  return <div className="bar-chart" aria-label="기존 계획, 예상 판매량, AI 권장 생산량 비교"><div className="axis-labels">{[120,100,80,60,40,20,0].map(n => <span key={n}>{n}</span>)}</div><div className="plot">{[120,100,80,60,40,20,0].map(n => <span className="grid-line" style={{ bottom: `${n / 1.2}%` }} key={n}/>)}<div className="bars">{values.map((item, index) => <div className="bar-column" key={item.label}><strong>{item.value}</strong><div className={`bar bar-${index + 1}`} style={{ height: `${item.value / 1.2}%` }}/><span>{item.label}</span></div>)}</div></div></div>;
}

export function PlanPage({ sales, product, prediction, predictionError, loading, finalQuantity, setFinalQuantity, onSaved }) {
  const productName = product?.name || '상품';
  const batchSize = product?.batch_size || 10;
  const baseline = product?.default_plan_quantity ?? 100;
  const fallback = Math.round(sales.reduce((sum, row) => sum + Number(row.sold || 0), 0) / Math.max(sales.length, 1));
  const predicted = prediction ? Math.round(prediction.predicted_sales) : fallback;
  const adjusted = prediction ? prediction.recommended_quantity : Math.ceil(predicted / batchSize) * batchSize;
  const change = adjusted - baseline;
  const chartValues = [{ label: '기존 계획', value: baseline }, { label: '예상 판매량', value: predicted }, { label: 'AI 권장', value: adjusted }];
  const changeQuantity = amount => setFinalQuantity(value => Math.max(batchSize, Math.min(200, value + amount)));

  const risk = wasteRisk(baseline, predicted);
  const saved = savings(baseline, adjusted, product?.unit_cost);

  const simMax = Math.max(batchSize * 4, Math.ceil((Math.max(baseline, adjusted, predicted) * 1.5) / batchSize) * batchSize);
  const [simQuantity, setSimQuantity] = useState(adjusted);
  useEffect(() => { setSimQuantity(adjusted); }, [adjusted]);
  const simSold = Math.min(simQuantity, predicted);
  const simLeftover = Math.max(0, simQuantity - predicted);

  return <><section className="page-heading plan-heading"><div><span className="eyebrow">시연용 예시 데이터</span><h1>내일 생산계획</h1><p>맛있는 하루가, 더 오래 이어지도록</p></div><RiskBadge level={risk.level}/></section><section className="plan-grid">
    <article className="panel chart-panel"><div className="product-line"><h2>{productName}</h2><span>내일은 몇 개를 만들까요?</span></div><QuantityBars values={chartValues}/></article>
    <div className="decision-column"><section className="metric-grid"><Metric label="기존 계획" value={baseline} tone="sage"/><Metric label="예상 판매량" value={predicted} tone="oat"/><Metric label="AI 권장 생산량" value={adjusted} tone="clay"/><Metric label="변경 수량" value={change > 0 ? `+${change}` : change} tone="mint"/></section><section className="panel quantity-panel"><div className="quantity-title"><h3>최종 생산량</h3><span>생산 단위 {batchSize}개</span></div><div className="stepper"><button onClick={() => changeQuantity(-batchSize)} aria-label={`${batchSize}개 줄이기`}>−</button><strong>{finalQuantity}<small>개</small></strong><button onClick={() => changeQuantity(batchSize)} aria-label={`${batchSize}개 늘리기`}>＋</button></div><p>최종 수량은 점주가 결정합니다. AI는 {adjusted}개를 권장해요.</p></section></div>
    <aside className="panel product-card"><div className="croissant-art" aria-label={`${productName} 일러스트`}><span>🥐</span></div><h2>{productName}</h2><p>매일 구워내는<br/>우리 가게의 시그니처</p><dl><div><dt>생산 단위</dt><dd>{batchSize}개</dd></div><div><dt>보관 방법</dt><dd>{product?.storage || '-'}</dd></div><div><dt>판매 기한</dt><dd>{product?.shelf_life || '-'}</dd></div></dl><blockquote>“ 좋은 빵이<br/>좋은 하루를 만듭니다. ”</blockquote></aside>
    <div className="estimate-note"><span className="info-mark">i</span><div><strong>{loading ? '최종 결합 모델을 계산하고 있습니다.' : prediction ? `최종 결합 모델 · ${prediction.mode === 'research' ? '연구 모델' : '요일 기준 대체'}` : '모델 API 연결이 필요합니다.'}</strong><p>{prediction ? `P75 ${prediction.p75.toFixed(1)}개 · 기록 ${prediction.history_count}일${prediction.warnings?.length ? ` · ${prediction.warnings[0]}` : ''}` : predictionError || 'FastAPI 서버를 실행하면 실제 모델 결과로 교체됩니다.'}</p></div></div><button className="save-plan" onClick={() => onSaved({ baseline, predicted, adjusted, finalQuantity, model: prediction?.model || 'fallback' })}><Icon name="save" size={25}/><span>계획 저장</span><b>→</b></button>
    <section className="panel savings-panel">
      <h2>과잉 생산 · 절감 효과</h2>
      <div className="savings-row">
        <div><span>기존 생산 계획</span><strong>{baseline}개</strong></div>
        <div><span>AI 권장 생산</span><strong>{adjusted}개</strong></div>
        <div><span>생산 감소</span><strong>{saved.reduction > 0 ? `-${saved.reduction}개` : '0개'}</strong></div>
        <div><span>예상 절감 금액</span><strong>{saved.amount != null ? formatWon(saved.amount) : '-'}</strong></div>
      </div>
      <p className="form-help">{product?.unit_cost ? `개당 원가 ${formatWon(product.unit_cost)} 기준으로 계산했습니다.` : '제품관리에서 개당 원가를 입력하면 절감 금액을 확인할 수 있습니다.'}</p>
    </section>
    <section className="panel simulation-panel">
      <h2>생산량 시뮬레이션</h2>
      <p className="form-help">슬라이더로 생산량을 바꿔보면서 예상 판매량과 잔여량이 어떻게 달라지는지 미리 확인해보세요.</p>
      <input type="range" className="sim-slider" min={0} max={simMax} step={batchSize} value={simQuantity} onChange={event => setSimQuantity(Number(event.target.value))}/>
      <div className="sim-result">
        <div><span>시뮬레이션 생산량</span><strong>{simQuantity}개</strong></div>
        <div><span>예상 판매량</span><strong>{simSold}개</strong></div>
        <div><span>예상 잔여량</span><strong>{simLeftover}개</strong></div>
      </div>
    </section>
  </section></>;
}
