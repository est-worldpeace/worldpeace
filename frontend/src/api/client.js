async function request(path, options) {
  const response = await fetch(`/api${path}`, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'API 요청 실패');
  }
  return data;
}

export function getHealth() {
  return request('/health');
}

export function predict(payload) {
  return request('/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
