import React, { useEffect, useMemo, useState } from 'react';
import { predict, predictBacktest, getStore, getProduct } from './api/client.js';
import { Icon } from './components/Icon.jsx';
import { Onboarding } from './layout/Onboarding.jsx';
import { Sidebar } from './layout/Sidebar.jsx';
import { Splash } from './layout/Splash.jsx';
import { Topbar } from './layout/Topbar.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { PlanPage } from './pages/PlanPage.jsx';
import { SalesPage } from './pages/SalesPage.jsx';
import { ProductPage } from './pages/ProductPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { TOMORROW } from './utils/date.js';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [store, setStore] = useState(null);
  const [product, setProduct] = useState(null);
  const [sales, setSales] = useState(null);
  const [initError, setInitError] = useState('');
  const initialSaved = useMemo(() => Number(localStorage.getItem('geogikkaji-final')) || 90, []);
  const [finalQuantity, setFinalQuantity] = useState(initialSaved);
  const [toast, setToast] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [predictionError, setPredictionError] = useState('');
  const [loading, setLoading] = useState(true);
  const [backtest, setBacktest] = useState([]);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getStore(), getProduct()])
      .then(([storeResult, productResult]) => {
        if (!active) return;
        setStore(storeResult);
        setProduct(productResult);
      })
      .catch(error => { if (active) setInitError(error.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!sales || !product) return;
    let active = true; setLoading(true); setPredictionError('');
    predict({ product_id: product.product_id, target_date: TOMORROW, sales_history: sales.map(row => ({ date: row.date, sales: Number(row.sold), stockout: false })), inventory: 0, reservations: 0, batch_size: product.batch_size, capacity: 200 })
      .then(result => { if (active) { setPrediction(result); setFinalQuantity(result.recommended_quantity); } })
      .catch(error => { if (active) { setPrediction(null); setPredictionError(error.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sales, product]);

  useEffect(() => {
    if (!sales || !product) return;
    let active = true;
    predictBacktest({ product_id: product.product_id, sales_history: sales.map(row => ({ date: row.date, sales: Number(row.sold), stockout: false })), days: 14 })
      .then(result => { if (active) setBacktest(result.points); })
      .catch(() => { if (active) setBacktest([]); });
    return () => { active = false; };
  }, [sales, product]);

  const handleSaved = plan => {
    localStorage.setItem('geogikkaji-final', String(plan.finalQuantity));
    localStorage.setItem('geogikkaji-plan', JSON.stringify({ ...plan, savedAt: new Date().toISOString() }));
    setToast(`${plan.finalQuantity}개 생산계획을 저장했습니다.`);
    window.setTimeout(() => setToast(''), 2600);
  };

  const dataReady = Boolean(initError) || Boolean(store && product);

  let body;
  if (initError) {
    body = <div className="app-shell"><div className="init-error">초기 데이터를 불러오지 못했습니다: {initError}<br/>FastAPI 서버(http://127.0.0.1:8000)가 실행 중인지 확인해주세요.</div></div>;
  } else if (!store || !product) {
    body = <div className="app-shell"><div className="init-loading">불러오는 중...</div></div>;
  } else if (!sales) {
    body = <Onboarding productName={product.name} onImported={setSales}/>;
  } else {
    body = <div className="app-shell"><Sidebar page={page} onNavigate={setPage} storeName={store.name}/><div className="workspace"><Topbar storeName={store.name}/><main className="main-content">{page === 'dashboard' && <DashboardPage product={product} sales={sales} prediction={prediction} predictionError={predictionError} loading={loading} backtest={backtest}/>}{page === 'plan' && <PlanPage sales={sales} product={product} prediction={prediction} predictionError={predictionError} loading={loading} finalQuantity={finalQuantity} setFinalQuantity={setFinalQuantity} onSaved={handleSaved}/>} {page === 'sales' && <SalesPage sales={sales} setSales={setSales} product={product} onNavigate={setPage}/>}{page === 'product' && <ProductPage product={product} onProductUpdated={setProduct}/>}{page === 'settings' && <SettingsPage store={store} onStoreUpdated={setStore}/>}</main></div>{toast && <div className="toast"><Icon name="check" size={20}/>{toast}</div>}</div>;
  }

  return <>{body}{showSplash && <Splash ready={dataReady} onDone={() => setShowSplash(false)}/>}</>;
}
