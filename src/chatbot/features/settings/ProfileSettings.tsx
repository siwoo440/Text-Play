"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 링크
import { useState } from "react"; // 리액트 상태
import { formatVerificationDate } from "@chatbot/features/adult/adult-access"; // 인증 날짜 표시
import { useAdultAccess } from "@chatbot/features/adult/useAdultAccess"; // 성인 콘텐츠 접근
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { getActivitySummary, getFollowedCreators } from "@chatbot/features/settings/settings-insights"; // 활동 요약·팔로우 목록
import { SettingsPageHeader } from "@chatbot/features/settings/SettingsShell"; // 페이지 머리말
import { validateProfileSettings, type ProfileSettingsErrors } from "@chatbot/features/settings/settings-validation"; // 프로필 검증
import styles from "@chatbot/features/settings/SettingsScreen.module.css"; // 설정 스타일
import { localeTag, t, tc } from "@chatbot/lib/i18n"; // 화면 글자 번역
import { membershipPlans, membershipRows } from "@chatbot/features/settings/membership"; // 멤버십 비교표
import { formatUsageDuration } from "@chatbot/features/safety/usage-time"; // 이용 시간 표시
import { readTodayUsageMs } from "@chatbot/features/safety/useUsageReminder"; // 오늘 이용 시간

const membershipLabels = { free: "FREE", plus: "PLUS", creator: "CREATOR" } as const; // 멤버십 표시

function formatDate(value: string): string // 날짜 표시
{ // 함수 시작
    return new Intl.DateTimeFormat(localeTag(), { dateStyle: "long", timeZone: "Asia/Seoul" }).format(new Date(value)); // 한국 날짜 반환
} // 함수 종료

export function ProfileSettings() // 프로필 관리 화면
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태 조회
    const [draft, setDraft] = useState({ nickname: state.profile.nickname, avatar: state.profile.avatar }); // 프로필 초안
    const [errors, setErrors] = useState<ProfileSettingsErrors>({}); // 입력 오류
    const [status, setStatus] = useState(""); // 저장 상태
    const [adultStatus, setAdultStatus] = useState(""); // 성인 인증 안내
    const [followStatus, setFollowStatus] = useState(""); // 팔로우 안내
    const activity = getActivitySummary(state); // 내 활동 수
    const creators = getFollowedCreators(state); // 팔로우한 제작자
    const activityItems = [{ label: t("만든 캐릭터"), value: activity.characters }, { label: t("만든 스토리"), value: activity.stories }, { label: t("대화방"), value: activity.conversations }, { label: tc("count", "좋아요"), value: activity.likes }, { label: tc("count", "보관"), value: activity.bookmarks }, { label: t("팔로우"), value: activity.follows }]; // 활동 칸
    const adult = useAdultAccess({ enableOnVerify: false }); // 성인 인증 도구
    const verification = state.profile.adultVerification; // 저장된 인증
    const adultState = adult.verified ? t("ON · 인증 완료") : adult.expired ? t("OFF · 기간 만료") : t("OFF · 인증 전"); // 인증 상태 문구
    const adultGuide = !adult.verified ? t("성인 인증을 마치면 헤더의 19+ 스위치로 19세 이용가 캐릭터를 켜고 끌 수 있습니다.") : adult.enabled ? t("19+ 콘텐츠를 표시하고 있습니다. 헤더의 19+ 스위치로 끌 수 있습니다.") : t("헤더의 19+ 스위치를 켜면 19세 이용가 캐릭터가 보입니다."); // 인증 안내 문구
    const revokeAdult = () => // 성인 인증 해제
    { // 함수 시작
        adult.revoke(); // 인증 해제
        setAdultStatus(t("성인 인증을 해제하고 19+ 콘텐츠를 숨겼습니다.")); // 해제 안내
    }; // 함수 종료
    const save = () => // 프로필 저장 함수
    { // 함수 시작
        const nextErrors = validateProfileSettings(draft); // 입력 검증
        setErrors(nextErrors); // 오류 반영
        if (Object.keys(nextErrors).length > 0) // 오류 존재 확인
        { // 조건 시작
            setStatus(""); // 성공 상태 해제
            return; // 저장 중단
        } // 조건 종료
        dispatch({ type: "update-profile", profile: { nickname: draft.nickname.trim(), avatar: draft.avatar.trim() } }); // 프로필 변경
        setStatus(t("저장했습니다.")); // 성공 상태 반영
    }; // 함수 종료
    return ( // 화면 반환
        <> {/* 프로필 화면 */}
            <SettingsPageHeader kicker="ACCOUNT · PROFILE" title={t("프로필 관리")} description={t("대화와 탐색 화면에 보이는 이름과 프로필 글자를 관리합니다.")} /> {/* 페이지 머리말 */}
            <section className={styles.profileCard} aria-label={t("프로필 미리보기")}> {/* 프로필 미리보기 */}
                <span className={styles.avatar} aria-hidden="true">{draft.avatar.trim() || "?"}</span> {/* 아바타 미리보기 */}
                <div> {/* 프로필 정보 */}
                    <h2>{draft.nickname.trim() || t("이름 없음")}</h2> {/* 이름 미리보기 */}
                    <div className={styles.badgeRow}> {/* 배지 묶음 */}
                        <span className={styles.badge}>{t(membershipLabels[state.profile.membership])} {t("멤버십")}</span> {/* 멤버십 배지 */}
                        <span className={styles.badge} data-adult={adult.verified ? "on" : "off"}>{t("성인 인증")} {adult.verified ? "ON" : "OFF"}</span> {/* 성인 인증 배지 */}
                    </div> {/* 배지 묶음 종료 */}
                    <p>{t("가입일")} {formatDate(state.profile.createdAt)} {t("· 이 브라우저에만 저장")}</p> {/* 가입 정보 */}
                </div> {/* 프로필 정보 종료 */}
            </section> {/* 프로필 미리보기 종료 */}
            <section className={styles.section} aria-labelledby="profile-form-title"> {/* 기본 정보 */}
                <h2 id="profile-form-title">{t("기본 정보")}</h2> {/* 영역 제목 */}
                <label>{t("닉네임")}<input value={draft.nickname} maxLength={21} onChange={(event) => setDraft({ ...draft, nickname: event.target.value })} /></label> {/* 닉네임 입력 */}
                {errors.nickname === undefined ? null : <p className={styles.error}>{errors.nickname}</p>} {/* 닉네임 오류 */}
                <label>{t("프로필 글자")}<input value={draft.avatar} maxLength={8} onChange={(event) => setDraft({ ...draft, avatar: event.target.value })} /></label> {/* 프로필 글자 입력 */}
                {errors.avatar === undefined ? null : <p className={styles.error}>{errors.avatar}</p>} {/* 프로필 글자 오류 */}
                <p>{t("프로필 사진 대신 보이는 글자입니다. 한두 글자를 권장합니다.")}</p> {/* 입력 안내 */}
                <button type="button" className={styles.primary} onClick={save}>{t("프로필 저장")}</button> {/* 저장 버튼 */}
                {status.length === 0 ? null : <p className={styles.status} role="status">{status}</p>} {/* 저장 안내 */}
            </section> {/* 기본 정보 종료 */}
            <section id="membership" className={styles.card} aria-labelledby="membership-title"> {/* 멤버십 비교 */}
                <h2 id="membership-title">{t("멤버십 비교")}</h2> {/* 영역 제목 */}
                <p>{t("지금은 결제가 연결되지 않아 모두 FREE로 이용합니다. PLUS와 CREATOR의 혜택과 가격은 예정안이라 바뀔 수 있어요.")}</p> {/* 예정안 안내 */}
                {/* 비교 표: 표 안 공백 텍스트는 하이드레이션 오류를 만들어 줄 끝 주석을 두지 않음 */}
                <div className={styles.tableScroll}><table className={styles.table} aria-label={t("멤버십 비교")}><thead><tr><th scope="col">{t("구분")}</th>{membershipPlans.map((plan) => <th key={plan.id} scope="col" data-current={plan.id === state.profile.membership ? "true" : undefined}>{plan.label}{plan.id === state.profile.membership ? <small>{t("이용 중")}</small> : null}</th>)}</tr></thead><tbody><tr><th scope="row">{t("이런 분께")}</th>{membershipPlans.map((plan) => <td key={plan.id}>{t(plan.summary)}</td>)}</tr>{membershipRows.map((row) => <tr key={row.label}><th scope="row">{t(row.label)}</th>{membershipPlans.map((plan) => <td key={plan.id}>{t(row.values[plan.id])}</td>)}</tr>)}</tbody></table></div>
                <button type="button" className={styles.primary} disabled>{t("멤버십 변경 준비 중")}</button> {/* 변경 버튼 */}
            </section> {/* 멤버십 비교 종료 */}
            <section className={styles.card} aria-labelledby="activity-title"> {/* 내 활동 */}
                <h2 id="activity-title">{t("내 활동")}</h2> {/* 영역 제목 */}
                <ul className={styles.statGrid} aria-label={t("활동 요약")}>{activityItems.map((item) => <li key={item.label} className={styles.stat}><span>{item.label}</span><strong>{item.value.toLocaleString(localeTag())}</strong></li>)}<li className={styles.stat}><span>{t("오늘 이용 시간")}</span><strong>{formatUsageDuration(readTodayUsageMs())}</strong><small>{t("이 브라우저의 모든 탭 합계 · 자정에 다시 셈")}</small></li></ul> {/* 활동 수와 오늘 이용 시간 */}
                <p><Link className={styles.inlineLink} href={"/library" as Route}>{t("내 캐릭터와 작품 열기")}</Link></p> {/* 보관함 링크 */}
            </section> {/* 내 활동 종료 */}
            <section className={styles.card} aria-labelledby="follow-title"> {/* 팔로우한 제작자 */}
                <h2 id="follow-title">{t("팔로우한 제작자")}</h2> {/* 영역 제목 */}
                {creators.length === 0 ? <p className={styles.note}>{t("아직 팔로우한 제작자가 없어요. 탐색이나 캐릭터 상세 화면에서 마음에 드는 제작자를 팔로우해 보세요.")}</p> : ( // 빈 목록 판정
                    <ul className={styles.rowList} aria-label={t("팔로우한 제작자 목록")}> {/* 제작자 목록 */}
                        {creators.map((creator) => ( // 제작자 순회
                            <li key={creator.creatorId}> {/* 제작자 */}
                                <div><strong>{creator.name}</strong><span>{t("작품")} {creator.works}{t("개")}</span></div> {/* 이름과 작품 수 */}
                                <button type="button" className={styles.secondary} aria-label={t("{0} 팔로우 해제", [creator.name])} onClick={() => { dispatch({ type: "toggle-creator-follow", creatorId: creator.creatorId }); setFollowStatus(t("{0} 팔로우를 해제했습니다.", [creator.name])); }}>{t("팔로우 해제")}</button> {/* 해제 */}
                            </li> // 제작자 종료
                        ))} {/* 순회 종료 */}
                    </ul> // 목록 종료
                )} {/* 판정 종료 */}
                {followStatus.length === 0 ? null : <p className={styles.status} role="status" aria-label={t("팔로우 안내")}>{followStatus}</p>} {/* 팔로우 안내 */}
            </section> {/* 팔로우 종료 */}
            <section id="adult" className={styles.card} aria-labelledby="adult-title"> {/* 성인 인증 */}
                <h2 id="adult-title">{t("성인 인증")}</h2> {/* 영역 제목 */}
                <dl className={styles.infoGrid}> {/* 인증 정보 */}
                    <div><dt>{t("인증 상태")}</dt><dd>{adultState}</dd></div> {/* 인증 상태 */}
                    <div><dt>{t("인증 방식")}</dt><dd>{verification === null ? t("없음") : t("모의 인증(Mock)")}</dd></div> {/* 인증 방식 */}
                    <div><dt>{t("유효 기간")}</dt><dd>{verification === null ? t("없음") : t("{0}까지", [formatVerificationDate(verification.expiresAt)])}</dd></div> {/* 유효 기간 */}
                </dl> {/* 인증 정보 종료 */}
                <p>{adultGuide}</p> {/* 인증 안내 */}
                <div className={styles.actionRow}> {/* 인증 동작 */}
                    {adult.verified ? <button type="button" className={styles.danger} onClick={revokeAdult}>{t("성인 인증 해제")}</button> : <button type="button" className={styles.primary} onClick={() => { setAdultStatus(""); adult.openVerification(); }}>{adult.expired ? t("다시 인증하기") : t("성인 인증하기")}</button>} {/* 인증·해제 버튼 */}
                </div> {/* 인증 동작 종료 */}
                {adultStatus.length === 0 ? null : <p className={styles.status} role="status">{adultStatus}</p>} {/* 인증 안내 */}
                <p className={styles.note}>{t("실제 출시 전에는 휴대폰 본인인증 업체 연동과 서버 측 인증 기록이 필요합니다. 지금은 이 브라우저에 인증 여부와 날짜만 저장합니다.")}</p> {/* 출시 안내 */}
                {adult.dialog} {/* 성인 인증 창 */}
            </section> {/* 성인 인증 종료 */}
        </> // 프로필 화면 종료
    ); // 반환 종료
} // 함수 종료
