import type { Conversation } from "@chatbot/features/core/types"; // 대화 타입
import styles from "@chatbot/features/character/CharacterDetail.module.css"; // 상세 화면 스타일
import { localeTag, t } from "@chatbot/lib/i18n"; // 화면 글자 번역·날짜와 숫자 형식

interface CharacterActionBarProps // 대화 동작 속성
{ // 구조 시작
    latestConversation: Conversation | null; // 최근 활성 대화
    creating: boolean; // 생성 진행 상태
    onContinue(): void; // 이어하기 처리
    onStart(): void; // 새 대화 처리
} // 구조 종료

function formatRecentTime(value: string): string // 최근 시각 표시
{ // 함수 시작
    return new Intl.DateTimeFormat(localeTag(), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value)); // 한국 시각 반환
} // 함수 종료

export function CharacterActionBar({ latestConversation, creating, onContinue, onStart }: CharacterActionBarProps) // 캐릭터 대화 동작
{ // 함수 시작
    return ( // 동작 반환
        <section className={styles.actionBar} aria-label={t("대화 시작 동작")}> {/* 고정 동작 영역 */}
            <div className={styles.actionSummary}> {/* 최근 대화 요약 */}
                <span className={styles.actionPulse} aria-hidden="true" /> {/* 상태 점 */}
                <div> {/* 요약 문구 */}
                    <small>{latestConversation === null ? t("새로운 이야기를 시작해 보세요") : t("최근 대화 · {0}", [formatRecentTime(latestConversation.updatedAt)])}</small> {/* 최근 상태 */}
                    <strong>{latestConversation?.title ?? t("첫 장면이 준비되었습니다")}</strong> {/* 최근 제목 */}
                </div> {/* 문구 종료 */}
            </div> {/* 요약 종료 */}
            <div className={styles.actionButtons}> {/* 동작 버튼 목록 */}
                {latestConversation === null ? null : <button type="button" className={styles.secondaryAction} onClick={onContinue}>{t("최근 대화 이어하기")}</button>} {/* 이어하기 버튼 */}
                <button type="button" className={styles.primaryAction} disabled={creating} onClick={onStart}>{creating ? t("대화 준비 중…") : t("새 대화 시작")}</button> {/* 새 대화 버튼 */}
            </div> {/* 버튼 목록 종료 */}
        </section> // 동작 영역 종료
    ); // 반환 종료
} // 함수 종료
