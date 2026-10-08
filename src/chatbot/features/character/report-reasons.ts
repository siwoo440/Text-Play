// 신고 사유: 신고 창과 설정의 신고 기록이 같은 이름을 쓴다.
import type { ReportReason } from "@chatbot/features/core/types"; // 신고 사유 타입

export const reportReasonOptions: Array<{ id: ReportReason; label: string; description: string }> = // 신고 사유 목록
[ // 목록 시작
    { id: "incorrect-rating", label: "연령 등급이 부정확함", description: "표시된 이용 등급과 실제 내용이 다름" }, // 등급 사유
    { id: "harmful-content", label: "유해하거나 불편한 콘텐츠", description: "폭력적이거나 안전하지 않은 내용 포함" }, // 유해 사유
    { id: "copyright", label: "저작권 또는 권리 침해", description: "타인의 창작물이나 권리를 침해함" }, // 권리 사유
    { id: "spam", label: "스팸 또는 반복 콘텐츠", description: "의미 없는 홍보나 반복 내용 포함" }, // 스팸 사유
    { id: "other", label: "기타 문제", description: "위 항목에 포함되지 않는 문제" }, // 기타 사유
]; // 목록 종료

export const reportReasonLabels = Object.fromEntries(reportReasonOptions.map((item) => [item.id, item.label])) as Record<ReportReason, string>; // 사유별 이름
