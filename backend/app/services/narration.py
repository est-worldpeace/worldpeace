"""Turns the forecast's own numbers into a short, natural Korean explanation.

This is a narration layer, not a second model: it may only rephrase the exact
figures it is given. If the API call fails or no key is configured, callers
must fall back to the existing rule-based sentences in the frontend
(DashboardPage.jsx) so a live demo never breaks on a network hiccup.

Setup:
1. Install the backend requirements (adds `google-genai`).
2. Get a key from https://aistudio.google.com/apikey and set it as
   GOOGLE_API_KEY in backend/.env (do not commit it).
3. Tune SYSTEM_PROMPT if the model still adds unrequested detail or wanders
    in tone — that's expected to take a few iterations.
"""

from __future__ import annotations

import json
import os
import time

from app.schemas.narration import NarrationFactors

# gemini-flash-latest returns transient 503s under load fairly often; a couple
# of short retries clears most of them without noticeably slowing the request.
RETRY_ATTEMPTS = 3
RETRY_DELAY_SECONDS = 1.5

MODEL = "gemini-flash-lite-latest"

SYSTEM_PROMPT = """너는 소규모 베이커리의 판매량 예측 대시보드에서, 모델이 이미 계산한 숫자를
점주에게 친근하고 자연스러운 말투로 설명해주는 역할이다. 딱딱한 보고서 말투가 아니라,
매장을 잘 아는 동료 직원이 옆에서 설명해주는 듯한 톤으로 쓴다.

절대 규칙 (반드시 지킬 것):
- 사용자 메시지의 JSON에 있는 숫자 외에는 어떤 숫자·비율·날짜도 새로 만들어내지 않는다.
- 날씨, 상권, 경쟁점, 이벤트 등 주어지지 않은 정보는 절대 언급하거나 추측하지 않는다.
- 모델이 실제로 쓰는 요인(요일 효과, 최근 판매 추세, 주말/평일 평균 비교)만 설명한다.
- 아직 점주가 최종 생산량을 정하지 않았다는 전제로, 참고 정보만 제공하고 "이렇게 하세요"라고
  지시하거나 결정을 대신하지 않는다.
- 같은 뜻이라도 매번 문장 구조·표현을 기계적으로 반복하지 말고, 주어진 숫자들의 관계(격차가
  큰지 작은지, 추세가 뚜렷한지 미묘한지)에 맞게 톤과 표현 강도를 자연스럽게 조절한다.

형식:
- 각 항목 1~2문장, 존댓말, 과장이나 이모지 없이 담백하게.
- 개수를 말할 때는 소수점 없이 반올림한 자연수로 말한다 (예: 81.3 → "81개").
- 반드시 아래 JSON 형식 하나만 반환한다 (설명 문구나 코드블록 없이 JSON 텍스트만):
{"weekday_effect": "...", "recent_trend": "...", "weekend_note": "..."}
"""


def _build_user_prompt(factors: NarrationFactors) -> str:
    return json.dumps(factors.model_dump(), ensure_ascii=False)


def generate_narration(factors: NarrationFactors) -> dict[str, str] | None:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            max_output_tokens=500,
        )

        response = None
        for attempt in range(RETRY_ATTEMPTS):
            try:
                response = client.models.generate_content(
                    model=MODEL,
                    contents=_build_user_prompt(factors),
                    config=config,
                )
                break
            except Exception:
                if attempt == RETRY_ATTEMPTS - 1:
                    raise
                time.sleep(RETRY_DELAY_SECONDS)

        text = response.text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        result = json.loads(text)
        if not isinstance(result, dict):
            return None
        response_data = {
            key: result.get(key)
            for key in ("weekday_effect", "recent_trend", "weekend_note")
        }
        if not all(isinstance(value, str) and value.strip() for value in response_data.values()):
            return None
        return response_data
    except Exception:
        return None
