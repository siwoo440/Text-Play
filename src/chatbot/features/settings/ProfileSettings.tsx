"use client"; // 클라이언트 컴포넌트

import { useState } from "react"; // 리액트 상태
import { formatVerificationDate } from "@chatbot/features/adult/adult-access"; // 인증 날짜 표시
import { useAdultAccess } from "@chatbot/features/adult/useAdultAccess"; // 성인 콘텐츠 접근
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { SettingsPageHeader } from "@chatbot/features/settings/SettingsShell"; // 페이지 머리말
import { validateProfileSettings, type ProfileSettingsErrors } from "@chatbot/features/settings/settings-validation"; // 프로필 검증
import styles from "@chatbot/features/settings/SettingsScreen.module.css"; // 설정 스타일

const membershipLabels = { free: "FREE", plus: "PLUS", creator: "CREATOR" } as const; // 멤버십 표시

function formatDate(value: string): string // 날짜 표시
{ // 함수 시작
    return new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeZone: "Asia/Seoul" }).format(new Date(value)); // 한국 날짜 반환
} // 함수 종료

export function ProfileSettings() // 프로필 관리 화면
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태 조회
    const [draft, setDraft] = useState({ nickname: state.profile.nickname, avatar: state.profile.avatar }); // 프로필 초안
    const [errors, setErrors] = useState<ProfileSettingsErrors>({}); // 입력 오류
    const [status, setStatus] = useState(""); // 저장 상태
    const [adultStatus, setAdultStatus] = useState(""); // 성인 인증 안내
    const adult = useAdultAccess({ enableOnVerify: false }); // 성인 인증 도구
    const verification = state.profile.adultVerification; // 저장된 인증
    const adultState = adult.verified ? "ON · 인증 완료" : adult.expired ? "OFF · 기간 만료" : "OFF · 인증 전"; // 인증 상태 문구
    const adultGuide = !adult.verified ? "성인 인증을 마치면 헤더의 19+ 스위치로 19세 이용가 캐릭터를 켜고 끌 수 있습니다." : adult.enabled ? "19+ 콘텐츠를 표시하고 있습니다. 헤더의 19+ 스위치로 끌 수 있습니다." : "헤더의 19+ 스위치를 켜면 19세 이용가 캐릭터가 보입니다."; // 인증 안내 문구
    const revokeAdult = () => // 성인 인증 해제
    { // 함수 시작
        adult.revoke(); // 인증 해제
        setAdultStatus("성인 인증을 해제하고 19+ 콘텐츠를 숨겼습니다."); // 해제 안내
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
        setStatus("저장했습니다."); // 성공 상태 반영
    }; // 함수 종료
    return ( // 화면 반환
        <> {/* 프로필 화면 */}
            <SettingsPageHeader kicker="ACCOUNT · PROFILE" title="프로필 관리" description="대화와 탐색 화면에 보이는 이름과 프로필 글자를 관리합니다." /> {/* 페이지 머리말 */}
            <section className={styles.profileCard} aria-label="프로필 미리보기"> {/* 프로필 미리보기 */}
                <span className={styles.avatar} aria-hidden="true">{draft.avatar.trim() || "?"}</span> {/* 아바타 미리보기 */}
                <div> {/* 프로필 정보 */}
                    <h2>{draft.nickname.trim() || "이름 없음"}</h2> {/* 이름 미리보기 */}
                    <div className={styles.badgeRow}> {/* 배지 묶음 */}
                        <span className={styles.badge}>{membershipLabels[state.profile.membership]} 멤버십</span> {/* 멤버십 배지 */}
                        <span className={styles.badge} data-adult={adult.verified ? "on" : "off"}>성인 인증 {adult.verified ? "ON" : "OFF"}</span> {/* 성인 인증 배지 */}
                    </div> {/* 배지 묶음 종료 */}
                    <p>가입일 {formatDate(state.profile.createdAt)} · 이 브라우저에만 저장</p> {/* 가입 정보 */}
                </div> {/* 프로필 정보 종료 */}
            </section> {/* 프로필 미리보기 종료 */}
            <section className={styles.section} aria-labelledby="profile-form-title"> {/* 기본 정보 */}
                <h2 id="profile-form-title">기본 정보</h2> {/* 영역 제목 */}
                <label>닉네임<input value={draft.nickname} maxLength={21} onChange={(event) => setDraft({ ...draft, nickname: event.target.value })} /></label> {/* 닉네임 입력 */}
                {errors.nickname === undefined ? null : <p className={styles.error}>{errors.nickname}</p>} {/* 닉네임 오류 */}
                <label>프로필 글자<input value={draft.avatar} maxLength={8} onChange={(event) => setDraft({ ...draft, avatar: event.target.value })} /></label> {/* 프로필 글자 입력 */}
                {errors.avatar === undefined ? null : <p className={styles.error}>{errors.avatar}</p>} {/* 프로필 글자 오류 */}
                <p>프로필 사진 대신 보이는 글자입니다. 한두 글자를 권장합니다.</p> {/* 입력 안내 */}
                <button type="button" className={styles.primary} onClick={save}>프로필 저장</button> {/* 저장 버튼 */}
                {status.length === 0 ? null : <p className={styles.status} role="status">{status}</p>} {/* 저장 안내 */}
            </section> {/* 기본 정보 종료 */}
            <section id="adult" className={styles.card} aria-labelledby="adult-title"> {/* 성인 인증 */}
                <h2 id="adult-title">성인 인증</h2> {/* 영역 제목 */}
                <dl className={styles.infoGrid}> {/* 인증 정보 */}
                    <div><dt>인증 상태</dt><dd>{adultState}</dd></div> {/* 인증 상태 */}
                    <div><dt>인증 방식</dt><dd>{verification === null ? "없음" : "모의 인증(Mock)"}</dd></div> {/* 인증 방식 */}
                    <div><dt>유효 기간</dt><dd>{verification === null ? "없음" : `${formatVerificationDate(verification.expiresAt)}까지`}</dd></div> {/* 유효 기간 */}
                </dl> {/* 인증 정보 종료 */}
                <p>{adultGuide}</p> {/* 인증 안내 */}
                <div className={styles.actionRow}> {/* 인증 동작 */}
                    {adult.verified ? <button type="button" className={styles.danger} onClick={revokeAdult}>성인 인증 해제</button> : <button type="button" className={styles.primary} onClick={() => { setAdultStatus(""); adult.openVerification(); }}>{adult.expired ? "다시 인증하기" : "성인 인증하기"}</button>} {/* 인증·해제 버튼 */}
                </div> {/* 인증 동작 종료 */}
                {adultStatus.length === 0 ? null : <p className={styles.status} role="status">{adultStatus}</p>} {/* 인증 안내 */}
                <p className={styles.note}>실제 출시 전에는 휴대폰 본인인증 업체 연동과 서버 측 인증 기록이 필요합니다. 지금은 이 브라우저에 인증 여부와 날짜만 저장합니다.</p> {/* 출시 안내 */}
                {adult.dialog} {/* 성인 인증 창 */}
            </section> {/* 성인 인증 종료 */}
        </> // 프로필 화면 종료
    ); // 반환 종료
} // 함수 종료
