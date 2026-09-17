import React from 'react';

export function QuantityBars({ values }) {
  return <div className="bar-chart" aria-label="기존 계획, 예상 판매량, 조정안 수량 비교"><div className="axis-labels">{[120,100,80,60,40,20,0].map(n => <span key={n}>{n}</span>)}</div><div className="plot">{[120,100,80,60,40,20,0].map(n => <span className="grid-line" style={{ bottom: `${n / 1.2}%` }} key={n}/>)}<div className="bars">{values.map((item, index) => <div className="bar-column" key={item.label}><strong>{item.value}</strong><div className={`bar bar-${index + 1}`} style={{ height: `${item.value / 1.2}%` }}/><span>{item.label}</span></div>)}</div></div></div>;
}
