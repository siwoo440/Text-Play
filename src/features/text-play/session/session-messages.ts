import { defineText } from "@/features/text-play/i18n/localized-text"; // 언어별 글자 정의
import type { LLMServiceErrorCode } from "@/lib/adapters/llm-service-error"; // 서비스 오류 코드

export const SESSION_MESSAGES = defineText( // 세션 안내 문구
    { // 한국어 시작
        temporaryAI: "임시 인공지능", // 기본 AI 이름
        customAI: "사용자 지정 인공지능", // 이름 없는 AI
        parseFailed: "응답을 해석하지 못했습니다.", // 해석 실패
        engineFailed: "게임 상태를 변경하지 못했습니다.", // 엔진 실패
        choiceFailed: "선택지를 적용하지 못했습니다.", // 선택지 실패
        autoSaved: "자동 저장했습니다.", // 자동 저장
        saved: "저장했습니다.", // 수동 저장
        saveFailed: "플레이는 계속할 수 있지만 저장하지 못했습니다.", // 저장 실패
        loaded: "저장한 게임을 불러왔습니다.", // 불러오기
        removed: "저장 데이터를 삭제했습니다.", // 삭제
        aborted: "응답 생성을 중지했습니다.", // 생성 중지
        generationFailed: "응답을 생성하지 못했습니다.", // 알 수 없는 오류
        errors: // 서비스 오류
        { // 오류 시작
            "authentication-required": "로그인이 필요합니다.", // 인증
            "insufficient-credit": "AI 서비스 크레딧이 부족합니다.", // 크레딧
            "rate-limited": "요청이 많습니다. 잠시 후 다시 시도하세요.", // 요청 제한
            unavailable: "AI 서비스에 연결할 수 없습니다.", // 연결
            "model-unavailable": "선택한 로컬 모델이 설치되어 있지 않습니다.", // 모델 누락
            "local-ai-not-ready": "내장 AI가 아직 준비되지 않았습니다. 다른 AI를 선택해 주세요.", // 내장 AI 미준비
            "invalid-response": "AI 서비스 응답 형식이 올바르지 않습니다.", // 응답 형식
        } satisfies Record<LLMServiceErrorCode, string>, // 오류 종료(모든 오류 코드 필수)
    }, // 한국어 종료
    { // 영어 시작
        temporaryAI: "Temporary AI", // 기본 AI 이름
        customAI: "Custom AI", // 이름 없는 AI
        parseFailed: "Could not read the response.", // 해석 실패
        engineFailed: "Could not change the game state.", // 엔진 실패
        choiceFailed: "Could not apply the choice.", // 선택지 실패
        autoSaved: "Auto-saved.", // 자동 저장
        saved: "Saved.", // 수동 저장
        saveFailed: "You can keep playing, but the game could not be saved.", // 저장 실패
        loaded: "Loaded the saved game.", // 불러오기
        removed: "Deleted the save data.", // 삭제
        aborted: "Stopped generating the response.", // 생성 중지
        generationFailed: "Could not generate a response.", // 알 수 없는 오류
        errors: // 서비스 오류
        { // 오류 시작
            "authentication-required": "Sign-in is required.", // 인증
            "insufficient-credit": "Not enough AI service credits.", // 크레딧
            "rate-limited": "Too many requests. Please try again shortly.", // 요청 제한
            unavailable: "Could not connect to the AI service.", // 연결
            "model-unavailable": "The selected local model is not installed.", // 모델 누락
            "local-ai-not-ready": "The built-in AI is not ready yet. Please choose another AI.", // 내장 AI 미준비
            "invalid-response": "The AI service response format is invalid.", // 응답 형식
        }, // 오류 종료
    }, // 영어 종료
); // 문구 종료
