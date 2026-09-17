import React, { useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { PageHeading } from '../components/PageHeading.jsx';
import { updateProduct } from '../api/client.js';

export function ProductPage({ product, onProductUpdated }) {
  const [form, setForm] = useState(product);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleChange = (field, value) => { setForm(current => ({ ...current, [field]: value })); setStatus('idle'); };

  const handleSave = async () => {
    setStatus('saving');
    setError('');
    try {
      const result = await updateProduct({
        name: form.name,
        batch_size: Number(form.batch_size),
        storage: form.storage,
        shelf_life: form.shelf_life,
        default_plan_quantity: Number(form.default_plan_quantity),
        unit_cost: form.unit_cost === '' || form.unit_cost == null ? null : Number(form.unit_cost),
      });
      setForm(result);
      onProductUpdated(result);
      setStatus('saved');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  return <><PageHeading page="product"/><section className="content-grid product-layout"><article className="panel product-profile"><div className="large-croissant">🥐</div><div><span className="status-dot">운영 중</span><h2>{product.name}</h2><p>해커톤 MVP에서 예측할 단일 상품입니다.</p></div></article><article className="panel form-panel"><h2>생산 기준</h2><div className="form-grid"><label>상품명<input value={form.name} onChange={event => handleChange('name', event.target.value)}/></label><label>생산 단위<input type="number" min="1" value={form.batch_size} onChange={event => handleChange('batch_size', event.target.value)}/></label><label>보관 방법<input value={form.storage} onChange={event => handleChange('storage', event.target.value)}/></label><label>판매 기한<input value={form.shelf_life} onChange={event => handleChange('shelf_life', event.target.value)}/></label><label>기본 계획량<input type="number" min="0" value={form.default_plan_quantity} onChange={event => handleChange('default_plan_quantity', event.target.value)}/></label><label>개당 원가 (원)<input type="number" min="0" placeholder="입력 시 절감 금액 계산에 사용" value={form.unit_cost ?? ''} onChange={event => handleChange('unit_cost', event.target.value)}/></label></div><p className="form-help">생산 단위는 한 번에 만들 수 있는 수량입니다. 추천값을 이 단위로 올림할 때 사용합니다. 개당 원가를 입력하면 대시보드와 생산계획에서 예상 절감 금액을 계산해 보여줍니다.</p><button className="primary-button" onClick={handleSave}>{status === 'saved' ? '저장되었습니다' : '저장'}</button>{error && <p className="form-error">{error}</p>}</article><article className="panel scope-panel"><span className="section-kicker">MVP 범위</span><h2>하나의 상품부터 정확하게</h2><ul><li><Icon name="check"/>{product.name} 1종</li><li><Icon name="check"/>매장 1곳</li><li><Icon name="check"/>최근 판매기록 기반 예측</li><li><Icon name="check"/>점주의 최종 결정</li></ul></article></section></>;
}
