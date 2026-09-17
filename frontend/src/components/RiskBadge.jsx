import React from 'react';

const TONE = { 낮음: 'low', 보통: 'mid', 높음: 'high' };

export function RiskBadge({ level }) {
  return <span className={`risk-badge risk-${TONE[level] || 'mid'}`}>폐기 위험 {level}</span>;
}
