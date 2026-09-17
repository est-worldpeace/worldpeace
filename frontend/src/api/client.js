async function request(path, options) {
  const response = await fetch(`/api${path}`, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'API 요청 실패');
  }
  return data;
}

function requestJson(path, method, body) {
  return request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function getHealth() {
  return request('/health');
}

export function predict(payload) {
  return requestJson('/predict', 'POST', payload);
}

export function getStore() {
  return request('/store');
}

export function updateStore(payload) {
  return requestJson('/store', 'PUT', payload);
}

export function getProduct() {
  return request('/product');
}

export function updateProduct(payload) {
  return requestJson('/product', 'PUT', payload);
}

export function predictBacktest(payload) {
  return requestJson('/predict/backtest', 'POST', payload);
}
