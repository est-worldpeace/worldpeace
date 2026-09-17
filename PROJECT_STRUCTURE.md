# Worldpeace 기본 구조

GitHub origin: https://github.com/est-worldpeace/worldpeace.git

확인한 원격 main에는 README.md만 있습니다. 기존 팀원 코드·모델 파일·Docker 설정은 발견되지 않았습니다.
최종 결합 베이커리 예측 모델을 Python으로 이식해 FastAPI에 연결했습니다.

```text
frontend/                    React + Vite
  src/
    main.jsx                 React 시작점
    App.jsx                  기본 화면 / API 연결 확인
    api/client.js            FastAPI 요청 함수
    styles.css
  vite.config.js             /api → localhost:8000 개발 프록시
  package.json
backend/
  requirements.txt
  app/
    main.py                  FastAPI 시작점
    api/routes.py            엔드포인트
    schemas/prediction.py    요청·응답 스키마
    services/inference.py    전처리·모델 호출·후처리 위치
    models/bakery_model.py   특징 생성·앙상블·오차 보정·생산량 계산
    models/artifacts/        학습된 7.6MB 모델팩과 출처 정보
  tests/                    원본 TypeScript 엔진과 일치 여부 검증
```

요청 흐름: React → `/api/predict` → 라우터 → 서비스 → 최종 결합 모델.
판매기록, 예측일, 재고, 예약, 생산 단위와 최대 생산량을 JSON으로 전달합니다.

## 실행

Python 3.10 이상, Node.js 20 이상이 필요합니다. 저장소 루트에서 두 터미널을 엽니다.

백엔드 (PowerShell):
```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

프론트엔드:
```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

- 화면: http://127.0.0.1:5173
- API 문서: http://127.0.0.1:8000/docs
- 상태 확인: `GET /api/health`
- 추론: `POST /api/predict` (`/docs`에서 요청 스키마 확인)

잘못된 입력은 HTTP 422, 모델 계산에 사용할 기록이 부족하거나 잘못된 경우 400을 반환합니다.
프론트는 Vite 프록시를 통해 요청하므로 로컬 개발용 CORS 설정은 필요하지 않습니다.
배포·Docker·데이터베이스·인증은 이번 기본 구조 범위에 포함하지 않았습니다.
