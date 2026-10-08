import type { ReactNode } from "react"; // 자식 요소 타입
import styles from "@chatbot/components/feedback/StatusScreen.module.css"; // 상태 화면 스타일

export type StatusTone = "not-found" | "error" | "restricted" | "invite"; // 상태 종류(invite: 친구 초대)

interface StatusScreenProps // 상태 화면 속성
{ // 구조 시작
    tone: StatusTone; // 상태 종류
    label: string; // 상단 표제
    title: string; // 화면 제목
    description: string; // 안내 문구
    children?: ReactNode; // 이동·복구 동작
} // 구조 종료

const symbols: Record<StatusTone, string> = { "not-found": "?", error: "!", restricted: "×", invite: "🎁" }; // 상태 기호

export function StatusScreen({ tone, label, title, description, children }: StatusScreenProps) // 공통 상태 화면
{ // 함수 시작
    return ( // 화면 반환
        <main className={styles.page} data-surface="light"> {/* 상태 화면 */}
            <section className={styles.panel} data-tone={tone} aria-labelledby="status-screen-title" role={tone === "error" ? "alert" : undefined}> {/* 안내 카드 */}
                <span className={styles.symbol} aria-hidden="true">{symbols[tone]}</span> {/* 상태 기호 */}
                <p className={styles.label}>{label}</p> {/* 상단 표제 */}
                <h1 id="status-screen-title">{title}</h1> {/* 화면 제목 */}
                <p className={styles.description}>{description}</p> {/* 안내 문구 */}
                {children === undefined ? null : <div className={styles.actions}>{children}</div>} {/* 동작 영역 */}
            </section> {/* 안내 카드 종료 */}
        </main> // 화면 종료
    ); // 반환 종료
} // 함수 종료
