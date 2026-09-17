"""기존 팀원 모델을 수정하지 않고 import하여 호출하는 연결 지점."""


class ModelNotConfiguredError(RuntimeError):
    pass


def predict(text: str):
    # TODO: 기존 모델을 import하고 추론 함수를 호출합니다.
    # 반환값은 JSON 직렬화가 가능한 값이어야 합니다.
    # 모델 로딩은 매 요청마다 반복하지 않도록 연결 시 구성합니다.
    raise ModelNotConfiguredError("모델이 아직 연결되지 않았습니다.")
