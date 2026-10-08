"use client"; // 클라이언트 컴포넌트

import { useState } from "react"; // 리액트 상태
import { DialogFrame } from "@chatbot/components/dialog/DialogFrame"; // 확인 대화상자 틀
import { clearDeviceDataAndLeave, deleteAccountAndLeave, getAuthAdapter, type Navigate } from "@chatbot/features/account/account-actions"; // 계정 동작
import { useSyncStatus } from "@chatbot/features/account/sync-status"; // 맞추기 상태
import { useAccountSession } from "@chatbot/features/account/use-account-session"; // 계정 세션
import dialog from "@chatbot/features/settings/AccountManagement.module.css"; // 확인 창 스타일
import styles from "@chatbot/features/settings/SettingsScreen.module.css"; // 설정 스타일
import type { AccountProvider } from "@chatbot/lib/account/account-session"; // 로그인 방법
import type { AuthAdapter } from "@chatbot/lib/account/auth-adapter"; // 로그인 계약
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

const providerLabels: Record<AccountProvider, string> = { practice: "연습용 로그인", email: "이메일", google: "Google", kakao: "카카오" }; // 로그인 방법 이름

export function AccountManagement({ adapter, navigate }: { adapter?: AuthAdapter; navigate?: Navigate }) // 계정 관리(로그인했을 때만 보임: 이 기기의 계정 데이터 지우기, 계정 지우기)
{ // 함수 시작
    const session = useAccountSession(); // 지금 로그인한 계정
    const sync = useSyncStatus(); // 서버 저장 상태
    const [open, setOpen] = useState<"device" | "delete" | null>(null); // 열린 확인 창
    const [agreed, setAgreed] = useState(false); // 되돌릴 수 없다는 것을 확인했는지
    const [busy, setBusy] = useState(false); // 처리 중
    const [error, setError] = useState(""); // 실패 안내
    if (session === null) // 손님
    { // 조건 시작
        return null; // 아무것도 그리지 않음
    } // 조건 종료
    const close = () => // 확인 창 닫기
    { // 함수 시작
        if (busy) // 처리 중
        { // 조건 시작
            return; // 끝날 때까지 닫지 않음
        } // 조건 종료
        setOpen(null); // 창 닫기
        setAgreed(false); // 확인 지움
        setError(""); // 안내 지움
    }; // 함수 종료
    const clearDevice = async () => // 이 기기의 계정 데이터 지우기
    { // 함수 시작
        setBusy(true); // 처리 시작
        await clearDeviceDataAndLeave(adapter ?? getAuthAdapter(), navigate); // 지우고 로그아웃
        setBusy(false); // 처리 끝
    }; // 함수 종료
    const remove = async () => // 계정 지우기(탈퇴)
    { // 함수 시작
        setBusy(true); // 처리 시작
        setError(""); // 안내 지움
        const result = await deleteAccountAndLeave(adapter ?? getAuthAdapter(), navigate); // 계정 지우기
        setBusy(false); // 처리 끝
        setError(result.ok ? "" : t("계정을 지우지 못했어요. 잠시 뒤 다시 시도해 주세요.")); // 실패 안내
    }; // 함수 종료
    return ( // 화면 반환
        <section id="account" className={styles.card} aria-labelledby="privacy-account-title"> {/* 계정 관리 */}
            <h2 id="privacy-account-title">{t("계정 관리")}</h2> {/* 제목 */}
            <dl className={styles.infoGrid}> {/* 계정 정보 */}
                <div><dt>{t("계정 이름")}</dt><dd>{session.name}</dd></div> {/* 계정 이름 */}
                <div><dt>{t("이메일")}</dt><dd>{session.email ?? t("없음")}</dd></div> {/* 이메일(연습용 계정은 없음) */}
                <div><dt>{t("로그인 방법")}</dt><dd>{t(providerLabels[session.provider])}</dd></div> {/* 로그인 방법 */}
            </dl> {/* 계정 정보 종료 */}
            <p>{t("이 기기의 계정 데이터만 지우면 서버에 저장된 데이터는 그대로라, 다시 로그인하면 받아 와요. 계정을 지우면 서버의 데이터까지 모두 사라지고 되돌릴 수 없어요.")}</p> {/* 두 가지의 차이 */}
            <div className={styles.actionRow}> {/* 동작 */}
                <button type="button" className={styles.secondary} onClick={() => setOpen("device")}>{t("이 기기에서 계정 데이터 지우기")}</button> {/* 기기 데이터 지우기 */}
                <button type="button" className={styles.danger} onClick={() => setOpen("delete")}>{t("계정 지우기(탈퇴)")}</button> {/* 탈퇴 */}
            </div> {/* 동작 종료 */}
            {open !== "device" ? null : ( // 기기 데이터 확인 창 판정
                <DialogFrame backdropClassName={dialog.backdrop} className={dialog.dialog} labelledBy="account-device-title" onClose={close}> {/* 기기 데이터 확인 창 */}
                    <span>ACCOUNT</span> {/* 표시 */}
                    <h2 id="account-device-title">{t("이 기기에서 계정 데이터를 지울까요?")}</h2> {/* 제목 */}
                    <p>{t("이 기기에 있는 {0} 계정의 캐릭터와 대화, 백업, 작성 중 임시 저장을 지우고 로그아웃해요. 다시 로그인하면 서버에 저장된 데이터를 받아 와요.", [session.name])}</p> {/* 설명 */}
                    {sync.phase === "saved" ? null : <p className={dialog.warning} role="alert">{t("서버에 아직 올리지 못한 변경이 있을 수 있어요. 지우면 그 변경은 사라져요.")}</p>} {/* 서버에 저장됐다고 확인되지 않았을 때의 경고 */}
                    <div><button type="button" disabled={busy} onClick={close}>{t("취소")}</button><button type="button" className={dialog.danger} disabled={busy} onClick={() => void clearDevice()}>{t("지우고 로그아웃")}</button></div> {/* 선택 */}
                </DialogFrame> // 기기 데이터 확인 창 종료
            )} {/* 기기 데이터 확인 창 판정 종료 */}
            {open !== "delete" ? null : ( // 탈퇴 확인 창 판정
                <DialogFrame backdropClassName={dialog.backdrop} className={dialog.dialog} labelledBy="account-delete-title" onClose={close}> {/* 탈퇴 확인 창 */}
                    <span>ACCOUNT</span> {/* 표시 */}
                    <h2 id="account-delete-title">{t("계정을 지울까요?")}</h2> {/* 제목 */}
                    <p>{t("{0} 계정과, 서버에 저장된 이 계정의 데이터, 이 기기에 있는 이 계정의 데이터를 모두 지워요. 지우면 되돌릴 수 없어요.", [session.name])}</p> {/* 지우는 범위 */}
                    <p>{t("남겨 둘 것이 있으면 먼저 데이터 관리에서 JSON으로 내보내 주세요. 로그인하기 전에 이 브라우저에서 쓰던 손님 데이터는 지우지 않아요.")}</p> {/* 내보내기와 손님 데이터 안내 */}
                    <label className={dialog.check}><input type="checkbox" checked={agreed} disabled={busy} onChange={(event) => setAgreed(event.target.checked)} /><span>{t("되돌릴 수 없다는 것을 확인했어요")}</span></label> {/* 확인 */}
                    {error.length === 0 ? null : <p className={dialog.warning} role="alert">{error}</p>} {/* 실패 안내 */}
                    <div><button type="button" disabled={busy} onClick={close}>{t("취소")}</button><button type="button" className={dialog.danger} disabled={!agreed || busy} onClick={() => void remove()}>{t("계정 지우기")}</button></div> {/* 선택(확인해야 지울 수 있음) */}
                </DialogFrame> // 탈퇴 확인 창 종료
            )} {/* 탈퇴 확인 창 판정 종료 */}
        </section> // 계정 관리 종료
    ); // 반환 종료
} // 함수 종료
