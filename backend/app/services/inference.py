from app.models.adapter import predict


def run_inference(text: str):
    """필요한 전처리/후처리는 이 계층에 추가합니다."""
    return predict(text)
