export type LocalAIStreamEvent = // Rust 로컬 AI 스트림 사건(올라마·내장 AI 공통)
    | { type: "chunk"; content: string } // 응답 조각
    | { type: "done" } // 응답 완료
    | { type: "error"; message: string } // 응답 오류
    | { type: "cancelled" }; // 응답 중단
