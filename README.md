# 거기까지!

2026 EST AI Challengers 해커톤 프로젝트입니다. 베이커리의 과거 판매기록을 바탕으로 다음 날 예상 판매량과 생산 조정안을 보여주고, 점주가 최종 생산량을 결정하도록 돕습니다.

## 현재 대시보드

- **생산계획:** 기존 계획·예상 판매량·10개 단위 조정안 비교, 최종 수량 수정 및 브라우저 저장
- **판매기록:** 최근 기록 확인, CSV 업로드, 입력 데이터에 따른 예측값 재계산
- **제품관리:** MVP 상품인 크루아상의 생산 단위·보관 방법·판매 기한 표시
- **설정:** 매장명과 기본 생산 단위 관리, 현재 데이터·모델 적용 범위 안내

시연 데이터는 FastAPI의 최종 결합 예측 모델로 전달됩니다. 화면은 P50 예상 판매량과 P75·재고·예약·생산 단위를 반영한 추천 생산량을 표시합니다. 모델 API가 꺼져 있으면 연결 오류와 최근 평균 임시값을 표시합니다.

CSV 형식은 첫 행에 `날짜,요일,판매수량,메모`를 사용합니다.

## 시작하기 (처음부터)

이 저장소를 처음 받는 컴퓨터 기준으로, 필요한 프로그램 설치부터 서버 실행까지 순서대로 정리했습니다. Windows 기준입니다.

### 1. 필수 프로그램 설치

아래 4가지가 필요합니다. 이미 설치되어 있다면 건너뛰어도 됩니다.

| 프로그램 | 확인 방법 | 설치 링크 |
| --- | --- | --- |
| Git | PowerShell에서 `git --version` | https://git-scm.com/download/win |
| Python 3.10 이상 | PowerShell에서 `py -3 --version` | https://www.python.org/downloads/ (설치 시 **Add python.exe to PATH** 체크) |
| Node.js 20 이상 | PowerShell에서 `node -v` | https://nodejs.org/ko (LTS 버전) |
| Visual Studio Code | 실행 아이콘 확인 | https://code.visualstudio.com/ |

설치 후에는 PowerShell(또는 VSCode 터미널)을 새로 열어야 PATH가 반영됩니다.

### 2. 저장소 내려받기 (clone)

원하는 폴더에서 PowerShell을 열고 실행합니다.

```powershell
git clone https://github.com/est-worldpeace/worldpeace.git
cd worldpeace
```

### 3. VSCode로 열기

```powershell
code .
```

(`code` 명령이 안 먹으면 VSCode를 직접 실행해서 `File > Open Folder`로 방금 받은 `worldpeace` 폴더를 엽니다.)

VSCode 상단 메뉴 `Terminal > New Terminal`로 터미널을 하나 더 열면, 아래 백엔드/프론트엔드를 각각 다른 터미널에서 동시에 실행할 수 있습니다.

### 4. 백엔드 서버 실행 (FastAPI)

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- 최초 1회만 `venv` 생성과 `pip install`이 필요합니다. 다음부터는 마지막 `uvicorn` 명령만 실행하면 됩니다.
- 실행되면 `http://127.0.0.1:8000/docs`에서 API 문서를 확인할 수 있습니다.

### 5. 프론트엔드 서버 실행 (React + Vite)

새 터미널을 열고 (백엔드는 계속 켜둔 채로):

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

- 최초 1회만 `npm.cmd install`이 필요합니다. 다음부터는 `npm.cmd run dev`만 실행하면 됩니다.
- 실행되면 `http://127.0.0.1:5173`에서 화면을 확인할 수 있습니다.

### 6. 확인

- 화면: http://127.0.0.1:5173
- API 문서: http://127.0.0.1:8000/docs
- 백엔드가 꺼져 있으면 화면에 연결 오류와 임시값이 표시됩니다. 백엔드부터 켠 뒤 프론트엔드를 켜는 순서를 권장합니다.

모델 출처와 검증 방법은 `backend/app/models/README.md`, LLM·RAG·LangGraph 확장안은 `AI_FEATURES.md`를 참고하세요.
