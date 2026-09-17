import React, { useRef, useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Metric } from '../components/Metric.jsx';
import { PageHeading } from '../components/PageHeading.jsx';
import { displayDate } from '../utils/date.js';
import {
  ROLE_LABEL, autoDetect, parseFile, parseCsvText, unresolvedRequired, needsConfirmation,
  groupByProduct, summarize,
} from '../utils/posImport.js';

export function SalesPage({ sales, setSales, product, onNavigate }) {
  const inputRef = useRef(null);
  const productName = product?.name || '크루아상';

  const [stage, setStage] = useState('idle'); // idle | mapping | summary
  const [parsed, setParsed] = useState(null); // { headers, rows, sourceLabel }
  const [draftMapping, setDraftMapping] = useState(null);
  const [promptRoles, setPromptRoles] = useState([]);
  const [mappingError, setMappingError] = useState('');
  const [groups, setGroups] = useState(null);
  const [stats, setStats] = useState(null);
  const [importError, setImportError] = useState('');
  const [previewProduct, setPreviewProduct] = useState(null);
  const [fileError, setFileError] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  const finishParsing = (headers, rows, sourceLabel, mapping) => {
    const missing = unresolvedRequired(mapping).filter(role => role !== 'product');
    const ambiguous = needsConfirmation(mapping);
    const prompts = [...new Set([...missing, ...ambiguous])];
    setParsed({ headers, rows, sourceLabel });
    setDraftMapping(mapping);
    setImportError('');
    if (prompts.length) {
      setPromptRoles(prompts);
      setMappingError('');
      setStage('mapping');
      return;
    }
    finalizeMapping(headers, rows, mapping);
  };

  const finalizeMapping = (headers, rows, mapping) => {
    const built = groupByProduct(rows, mapping, productName);
    setGroups(built);
    setStats(summarize(built));
    setPreviewProduct(productName);
    setStage('summary');
  };

  const handleFileInput = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileError('');
    try {
      const { headers, rows } = await parseFile(file);
      if (!headers.length || !rows.length) { setFileError('파일에서 데이터를 읽지 못했습니다. 파일 내용을 확인해주세요.'); return; }
      finishParsing(headers, rows, file.name, autoDetect(headers));
    } catch (err) {
      setFileError(`파일을 읽는 중 문제가 발생했습니다: ${err.message}`);
    }
  };

  const handleDemo = async () => {
    setFileError('');
    try {
      const response = await fetch('/demo/pos-sample.csv');
      const text = await response.text();
      const { headers, rows } = parseCsvText(text);
      finishParsing(headers, rows, '예시 POS 데이터', autoDetect(headers));
    } catch (err) {
      setFileError('예시 데이터를 불러오지 못했습니다.');
    }
  };

  const updateDraftRole = (role, index) => {
    setDraftMapping(current => ({ ...current, [role]: { index, confident: true } }));
  };

  const confirmMapping = () => {
    const stillMissing = unresolvedRequired(draftMapping).filter(role => role !== 'product');
    if (stillMissing.length) {
      setMappingError(`${stillMissing.map(role => ROLE_LABEL[role]).join(', ')} 컬럼을 찾지 못했습니다. 해당하는 컬럼을 선택해주세요.`);
      return;
    }
    finalizeMapping(parsed.headers, parsed.rows, draftMapping);
  };

  const cancelImport = () => {
    setStage('idle');
    setParsed(null);
    setDraftMapping(null);
    setPromptRoles([]);
    setMappingError('');
    setGroups(null);
    setStats(null);
    setImportError('');
    setPreviewProduct(productName);
  };

  const confirmImportedSales = () => {
    const matchKey = Object.keys(groups).find(name => name.trim() === productName.trim());
    if (!matchKey) {
      setImportError(`업로드한 파일에 "${productName}" 데이터가 없습니다.`);
      return;
    }
    setSales(groups[matchKey]);
    setStage('idle');
    onNavigate?.('plan');
  };

  const handleClear = () => {
    if (!sales.length) return;
    if (!window.confirm('현재 판매기록을 전부 삭제할까요? 예측을 다시 보려면 파일을 올리거나 예시 데이터를 불러와야 합니다.')) return;
    setSales([]);
  };

  const previewOptions = [...new Set([productName, ...(groups ? Object.keys(groups) : [])])];
  const viewingOtherProduct = Boolean(groups && previewProduct && previewProduct !== productName && groups[previewProduct]);
  const previewRecords = viewingOtherProduct ? groups[previewProduct] : sales;
  const isEditable = !viewingOtherProduct;
  const average = Math.round(previewRecords.reduce((sum, row) => sum + Number(row.sold || 0), 0) / Math.max(previewRecords.length, 1));
  const max = previewRecords.length ? Math.max(...previewRecords.map(row => Number(row.sold || 0))) : 0;

  const startEdit = (index, currentValue) => { setEditingIndex(index); setEditValue(String(currentValue)); };
  const cancelEdit = () => { setEditingIndex(null); setEditValue(''); };
  const commitEdit = index => {
    const value = Number(editValue);
    if (Number.isFinite(value) && value >= 0) {
      setSales(sales.map((row, i) => (i === index ? { ...row, sold: Math.round(value) } : row)));
    }
    cancelEdit();
  };
  const deleteRecord = index => {
    if (!window.confirm('이 판매기록 한 줄을 삭제할까요?')) return;
    setSales(sales.filter((_, i) => i !== index));
  };

  return <>
    <PageHeading page="sales"/>
    <section className="content-grid sales-layout">
      <article className="panel upload-panel">
        <span className="section-kicker">POS 연동</span>
        <h2>POS 판매내역 불러오기</h2>
        <p>사용 중인 POS에서 다운로드한 판매내역을 업로드하세요. 상품별 판매 데이터를 자동으로 정리하여 AI 판매량 예측에 사용합니다.</p>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,text/csv" onChange={handleFileInput} hidden/>
        <button className="outline-button" onClick={() => inputRef.current?.click()}><Icon name="upload"/>POS 판매파일 선택</button>
        <p className="form-help">지원 형식 CSV / XLSX</p>
        {fileError && <p className="form-error">{fileError}</p>}
        <button className="text-button" onClick={handleDemo}>예시 데이터로 둘러보기</button>
        <a className="text-button" href="/demo/pos-sample.csv" download>예시 POS 파일 다운로드</a>
        <button className="text-button danger" onClick={handleClear}>전체 삭제</button>
        <p className="form-help">현재는 POS 내보내기 파일 업로드를 지원하며, 향후 POS API 연동으로 자동화를 확장할 수 있습니다.</p>
      </article>

      {stage === 'mapping' && <article className="panel mapping-panel">
        <span className="section-kicker">컬럼 확인</span>
        <h2>업로드한 파일의 컬럼을 확인해주세요</h2>
        <p className="form-help">비슷한 이름의 컬럼은 자동으로 추천했지만, 확실하지 않은 항목은 직접 선택해주세요.</p>
        {promptRoles.map(role => <label key={role}>
          {ROLE_LABEL[role]}에 해당하는 컬럼
          <select value={draftMapping[role]?.index ?? -1} onChange={event => updateDraftRole(role, Number(event.target.value))}>
            <option value={-1}>선택하세요</option>
            {parsed.headers.map((header, index) => <option key={header + index} value={index}>{header}</option>)}
          </select>
        </label>)}
        {mappingError && <p className="form-error">{mappingError}</p>}
        <button className="primary-button" onClick={confirmMapping}>확인</button>
        <button className="text-button" onClick={cancelImport}>취소</button>
      </article>}

      {stage === 'summary' && <article className="panel summary-import-panel">
        <div className="table-title"><div><span className="section-kicker">데이터 확인</span><h2>✓ POS 판매 데이터 확인 완료</h2></div><span>{parsed.sourceLabel}</span></div>
        <div className="savings-row">
          <div><span>데이터 기간</span><strong>{displayDate(stats.startDate)} ~ {displayDate(stats.endDate)}</strong></div>
          <div><span>판매일수</span><strong>{stats.dayCount}일</strong></div>
          <div><span>인식된 상품</span><strong>{stats.productCount}개</strong></div>
          <div><span>총 판매수량</span><strong>{stats.totalQuantity.toLocaleString('ko-KR')}개</strong></div>
        </div>
        <div className="data-table status-table" role="table">
          <div className="table-row header" role="row"><span>상품명</span><span>일수</span><span>상태</span></div>
          {Object.entries(groups).map(([name, records]) => <div className="table-row" role="row" key={name}>
            <span>{name}</span><strong>{records.length}일</strong>
            <span className={name.trim() === productName.trim() ? 'pill pill-ready' : 'pill'}>{name.trim() === productName.trim() ? '예측 가능' : '모델 준비 중'}</span>
          </div>)}
        </div>
        {importError && <p className="form-error">{importError}</p>}
        <button className="save-plan" onClick={confirmImportedSales}><Icon name="check" size={20}/><span>AI 생산량 예측하기</span><b>→</b></button>
        <button className="text-button" onClick={cancelImport}>취소</button>
      </article>}

      <div className="summary-stack"><Metric label="최근 평균 판매량" value={average} tone="sage"/><Metric label="최고 판매량" value={max} tone="oat"/></div>

      <article className="panel table-panel">
        <div className="table-title">
          <div><span className="section-kicker">최근 기록</span><h2>판매수량</h2></div>
          {previewOptions.length > 1
            ? <select value={previewProduct || productName} onChange={event => setPreviewProduct(event.target.value)}>{previewOptions.map(name => <option key={name} value={name}>{name}</option>)}</select>
            : <span>{previewRecords.length}일</span>}
        </div>
        {isEditable && previewRecords.length > 0 && <p className="form-help">판매수량을 클릭하면 직접 고칠 수 있고, 잘못 들어온 줄은 지울 수 있습니다.</p>}
        {previewRecords.length === 0 ? <p className="table-empty">판매기록이 없습니다. POS 파일을 업로드하거나 예시 데이터를 불러와주세요.</p> : <div className={`data-table${isEditable ? ' data-table-editable' : ''}`} role="table"><div className="table-row header" role="row"><span>날짜</span><span>요일</span><span>판매수량</span><span>구분</span>{isEditable && <span/>}</div>{previewRecords.map((row, index) => <div className="table-row" role="row" key={`${row.date}-${index}`}><span>{displayDate(row.date)}</span><span>{row.day}</span>{editingIndex === index
            ? <input type="number" min="0" autoFocus className="row-edit-input" value={editValue} onChange={event => setEditValue(event.target.value)} onBlur={() => commitEdit(index)} onKeyDown={event => { if (event.key === 'Enter') commitEdit(index); if (event.key === 'Escape') cancelEdit(); }}/>
            : <strong className={isEditable ? 'editable-value' : ''} onClick={() => isEditable && startEdit(index, row.sold)}>{row.sold}개</strong>}<span className="pill">{row.note}</span>{isEditable && <button className="row-delete" onClick={() => deleteRecord(index)} aria-label="이 기록 삭제">×</button>}</div>)}</div>}
      </article>
    </section>
  </>;
}
