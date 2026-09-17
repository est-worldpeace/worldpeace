import React, { useEffect, useState } from 'react';
import { explainFactors } from '../api/client.js';
import { Icon } from '../components/Icon.jsx';
import { Metric } from '../components/Metric.jsx';
import { savings, formatWon } from '../utils/planning.js';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function greetingFor(hour) {
  if (hour < 11) return '좋은 아침이에요';
  if (hour < 17) return '좋은 오후예요';
  return '오늘도 수고 많으셨어요';
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function readTodaysPlan() {
  try {
    const saved = JSON.parse(localStorage.getItem('geogikkaji-plan') || 'null');
    if (!saved?.savedAt) return null;
    const isToday = new Date(saved.savedAt).toDateString() === new Date().toDateString();
    return isToday ? saved : null;
  } catch {
    return null;
  }
}

export function DashboardPage({ product, sales, prediction, predictionError, loading, backtest, onNavigate }) {
  const productName = product?.name || '상품';
  const baseline = product?.default_plan_quantity ?? 100;
  const predicted = prediction ? Math.round(prediction.predicted_sales) : null;
  const recommended = prediction ? prediction.recommended_quantity : null;
  const saved = prediction ? savings(baseline, recommended, product?.unit_cost) : null;
  const waste = prediction ? Math.max(0, recommended - predicted) : null;
  const greeting = greetingFor(new Date().getHours());
  const todaysPlan = readTodaysPlan();

  const targetDate = prediction?.target_date;
  const weekdayIndex = targetDate ? new Date(`${targetDate}T00:00:00`).getDay() : null;
  const isWeekend = weekdayIndex === 0 || weekdayIndex === 6;
  const soldValues = sales.map(row => Number(row.sold || 0));
  const mean7 = average(soldValues.slice(-7));
  const mean28 = average(soldValues.slice(-28));
  const trendUp = mean7 !== null && mean28 !== null && mean7 > mean28 * 1.03;
  const trendDown = mean7 !== null && mean28 !== null && mean7 < mean28 * 0.97;
  const trendDelta = mean7 !== null && mean28 !== null ? Math.abs(Math.round(mean7 - mean28)) : null;

  const weekdayP50 = prediction ? Math.round(prediction.comparison.weekday.p50) : null;
  const weekdayGap = weekdayP50 !== null && predicted !== null ? predicted - weekdayP50 : null;

  const weekendAvg = average(sales.filter(row => row.day === '토' || row.day === '일').map(row => Number(row.sold || 0)));
  const weekdayAvg = average(sales.filter(row => row.day !== '토' && row.day !== '일').map(row => Number(row.sold || 0)));
  const weekendHigher = weekendAvg !== null && weekdayAvg !== null && weekendAvg > weekdayAvg;

  let weekendNote = '예측일이 정해지면 알려드려요.';
  if (targetDate) {
    if (weekendAvg !== null && weekdayAvg !== null) {
      const wkEnd = Math.round(weekendAvg);
      const wkDay = Math.round(weekdayAvg);
      if (isWeekend && weekendHigher) weekendNote = `내일은 주말이에요. 주말 평균(${wkEnd}개)이 평일(${wkDay}개)보다 많아서 반영했어요.`;
      else if (isWeekend) weekendNote = `내일은 주말이지만, 최근 기록에서는 주말 평균(${wkEnd}개)이 평일(${wkDay}개)보다 낮았어요.`;
      else if (!weekendHigher) weekendNote = `내일은 평일이에요. 평일 평균(${wkDay}개) 판매 패턴을 반영했어요.`;
      else weekendNote = `내일은 평일이에요. 주말 평균(${wkEnd}개)보다는 낮은 평일 평균(${wkDay}개) 패턴을 반영했어요.`;
    } else {
      weekendNote = isWeekend ? '내일은 주말이라 판매량이 늘어나는 경향을 반영했어요.' : '내일은 평일이라 평일 판매 패턴을 반영했어요.';
    }
  }

  const [narration, setNarration] = useState(null);
  useEffect(() => {
    if (!prediction || !targetDate) { setNarration(null); return; }
    let active = true;
    explainFactors({
      target_weekday: WEEKDAY_KO[weekdayIndex],
      predicted_sales: prediction.predicted_sales,
      weekday_p50: prediction.comparison.weekday.p50,
      mean7,
      mean28,
      weekend_avg: weekendAvg,
      weekday_avg: weekdayAvg,
      is_weekend: isWeekend,
    })
      .then(result => {
        if (!active) return;
        const ready = result?.weekday_effect && result?.recent_trend && result?.weekend_note;
        setNarration(ready ? result : null);
      })
      .catch(() => { if (active) setNarration(null); });
    return () => { active = false; };
  }, [targetDate, weekdayIndex, predicted, weekdayP50, mean7, mean28, weekendAvg, weekdayAvg, isWeekend]);

  const recent3 = average(soldValues.slice(-3));
  const prior3 = average(soldValues.slice(-6, -3));
  let chartInsight = '판매 추이를 분석할 데이터가 더 필요합니다.';
  if (recent3 !== null && prior3 !== null) {
    if (recent3 > prior3 * 1.05) chartInsight = `최근 3일 평균 판매량(${Math.round(recent3)}개)이 이전보다 늘고 있습니다.`;
    else if (recent3 < prior3 * 0.95) chartInsight = `최근 3일 평균 판매량(${Math.round(recent3)}개)이 이전보다 줄고 있습니다.`;
    else chartInsight = `최근 판매량은 하루 평균 ${Math.round(recent3)}개 수준으로 안정적입니다.`;
  }

  const chartData = (backtest || []).map(point => ({
    date: point.date.slice(5),
    실제: point.actual,
    예측: Math.round(point.predicted),
  }));

  return <>
    <section className="page-heading dashboard-heading">
      <div>
        <span className="eyebrow">오늘의 브리핑</span>
        <h1>대시보드</h1>
        <p className="brief-line">
          {greeting}! ☀️{' '}
          {prediction ? <>내일은 <strong>{recommended}개</strong> 생산을 추천해요.</> : loading ? '내일 생산량을 계산하고 있어요.' : (predictionError || '판매기록이 준비되면 추천을 보여드릴게요.')}
        </p>
      </div>
    </section>

    {prediction && <div className="plan-cta">
      {todaysPlan
        ? <>
            <span>오늘 생산계획을 <strong>{todaysPlan.finalQuantity}개</strong>로 저장했어요.</span>
            <button className="outline-button" onClick={() => onNavigate?.('plan')}>생산계획 다시 보기</button>
          </>
        : <>
            <span>아직 오늘 생산량을 결정하지 않았어요.</span>
            <button className="primary-button" onClick={() => onNavigate?.('plan')}><Icon name="save" size={18}/>생산계획에서 결정하기</button>
          </>}
    </div>}

    <div className="content-grid">
    <section className="kpi-grid">
      <Metric label="예상 판매량" value={predicted ?? '-'} tone="sage"/>
      <Metric label="AI 권장 생산량" value={recommended ?? '-'} tone="oat"/>
      <Metric label="예상 폐기량" value={waste ?? '-'} tone="clay"/>
      <div className="metric mint metric-money">
        <span>예상 절감 금액</span>
        {saved?.amount != null ? <strong>{formatWon(saved.amount)}</strong> : <small className="metric-placeholder">원가 입력 시 확인 가능</small>}
      </div>
    </section>

    <section className="panel savings-panel">
      <h2>생산 계획 비교</h2>
      <div className="savings-row">
        <div><span>기존 생산 계획</span><strong>{baseline}개</strong></div>
        <div><span>AI 권장 생산</span><strong>{recommended ?? '-'}개</strong></div>
        <div><span>생산 감소</span><strong>{saved ? `-${saved.reduction}개` : '-'}</strong></div>
      </div>
      <p className="form-help">{product?.unit_cost ? `개당 원가 ${formatWon(product.unit_cost)} 기준으로 계산했습니다.` : '제품관리에서 개당 원가를 입력하면 절감 금액을 함께 보여드립니다.'}</p>
    </section>

    <section className="panel trend-panel">
      <div className="table-title"><div><span className="section-kicker">최근 판매 추이</span><h2>{productName} 실제 vs 예측</h2></div></div>
      {chartData.length ? <div className="trend-chart">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ede8df"/>
            <XAxis dataKey="date" stroke="#8a857b" fontSize={12}/>
            <YAxis stroke="#8a857b" fontSize={12}/>
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #ded8cc', fontSize: 13 }}/>
            <Legend/>
            <Line type="monotone" dataKey="실제" stroke="#2f5843" strokeWidth={2.5} dot={{ r: 3 }}/>
            <Line type="monotone" dataKey="예측" stroke="#bb7052" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2.5 }}/>
          </LineChart>
        </ResponsiveContainer>
      </div> : <p className="table-empty">예측 비교를 보려면 최소 7일 이상의 판매기록이 필요합니다.</p>}
      <p className="form-help">{chartInsight}</p>
    </section>

    <section className="panel factor-panel">
      <div className="table-title"><div><span className="section-kicker">예측에 반영된 요인</span><h2>왜 이 숫자가 나왔을까요?</h2></div>{narration && <span className="pill pill-ready">✨ AI 설명</span>}</div>
      <div className="factor-grid">
        <div className="factor-card">
          <span className="section-kicker">요일 효과</span>
          {narration ? <p>{narration.weekday_effect}</p> : targetDate ? <p>
            {WEEKDAY_KO[weekdayIndex]}요일은 보통 <strong>{weekdayP50}개</strong> 정도 팔려요
            {weekdayGap != null && weekdayGap !== 0 && `, 이번 예측(${predicted}개)은 그보다 ${Math.abs(weekdayGap)}개 ${weekdayGap > 0 ? '많아요' : '적어요'}`}.
          </p> : <p>예측일이 정해지면 알려드려요.</p>}
        </div>
        <div className="factor-card">
          <span className="section-kicker">최근 판매 추세</span>
          <p>{narration ? narration.recent_trend : trendUp ? `최근 7일 평균(${Math.round(mean7)}개)이 지난 4주 평균(${Math.round(mean28)}개)보다 ${trendDelta}개 늘었어요.` : trendDown ? `최근 7일 평균(${Math.round(mean7)}개)이 지난 4주 평균(${Math.round(mean28)}개)보다 ${trendDelta}개 줄었어요.` : mean7 !== null ? `최근 7일 평균이 ${Math.round(mean7)}개로 평소와 비슷해요.` : '추세를 보려면 판매기록이 더 필요해요.'}</p>
        </div>
        <div className="factor-card">
          <span className="section-kicker">주말 여부</span>
          <p>{narration ? narration.weekend_note : weekendNote}</p>
        </div>
      </div>
    </section>
    </div>
  </>;
}
