# 거기까지!

2026 EST AI Challengers 해커톤 프로젝트입니다. 베이커리의 과거 판매기록을 바탕으로 다음 날 예상 판매량과 생산 조정안을 보여주고, 점주가 최종 생산량을 결정하도록 돕습니다.

## 현재 대시보드

- **생산계획:** 기존 계획·예상 판매량·10개 단위 조정안 비교, 최종 수량 수정 및 브라우저 저장
- **판매기록:** 최근 기록 확인, CSV 업로드, 입력 데이터에 따른 예측값 재계산
- **제품관리:** MVP 상품인 크루아상의 생산 단위·보관 방법·판매 기한 표시
- **설정:** 매장명과 기본 생산 단위 관리, 현재 데이터·모델 적용 범위 안내

시연 데이터는 FastAPI의 최종 결합 예측 모델로 전달됩니다. 화면은 P50 예상 판매량과 P75·재고·예약·생산 단위를 반영한 추천 생산량을 표시합니다. 모델 API가 꺼져 있으면 연결 오류와 최근 평균 임시값을 표시합니다.

CSV 형식은 첫 행에 `날짜,요일,판매수량,메모`를 사용합니다.

## 실행

백엔드:

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

화면은 `http://127.0.0.1:5173`에서 확인합니다.
API 문서는 `http://127.0.0.1:8000/docs`에서 확인합니다.

모델 출처와 검증 방법은 `backend/app/models/README.md`, LLM·RAG·LangGraph 확장안은 `AI_FEATURES.md`를 참고하세요.
