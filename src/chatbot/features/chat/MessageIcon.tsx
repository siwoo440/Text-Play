import type { ReactNode } from "react"; // 리액트 노드 타입

export type MessageIconName = "copy" | "edit" | "delete" | "regenerate" | "bookmark" | "scene-card"; // 메시지 동작 그림 이름

const iconPaths: Record<MessageIconName, ReactNode> = // 그림별 선(가로세로 24 기준, 선 색은 버튼 글자색을 따름)
{ // 목록 시작
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></>, // 복사: 겹친 종이 두 장
    edit: <><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17z" /><path d="M13.5 7.5l3 3" /></>, // 수정: 연필
    delete: <><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6.5 7l1 12a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1l1-12" /><path d="M10 11v5M14 11v5" /></>, // 삭제: 휴지통
    regenerate: <><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v5h-5" /></>, // 다시 생성: 돌아가는 화살표
    bookmark: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />, // 책갈피: 책갈피 띠
    "scene-card": <><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M5 17l4.5-4.5 3.5 3.5 2.5-2.5L19 17" /></>, // 명장면 카드: 그림 한 장
}; // 목록 종료

export function MessageIcon({ name }: { name: MessageIconName }) // 메시지 동작 버튼 안의 작은 그림(이름은 버튼의 aria-label이 알려 주므로 그림은 읽기 도구에서 숨김)
{ // 함수 시작
    return <svg data-icon={name} aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</svg>; // 그림 반환
} // 함수 종료
