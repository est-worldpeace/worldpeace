"""Turns the forecast's own numbers into a short, natural Korean explanation.

This is a narration layer, not a second model: it may only rephrase the exact
figures it is given. If the API call fails or no key is configured, callers
must fall back to the existing rule-based sentences in the frontend
(DashboardPage.jsx) so a live demo never breaks on a network hiccup.

Setup:
1. Install the backend requirements.
2. Set the ANTHROPIC_API_KEY environment variable (do not commit it).
3. Tune SYSTEM_PROMPT if the model still adds unrequested detail or wanders
    in tone — that's expected to take a few iterations.
"""

from __future__ import annotations

import json
import os

from app.schemas.narration import NarrationFactors

MODEL = "claude-haiku-4-5-20251001"

SYSTEM_PROMPT = """너는 소규모 베이커리의 판매량 예측 대시보드에서, 모델이 이미 계산한 숫자를
점주에게 쉬운 말로 설명해주는 역할이다.

절대 규칙:
- 사용자 메시지에 있는 숫자 외에는 어떤 숫자도 새로 만들어내지 않는다.
- 날씨, 상권, 이벤트 등 주어지지 않은 정보는 절대 언급하지 않는다.
- 모델이 실제로 사용하는 요인(요일 효과, 최근 판매 추세, 주말 여부)만 설명한다.
- 점주가 아직 생산량을 결정하지 않았다는 사실을 전제로, 참고용 설명만 제공한다.
- 각 항목은 1문장, 존댓말, 과장 없이 담백하게.

출력은 반드시 아래 JSON 형식 하나만 반환한다 (설명 문구 없이 JSON만):
{"weekday_effect": "...", "recent_trend": "...", "weekend_note": "..."}
"""


def _build_user_prompt(factors: NarrationFactors) -> str:
    return json.dumps(factors.model_dump(), ensure_ascii=False)


def generate_narration(factors: NarrationFactors) -> dict[str, str] | None:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model=MODEL,
            max_tokens=300,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": _build_user_prompt(factors)}],
        )
        content = message.content[0]
        text = content.text if hasattr(content, "text") else content["text"]
        result = json.loads(text)
        if not isinstance(result, dict):
            return None
        response = {
            key: result.get(key)
            for key in ("weekday_effect", "recent_trend", "weekend_note")
        }
        if not all(isinstance(value, str) and value.strip() for value in response.values()):
            return None
        return response
    except Exception:
        return None
