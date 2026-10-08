"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 링크
import { useState } from "react"; // 리액트 상태
import { useAccountSession } from "@chatbot/features/account/use-account-session"; // 계정 세션
import { memoryCategoryLabels } from "@chatbot/features/chat/memory-model"; // 메모리 분류 이름
import { useModelStatus } from "@chatbot/features/chat/use-model-status"; // 실제 AI 연결 상태
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { AccountManagement } from "@chatbot/features/settings/AccountManagement"; // 계정 관리
import { DataManagement } from "@chatbot/features/settings/DataManagement"; // 데이터 관리
import { describeExternalTransfer } from "@chatbot/features/settings/provider-summary"; // 외부 전송 안내
import { getMemoryGroups, getReportEntries } from "@chatbot/features/settings/settings-insights"; // 메모리·신고 요약
import { SettingsPageHeader } from "@chatbot/features/settings/SettingsShell"; // 페이지 머리말
import styles from "@chatbot/features/settings/SettingsScreen.module.css"; // 설정 스타일
import { localeTag, t } from "@chatbot/lib/i18n"; // 화면 글자 번역·날짜와 숫자 형식

function formatDate(value: string): string // 날짜 표시
{ // 함수 시작
    return new Intl.DateTimeFormat(localeTag(), { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(new Date(value)); // 한국 날짜 반환
} // 함수 종료

export function PrivacySettings() // 개인정보 및 보안 화면
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태 조회
    const [memoryStatus, setMemoryStatus] = useState(""); // 메모리 안내
    const [reportStatus, setReportStatus] = useState(""); // 신고 안내
    const groups = getMemoryGroups(state); // 대화방별 요약 메모리
    const reports = getReportEntries(state); // 내가 한 신고
    const transfer = describeExternalTransfer(useModelStatus()); // 외부 전송 안내(실제 AI가 켜져 있으면 어디로 보내는지)
    const account = useAccountSession(); // 지금 로그인한 계정
    const accountNote = account === null ? t("로그인하지 않음 · 이 브라우저에만 저장돼요") : account.provider === "practice" ? t("{0} · 연습용 계정(이 브라우저 안에서만 나뉘어요)", [account.name]) : t("{0} · 로그인함", [account.name]); // 계정 안내
    return ( // 화면 반환
        <> {/* 개인정보 화면 */}
            <SettingsPageHeader kicker="SUPPORT · PRIVACY" title={t("개인정보 및 보안")} description={t("내 데이터가 어디에 저장되는지 확인하고, 내보내기·백업·복구·초기화로 직접 관리합니다.")} /> {/* 페이지 머리말 */}
            <section className={styles.card} aria-labelledby="privacy-storage-title"> {/* 저장 위치 */}
                <h2 id="privacy-storage-title">{t("저장 위치와 전송")}</h2> {/* 저장 제목 */}
                <dl className={styles.infoGrid}> {/* 저장 정보 */}
                    <div><dt>{t("저장 위치")}</dt><dd>{t("이 브라우저의 로컬 저장공간(localStorage)")}</dd></div> {/* 저장 위치 */}
                    <div><dt>{t("외부 전송")}</dt><dd>{transfer}</dd></div> {/* 외부 전송 */}
                    <div><dt>{t("계정")}</dt><dd>{accountNote}</dd></div> {/* 계정 상태 */}
                </dl> {/* 저장 정보 종료 */}
                <p>{t("브라우저 데이터를 지우면 캐릭터와 대화도 함께 지워집니다. 중요한 변경 전에는 아래에서 JSON으로 내보내거나 로컬 백업을 만들어 두세요.")}</p> {/* 주의 안내 */}
            </section> {/* 저장 위치 종료 */}
            <AccountManagement /> {/* 계정 관리(로그인했을 때만) */}
            <div id="data"> {/* 데이터 관리 앵커 */}
                <DataManagement /> {/* 데이터 관리 */}
            </div> {/* 데이터 관리 앵커 종료 */}
            <section id="memories" className={styles.card} aria-labelledby="privacy-memory-title"> {/* 요약 메모리 */}
                <h2 id="privacy-memory-title">{t("요약 메모리")}</h2> {/* 메모리 제목 */}
                <p>{t("AI가 대화를 이어 가려고 기억해 둔 내용이에요. 모두")} {state.memories.length}{t("개가 있어요. 지우면 그 대화에서 더는 참고하지 않아요. 내용을 고치려면 그 대화의 채팅방 설정에서 요약 메모리를 여세요.")}</p> {/* 메모리 안내 */}
                {groups.length === 0 ? <p className={styles.note}>{t("아직 기억해 둔 내용이 없어요. 대화가 쌓이면 이곳에 대화방별로 모여요.")}</p> : ( // 빈 목록 판정
                    <div className={styles.faqList}> {/* 대화방 묶음 */}
                        {groups.map((group) => ( // 대화방 순회
                            <details key={group.conversationId}> {/* 대화방 */}
                                <summary>{t(group.title)} · {group.memories.length}{t("개")}</summary> {/* 대화방 이름과 개수 */}
                                <ul className={styles.rowList} aria-label={t("{0} 메모리", [group.title])}> {/* 메모리 목록 */}
                                    {group.memories.map((memory) => ( // 메모리 순회
                                        <li key={memory.id}> {/* 메모리 */}
                                            <div><strong>{t(memoryCategoryLabels[memory.category])}</strong><span>{memory.content}</span></div> {/* 분류와 내용 */}
                                            <button type="button" className={styles.danger} aria-label={t("{0} 삭제: {1}", [memoryCategoryLabels[memory.category], memory.content])} onClick={() => { dispatch({ type: "delete-memory", memoryId: memory.id }); setMemoryStatus(t("메모리를 지웠습니다.")); }}>{t("삭제")}</button> {/* 삭제 */}
                                        </li> // 메모리 종료
                                    ))} {/* 순회 종료 */}
                                </ul> {/* 목록 종료 */}
                                {group.href === null ? null : <Link className={styles.rowLink} href={group.href as Route}>{t("이 대화 열기")}</Link>} {/* 대화 이동 */}
                            </details> // 대화방 종료
                        ))} {/* 순회 종료 */}
                    </div> // 묶음 종료
                )} {/* 판정 종료 */}
                {memoryStatus.length === 0 ? null : <p className={styles.status} role="status">{memoryStatus}</p>} {/* 메모리 안내 */}
            </section> {/* 요약 메모리 종료 */}
            <section id="reports" className={styles.card} aria-labelledby="privacy-report-title"> {/* 내가 한 신고 */}
                <h2 id="privacy-report-title">{t("내가 한 신고")}</h2> {/* 신고 제목 */}
                <p>{t("신고 내용은 이 브라우저에만 저장돼요. 잘못 신고했다면 취소할 수 있어요.")}</p> {/* 신고 안내 */}
                {reports.length === 0 ? <p className={styles.note}>{t("신고한 캐릭터가 없어요.")}</p> : ( // 빈 목록 판정
                    <ul className={styles.rowList} aria-label={t("신고 기록")}> {/* 신고 목록 */}
                        {reports.map((report) => ( // 신고 순회
                            <li key={report.id}> {/* 신고 */}
                                <div><strong>{report.characterName}</strong><span>{t(report.reason)} · {formatDate(report.createdAt)}</span></div> {/* 캐릭터와 사유 */}
                                <button type="button" className={styles.secondary} aria-label={t("{0} 신고 취소", [report.characterName])} onClick={() => { dispatch({ type: "remove-character-report", reportId: report.id }); setReportStatus(t("{0} 신고를 취소했습니다.", [report.characterName])); }}>{t("신고 취소")}</button> {/* 취소 */}
                            </li> // 신고 종료
                        ))} {/* 순회 종료 */}
                    </ul> // 목록 종료
                )} {/* 판정 종료 */}
                {reportStatus.length === 0 ? null : <p className={styles.status} role="status">{reportStatus}</p>} {/* 신고 안내 */}
            </section> {/* 신고 종료 */}
            <section className={styles.card} aria-labelledby="privacy-policy-title"> {/* 정책 문서 */}
                <h2 id="privacy-policy-title">{t("정책 문서")}</h2> {/* 정책 제목 */}
                <p className={styles.note}>{t("개인정보처리방침과 이용약관은 서비스 운영 정책이 확정된 뒤 이곳에 게시됩니다.")}</p> {/* 준비 안내 */}
            </section> {/* 정책 문서 종료 */}
        </> // 개인정보 화면 종료
    ); // 반환 종료
} // 함수 종료
