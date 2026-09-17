export function wasteRisk(existingPlan, predictedSales) {
  const gap = Math.max(0, existingPlan - predictedSales);
  const ratio = existingPlan > 0 ? gap / existingPlan : 0;
  const level = ratio <= 0.05 ? '낮음' : ratio <= 0.15 ? '보통' : '높음';
  return { gap: Math.round(gap), level };
}

export function savings(existingPlan, recommendedQuantity, unitCost) {
  const reduction = Math.max(0, existingPlan - recommendedQuantity);
  const amount = unitCost ? reduction * unitCost : null;
  return { reduction, amount };
}

export function formatWon(amount) {
  return `${amount.toLocaleString('ko-KR')}원`;
}
