import React, { useRef, useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import {
  autoDetect, parseFile, parseCsvText, unresolvedRequired, needsConfirmation,
  groupByProduct, ROLE_LABEL,
} from '../utils/posImport.js';

export function Onboarding({ productName, onImported }) {
  const inputRef = useRef(null);
  const [stage, setStage] = useState('idle'); // idle | mapping
  const [parsed, setParsed] = useState(null);
  const [draftMapping, setDraftMapping] = useState(null);
  const [promptRoles, setPromptRoles] = useState([]);
  const [error, setError] = useState('');

  const commit = (headers, rows, mapping) => {
    const groups = groupByProduct(rows, mapping, productName);
    const matchKey = Object.keys(groups).find(name => name.trim() === productName.trim());
    if (!matchKey) {
      setError(`업로드한 파일에서 "${productName}" 데이터를 찾지 못했습니다. 다른 파일을 올리거나 예시 데이터를 사용해주세요.`);
      return;
    }
    onImported(groups[matchKey]);
  };

  const process = (headers, rows) => {
    const mapping = autoDetect(headers);
    const missing = unresolvedRequired(mapping).filter(role => role !== 'product');
    const ambiguous = needsConfirmation(mapping);
    const prompts = [...new Set([...missing, ...ambiguous])];
    setParsed({ headers, rows });
    setDraftMapping(mapping);
    setError('');
    if (prompts.length) { setPromptRoles(prompts); setStage('mapping'); return; }
    commit(headers, rows, mapping);
  };

  const handleFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    try {
      const { headers, rows } = await parseFile(file);
      if (!headers.length || !rows.length) { setError('파일에서 데이터를 읽지 못했습니다. 파일 내용을 확인해주세요.'); return; }
      process(headers, rows);
    } catch (err) {
      setError(`파일을 읽는 중 문제가 발생했습니다: ${err.message}`);
    }
  };

  const handleDemo = async () => {
    setError('');
    try {
      const text = await fetch('/demo/pos-sample.csv').then(response => response.text());
      const { headers, rows } = parseCsvText(text);
      process(headers, rows);
    } catch {
      setError('예시 데이터를 불러오지 못했습니다.');
    }
  };

  const updateDraftRole = (role, index) => setDraftMapping(current => ({ ...current, [role]: { index, confident: true } }));

  const confirmMapping = () => {
    const stillMissing = unresolvedRequired(draftMapping).filter(role => role !== 'product');
    if (stillMissing.length) {
      setError(`${stillMissing.map(role => ROLE_LABEL[role]).join(', ')} 컬럼을 찾지 못했습니다. 해당하는 컬럼을 선택해주세요.`);
      return;
    }
    commit(parsed.headers, parsed.rows, draftMapping);
  };

  return <div className="onboarding">
    <div className="onboarding-card">
      <span className="eyebrow">시작하기 전에</span>
      <h1>판매 데이터를 불러와주세요</h1>
      <p>정확한 생산량 예측을 위해 먼저 판매 데이터가 필요해요. 사용 중인 POS에서 내보낸 판매내역 파일(CSV·XLSX)을 업로드하거나, 예시 데이터로 먼저 둘러볼 수 있어요.</p>

      {stage === 'idle' && <div className="onboarding-actions">
        <input ref={inputRef} type="file" accept=".csv,.xlsx,text/csv" onChange={handleFile} hidden/>
        <button className="save-plan" onClick={() => inputRef.current?.click()}><Icon name="upload" size={22}/><span>POS 판매파일 업로드</span><b>→</b></button>
        <button className="outline-button" onClick={handleDemo}>예시 데이터로 둘러보기</button>
        <a className="text-button" href="/demo/pos-sample.csv" download>예시 POS 파일 다운로드</a>
      </div>}

      {stage === 'mapping' && <div className="onboarding-actions onboarding-mapping">
        <p className="form-help">비슷한 이름의 컬럼은 자동으로 추천했지만, 확실하지 않은 항목은 직접 선택해주세요.</p>
        {promptRoles.map(role => <label key={role}>
          {ROLE_LABEL[role]}에 해당하는 컬럼
          <select value={draftMapping[role]?.index ?? -1} onChange={event => updateDraftRole(role, Number(event.target.value))}>
            <option value={-1}>선택하세요</option>
            {parsed.headers.map((header, index) => <option key={header + index} value={index}>{header}</option>)}
          </select>
        </label>)}
        <button className="primary-button" onClick={confirmMapping}>확인</button>
        <button className="text-button" onClick={() => { setStage('idle'); setError(''); }}>취소</button>
      </div>}

      {error && <p className="form-error">{error}</p>}
      <p className="form-help">현재는 POS 내보내기 파일 업로드를 지원하며, 향후 POS API 연동으로 자동화를 확장할 수 있습니다.</p>
    </div>
  </div>;
}
