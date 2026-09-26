export type LLMServiceErrorCode = "authentication-required" | "insufficient-credit" | "rate-limited" | "unavailable" | "invalid-response"; // 서비스 오류 종류

export class LLMServiceError extends Error // LLM 서비스 오류
{ // 클래스 시작
    public readonly code: LLMServiceErrorCode; // 오류 코드

    public constructor(code: LLMServiceErrorCode) // 생성자
    { // 생성자 시작
        super(code); // 기본 오류 생성
        this.name = "LLMServiceError"; // 오류 이름
        this.code = code; // 오류 코드 저장
    } // 생성자 종료
} // 클래스 종료
