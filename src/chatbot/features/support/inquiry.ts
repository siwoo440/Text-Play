// 문의 초안: 문의 글을 미리 쓰고 진단 정보와 함께 복사할 글을 만든다. 접수 창구가 열리기 전에도 쓸 수 있다.
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export type InquiryKind = "bug" | "idea" | "data" | "etc"; // 문의 종류

export interface InquiryDraft // 문의 초안
{ // 구조 시작
    kind: InquiryKind; // 종류
    title: string; // 제목
    body: string; // 내용
    includeDiagnostics: boolean; // 진단 정보를 함께 넣을지
} // 구조 종료

export const INQUIRY_TITLE_LIMIT = 60; // 제목 글자 수 한도
export const INQUIRY_BODY_LIMIT = 1000; // 내용 글자 수 한도

export const inquiryKinds: Array<{ id: InquiryKind; label: string }> = [{ id: "bug", label: "오류 신고" }, { id: "idea", label: "기능 제안" }, { id: "data", label: "저장과 데이터" }, { id: "etc", label: "기타" }]; // 문의 종류 목록

export function createInquiryDraft(): InquiryDraft // 빈 초안
{ // 함수 시작
    return { kind: "bug", title: "", body: "", includeDiagnostics: true }; // 초안 반환
} // 함수 종료

export function validateInquiry(draft: InquiryDraft): { title?: string; body?: string } // 초안 검사
{ // 함수 시작
    const errors: { title?: string; body?: string } = {}; // 오류 모음
    const title = draft.title.trim(); // 제목
    const body = draft.body.trim(); // 내용
    if (title.length === 0) // 제목 없음
    { // 조건 시작
        errors.title = t("제목을 적어 주세요."); // 제목 오류
    } // 조건 종료
    else if (title.length > INQUIRY_TITLE_LIMIT) // 제목 김
    { // 조건 시작
        errors.title = t("제목은 {0}자까지 적을 수 있어요.", [INQUIRY_TITLE_LIMIT]); // 제목 길이 오류
    } // 조건 종료
    if (body.length === 0) // 내용 없음
    { // 조건 시작
        errors.body = t("내용을 적어 주세요."); // 내용 오류
    } // 조건 종료
    else if (body.length > INQUIRY_BODY_LIMIT) // 내용 김
    { // 조건 시작
        errors.body = t("내용은 {0}자까지 적을 수 있어요.", [INQUIRY_BODY_LIMIT]); // 내용 길이 오류
    } // 조건 종료
    return errors; // 오류 반환
} // 함수 종료

export function buildInquiryText(draft: InquiryDraft, diagnostics: string): string // 복사할 문의 글(화면 언어로)
{ // 함수 시작
    const kind = inquiryKinds.find((item) => item.id === draft.kind)?.label ?? "기타"; // 종류 이름
    const lines = [`[${t("문의 종류")}] ${t(kind)}`, `[${t("제목")}] ${draft.title.trim()}`, `[${t("내용")}]`, draft.body.trim()]; // 문의 글
    if (draft.includeDiagnostics) // 진단 정보 포함
    { // 조건 시작
        lines.push("", `[${t("진단 정보")}]`, diagnostics); // 진단 정보 붙임
    } // 조건 종료
    return lines.join("\n"); // 글 반환
} // 함수 종료
