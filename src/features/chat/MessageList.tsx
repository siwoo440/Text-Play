import type { Message } from "@/features/core/types"; // 메시지 타입

export function MessageList({ messages }: { messages: Message[] }) // 메시지 목록
{ // 함수 시작
    return ( // 목록 반환
        <ol aria-label="대화 메시지" aria-live="polite"> {/* 메시지 영역 */}
            {messages.map((message) => <li key={message.id} data-role={message.role}><strong>{message.role === "user" ? "나" : "캐릭터"}</strong><p>{message.content}</p></li>)} {/* 메시지 항목 */}
        </ol> // 영역 종료
    ); // 반환 종료
} // 함수 종료
