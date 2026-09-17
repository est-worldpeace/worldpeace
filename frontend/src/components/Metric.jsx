import React from 'react';

export function Metric({ label, value, tone }) {
  return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}<small>개</small></strong></div>;
}
