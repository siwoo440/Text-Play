"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { useState } from "react"; // 리액트 상태
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { InviteSection } from "@chatbot/features/rewards/InviteSection"; // 친구 초대 칸
import { ATTENDANCE_CYCLE, attendanceRewards, getAttendanceView, getBonusView, getClaimableTokens, getMissionViews, type MissionView } from "@chatbot/features/rewards/reward-model"; // 출석·미션 규칙
import { SettingsPageHeader } from "@chatbot/features/settings/SettingsShell"; // 페이지 머리말
import settings from "@chatbot/features/settings/SettingsScreen.module.css"; // 설정 공통 스타일
import styles from "@chatbot/features/rewards/RewardsScreen.module.css"; // 보상 화면 스타일
import { localeTag, t } from "@chatbot/lib/i18n"; // 화면 글자 번역·날짜와 숫자 형식
import { getWeekDaysLeft, getWeeklyViews, type WeeklyMissionView } from "@chatbot/features/rewards/weekly-model"; // 주간 미션

const RECORD_PREVIEW = 10; // 화면에 보여 줄 받은 기록 수

function formatDateTime(value: string): string // 시각 표시
{ // 함수 시작
    return new Intl.DateTimeFormat(localeTag(), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value)); // 한국 시각 반환
} // 함수 종료

export function RewardsScreen() // 출석과 미션 화면
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const [notice, setNotice] = useState(""); // 받은 안내
    const today = new Date(); // 지금
    const attendance = getAttendanceView(state.rewards.attendance, today); // 출석 상태
    const missions = getMissionViews(state.rewards.missions, today); // 미션 상태
    const bonus = getBonusView(state.rewards.missions, today); // 보너스 상태
    const waiting = getClaimableTokens(state.rewards, today); // 지금 받을 수 있는 토큰
    const missionReady = missions.some((view) => view.claimable) || bonus.claimable; // 받을 미션 보상 여부
    const earned = state.tokenRecords.filter((record) => record.direction === "earn"); // 받은 기록(쓴 기록은 토큰 이용 내역에서)
    const weekly = getWeeklyViews(state.rewards, today); // 주간 미션 상태
    const weekDaysLeft = getWeekDaysLeft(today); // 이번 주 남은 날
    const claimWeekly = (view: WeeklyMissionView) => // 주간 미션 보상 받기
    { // 함수 시작
        dispatch({ type: "claim-weekly-mission", missionId: view.definition.id, now: new Date().toISOString() }); // 보상 지급
        setNotice(t("‘{0}’ 보상 {1}토큰을 받았습니다.", [view.definition.title, view.definition.reward])); // 안내
    }; // 함수 종료
    const stamp = () => // 출석하기
    { // 함수 시작
        dispatch({ type: "check-attendance", now: new Date().toISOString() }); // 도장과 보상
        setNotice(t("출석 {0}일차 도장을 찍고 {1}토큰을 받았습니다.", [attendance.nextDay, attendance.nextReward])); // 안내
    }; // 함수 종료
    const claim = (view: MissionView) => // 미션 보상 받기
    { // 함수 시작
        dispatch({ type: "claim-mission", missionId: view.definition.id, now: new Date().toISOString() }); // 보상 지급
        setNotice(t("‘{0}’ 보상 {1}토큰을 받았습니다.", [view.definition.title, view.definition.reward])); // 안내
    }; // 함수 종료
    const claimBonus = () => // 보너스 받기
    { // 함수 시작
        dispatch({ type: "claim-mission-bonus", now: new Date().toISOString() }); // 보너스 지급
        setNotice(t("미션을 모두 끝낸 보너스 {0}토큰을 받았습니다.", [bonus.reward])); // 안내
    }; // 함수 종료
    const claimAll = () => // 받을 수 있는 미션 보상 모두 받기
    { // 함수 시작
        const now = new Date().toISOString(); // 받은 시각
        const ready = missions.filter((view) => view.claimable); // 받을 미션
        ready.forEach((view) => dispatch({ type: "claim-mission", missionId: view.definition.id, now })); // 미션 보상
        if (bonus.claimable) // 보너스 판정
        { // 조건 시작
            dispatch({ type: "claim-mission-bonus", now }); // 보너스
        } // 조건 종료
        setNotice(t("미션 보상 {0}토큰을 한 번에 받았습니다.", [ready.reduce((sum, view) => sum + view.definition.reward, 0) + (bonus.claimable ? bonus.reward : 0)])); // 안내
    }; // 함수 종료
    return ( // 화면 반환
        <> {/* 출석과 미션 */}
            <SettingsPageHeader kicker="ACCOUNT · REWARDS" title={t("출석과 미션")} description={t("매일 출석 도장을 찍고 오늘의 미션을 채우면 토큰을 조금씩 받을 수 있어요. 친구를 초대하면 친구도 환영 토큰을 받아요.")} /> {/* 페이지 머리말 */}
            <section className={settings.statGrid} aria-label={t("보상 요약")}> {/* 요약 */}
                <div className={settings.stat}><span>{t("보유 토큰")}</span><strong>{state.wallet.balance.toLocaleString()}</strong><small>{waiting > 0 ? t("지금 {0}토큰을 받을 수 있어요", [waiting]) : t("오늘 받을 보상을 모두 받았어요")}</small></div> {/* 잔액 */}
                <div className={settings.stat}><span>{t("이번 도장판")}</span><strong>{attendance.stamped}/{ATTENDANCE_CYCLE}</strong><small>{t("누적 출석")} {attendance.totalDays}{t("일")}</small></div> {/* 출석 */}
                <div className={settings.stat}><span>{t("오늘의 미션")}</span><strong>{bonus.done}/{bonus.total}</strong><small>{t("지금까지 받은 토큰")} {state.rewards.totalEarned.toLocaleString()}</small></div> {/* 미션 */}
            </section> {/* 요약 종료 */}
            <p className={styles.notice} role="status">{notice}</p> {/* 받은 안내 */}
            <section className={settings.card} aria-labelledby="rewards-attendance-title"> {/* 출석 */}
                <h2 id="rewards-attendance-title">{t("출석 도장판")}</h2> {/* 제목 */}
                <p>{t("하루에 한 번 도장을 찍어요. 7일을 이어서 채우면 7일차에 20토큰을 받고, 하루라도 빠지면 1일차부터 다시 시작해요.")}</p> {/* 설명 */}
                <ol className={styles.stampBoard} aria-label={t("출석 도장판")}> {/* 도장판 */}
                    {attendanceRewards.map((reward, index) => // 칸 순회
                    { // 순회 시작
                        const day = index + 1; // 일차
                        const status = day <= attendance.stamped ? "done" : day === attendance.nextDay && attendance.canCheck ? "today" : "todo"; // 칸 상태
                        const statusLabel = status === "done" ? t("출석 완료") : status === "today" ? t("오늘 찍을 칸") : t("아직"); // 상태 이름
                        return <li key={day} data-state={status} data-final={day === ATTENDANCE_CYCLE ? "true" : undefined} aria-label={t("{0}일차, {1}토큰, {2}", [day, reward, statusLabel])}><span>{day}{t("일차")}</span><strong aria-hidden="true">{status === "done" ? "✓" : `+${reward}`}</strong></li>; // 칸
                    })} {/* 순회 종료 */}
                </ol> {/* 도장판 종료 */}
                <button type="button" className={settings.primary} disabled={!attendance.canCheck} onClick={stamp}>{attendance.canCheck ? t("출석하기 · +{0}토큰", [attendance.nextReward]) : t("오늘 출석 완료")}</button> {/* 출석 버튼 */}
            </section> {/* 출석 종료 */}
            <section className={settings.card} aria-labelledby="rewards-mission-title"> {/* 미션 */}
                <h2 id="rewards-mission-title">{t("오늘의 미션")}</h2> {/* 제목 */}
                <p>{t("매일 자정(한국 시간)에 새로 시작해요. 받지 않은 보상은 날짜가 바뀌면 사라지니 잊지 말고 받아 주세요.")}</p> {/* 설명 */}
                <ul className={styles.missionList} aria-label={t("오늘의 미션 목록")}> {/* 미션 목록 */}
                    {missions.map((view) => ( // 미션 순회
                        <li key={view.definition.id} data-state={view.claimed ? "claimed" : view.claimable ? "ready" : "open"}> {/* 미션 */}
                            <div className={styles.missionCopy}><strong>{t(view.definition.title)}</strong><small>{t(view.definition.description)}</small></div> {/* 이름과 설명 */}
                            <div className={styles.missionProgress}><div role="progressbar" aria-label={t("{0} 진행", [view.definition.title])} aria-valuemin={0} aria-valuemax={view.definition.target} aria-valuenow={view.progress}><span style={{ width: `${(view.progress / view.definition.target) * 100}%` }} /></div><span>{view.progress}/{view.definition.target}</span></div> {/* 진행 */}
                            {view.claimed ? <span className={styles.claimed}>{t("받음")}</span> : view.claimable ? <button type="button" className={styles.claim} aria-label={t("{0} 보상 {1}토큰 받기", [view.definition.title, view.definition.reward])} onClick={() => claim(view)}>{t("받기 · +")}{view.definition.reward}</button> : <Link href={view.definition.href as Route} className={styles.go} aria-label={`${t(view.definition.title)}, ${t(view.definition.actionLabel)}`}>+{view.definition.reward} · {t(view.definition.actionLabel)}</Link>} {/* 받기·이동 */}
                        </li> // 미션 종료
                    ))} {/* 순회 종료 */}
                    <li data-state={bonus.claimed ? "claimed" : bonus.claimable ? "ready" : "open"} data-bonus="true"> {/* 보너스 */}
                        <div className={styles.missionCopy}><strong>{t("세 가지 모두 완료 보너스")}</strong><small>{t("오늘의 미션을 모두 채우면 받을 수 있어요.")}</small></div> {/* 이름과 설명 */}
                        <div className={styles.missionProgress}><div role="progressbar" aria-label={t("모두 완료 보너스 진행")} aria-valuemin={0} aria-valuemax={bonus.total} aria-valuenow={bonus.done}><span style={{ width: `${(bonus.done / bonus.total) * 100}%` }} /></div><span>{bonus.done}/{bonus.total}</span></div> {/* 진행 */}
                        {bonus.claimed ? <span className={styles.claimed}>{t("받음")}</span> : bonus.claimable ? <button type="button" className={styles.claim} aria-label={t("모두 완료 보너스 {0}토큰 받기", [bonus.reward])} onClick={claimBonus}>{t("받기 · +")}{bonus.reward}</button> : <span className={styles.locked}>+{bonus.reward}</span>} {/* 받기 */}
                    </li> {/* 보너스 종료 */}
                </ul> {/* 미션 목록 종료 */}
                <button type="button" className={settings.secondary} disabled={!missionReady} onClick={claimAll}>{t("미션 보상 모두 받기")}</button> {/* 모두 받기 */}
            </section> {/* 미션 종료 */}
            <section id="weekly" className={settings.card} aria-labelledby="rewards-weekly-title"> {/* 주간 미션 */}
                <h2 id="rewards-weekly-title">{t("주간 미션")}</h2> {/* 제목 */}
                <p>{t("매주 월요일 0시(한국 시간)에 새로 시작해요. 이번 주는 {0}일 남았어요. 받지 않은 보상은 주가 바뀌면 사라져요.", [weekDaysLeft])}</p> {/* 설명 */}
                <ul className={styles.missionList} aria-label={t("주간 미션 목록")}> {/* 미션 목록 */}
                    {weekly.map((view) => ( // 미션 순회
                        <li key={view.definition.id} data-state={view.claimed ? "claimed" : view.claimable ? "ready" : "open"}> {/* 미션 */}
                            <div className={styles.missionCopy}><strong>{t(view.definition.title)}</strong><small>{t(view.definition.description)}</small></div> {/* 이름과 설명 */}
                            <div className={styles.missionProgress}><div role="progressbar" aria-label={t("{0} 진행", [view.definition.title])} aria-valuemin={0} aria-valuemax={view.definition.target} aria-valuenow={view.progress}><span style={{ width: `${(view.progress / view.definition.target) * 100}%` }} /></div><span>{view.progress}/{view.definition.target}</span></div> {/* 진행 */}
                            {view.claimed ? <span className={styles.claimed}>{t("받음")}</span> : view.claimable ? <button type="button" className={styles.claim} aria-label={t("{0} 보상 {1}토큰 받기", [view.definition.title, view.definition.reward])} onClick={() => claimWeekly(view)}>{t("받기 · +")}{view.definition.reward}</button> : view.definition.href === "/rewards" ? <span className={styles.locked}>+{view.definition.reward}</span> : <Link href={view.definition.href as Route} className={styles.go} aria-label={`${t(view.definition.title)}, ${t(view.definition.actionLabel)}`}>+{view.definition.reward} · {t(view.definition.actionLabel)}</Link>} {/* 받기·하러 가기(출석은 이 화면에서 하므로 보상만 표시) */}
                        </li> // 미션 종료
                    ))} {/* 순회 종료 */}
                </ul> {/* 미션 목록 종료 */}
            </section> {/* 주간 미션 종료 */}
            <InviteSection /> {/* 친구 초대 */}
            <section className={settings.card} aria-labelledby="rewards-record-title"> {/* 받은 기록 */}
                <h2 id="rewards-record-title">{t("받은 기록")}</h2> {/* 제목 */}
                {earned.length === 0 ? <p>{t("아직 받은 토큰이 없어요. 출석 도장부터 찍어 보세요.")}</p> : ( // 기록 판정
                    <ol className={styles.records} aria-label={t("받은 토큰 기록")}> {/* 기록 목록 */}
                        {earned.slice(0, RECORD_PREVIEW).map((record) => <li key={record.id}><div><strong>{t(record.label)}</strong><small>{formatDateTime(record.createdAt)} {t("· 잔액")} {record.balance.toLocaleString()}</small></div><b>+{record.amount}</b></li>)} {/* 기록 */}
                    </ol> // 기록 목록 종료
                )} {/* 기록 판정 종료 */}
                <p className={settings.note}>{t("출석과 미션 기록은 지금 사용하는 브라우저에만 저장돼요. 계정 로그인이 연결되면 다른 기기에서도 이어집니다.")}</p> {/* 저장 안내 */}
            </section> {/* 받은 기록 종료 */}
        </> // 출석과 미션 종료
    ); // 반환 종료
} // 함수 종료
