"use client"; // 클라이언트 컴포넌트

import Image from "@/desktop/next-compat/image"; // 최적화 이미지
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { useAdultAccess } from "@chatbot/features/adult/useAdultAccess"; // 성인 콘텐츠 접근
import styles from "@chatbot/features/adult/AdultAccess.module.css"; // 성인 인증 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export interface AdultGateSubject // 잠금 대상
{ // 구조 시작
    kind: "character" | "story"; // 대상 종류
    name: string; // 대상 이름
    coverImage: string; // 대표 이미지
} // 구조 종료

export function AdultContentGate({ subject, target }: { subject: AdultGateSubject; target: "detail" | "chat" }) // 19세 잠금 화면
{ // 함수 시작
    const access = useAdultAccess(); // 접근 도구
    const kindLabel = subject.kind === "story" ? t("스토리") : t("캐릭터"); // 대상 종류 이름
    const content = target === "chat" ? t("대화") : t("상세 정보와 대화"); // 잠긴 내용
    return ( // 잠금 화면 반환
        <main className={styles.gate} data-surface="light"> {/* 잠금 본문 */}
            <section className={styles.gateCard} aria-labelledby="adult-gate-title"> {/* 잠금 카드 */}
                <div className={styles.gateMedia} aria-hidden="true"> {/* 흐린 이미지 */}
                    <Image src={subject.coverImage} alt="" width={360} height={480} /> {/* 대표 이미지 */}
                    <span className={styles.lockMark}>19</span> {/* 잠금 표시 */}
                </div> {/* 이미지 종료 */}
                <div className={styles.gateCopy}> {/* 잠금 문구 */}
                    <p className={styles.eyebrow}>19+ LOCKED</p> {/* 영문 표제 */}
                    <h1 id="adult-gate-title">{t("19세 이상 이용 가능한")} {kindLabel}{t("입니다")}</h1> {/* 잠금 제목 */}
                    <p className={styles.gateName}>{subject.name}</p> {/* 대상 이름 */}
                    <p>{access.verified ? t("헤더의 19+ 스위치를 켜면 이 {0}의 {1}를 볼 수 있습니다.", [kindLabel, content]) : t("성인 인증을 마치고 19+를 켜면 이 {0}의 {1}를 볼 수 있습니다.", [kindLabel, content])}</p> {/* 잠금 설명 */}
                    {access.expired ? <p className={styles.gateNote}>{t("성인 인증 기간이 끝났습니다. 다시 인증해 주세요.")}</p> : null} {/* 만료 안내 */}
                    <div className={styles.gateActions}> {/* 잠금 동작 */}
                        <button type="button" className={styles.primary} onClick={access.enable}>{access.verified ? t("19+ 켜고 보기") : t("성인 인증하고 보기")}</button> {/* 해제 버튼 */}
                        <Link href="/" className={styles.secondary}>{t("메인으로 돌아가기")}</Link> {/* 메인 링크 */}
                    </div> {/* 동작 종료 */}
                </div> {/* 문구 종료 */}
            </section> {/* 카드 종료 */}
            {access.dialog} {/* 성인 인증 창 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료
