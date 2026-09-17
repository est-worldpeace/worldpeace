# Worldpeace 기본 구조

GitHub origin: https://github.com/est-worldpeace/worldpeace.git

확인한 원격 main에는 README.md만 있습니다. 기존 팀원 코드·모델 파일·Docker 설정은 발견되지 않았습니다.
이번 작업은 기본 파일 구조만 마련하며 실제 모델 추론은 아직 연결하지 않습니다.

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
    models/adapter.py        기존 모델 import 및 추론 연결 위치
```

요청 흐름: React → `/api/predict` → 라우터 → 서비스 → 모델 어댑터.
텍스트 입력은 임시 계약이며 실제 모델 입력 규격을 받으면 스키마와 어댑터를 맞춥니다.
모델 원본 및 가중치는 원래 위치에 보존하고 어댑터에서 참조합니다.

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
- 추론 연결 자리: `POST /api/predict`, JSON 본문 `{"text":"안녕하세요"}`

모델 연결 전 추론 요청은 HTTP 503을 반환합니다. 잘못된 입력은 422입니다.
프론트는 Vite 프록시를 통해 요청하므로 로컬 개발용 CORS 설정은 필요하지 않습니다.
배포·Docker·데이터베이스·인증은 이번 기본 구조 범위에 포함하지 않았습니다.
