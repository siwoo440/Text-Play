"use client"; // 클라이언트 컴포넌트

import { useState } from "react"; // 리액트 상태
import { layoutChoices, recommendLayout, toLayoutChoice, type LayoutChoice } from "@chatbot/features/chat/layout-resolver"; // 레이아웃 선택지
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import type { AppSettings, PlatformMode } from "@chatbot/features/core/types"; // 설정 타입
import type { LanguageSetting } from "@chatbot/lib/i18n"; // 언어 설정
import { SettingsPageHeader } from "@chatbot/features/settings/SettingsShell"; // 페이지 머리말
import styles from "@chatbot/features/settings/SettingsScreen.module.css"; // 설정 스타일
import { getActiveLocale, t } from "@chatbot/lib/i18n"; // 화면 글자 번역·화면 언어

function LayoutDiagram({ choice }: { choice: LayoutChoice }) // 배치 그림(대화 영역과 채팅방 설정 위치)
{ // 함수 시작
    return ( // 그림 반환
        <span className={styles.layoutDiagram} data-choice={choice} aria-hidden="true"> {/* 배치 그림 */}
            <span className={styles.diagramChat}><i /><i /><i /></span> {/* 대화 영역 */}
            <span className={styles.diagramPanel}><i /><i /></span> {/* 채팅방 설정 */}
        </span> // 그림 종료
    ); // 반환 종료
} // 함수 종료

export function DisplaySettings() // 화면 레이아웃 화면
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태 조회
    const [status, setStatus] = useState(""); // 저장 상태
    const update = (settings: Partial<AppSettings>) => // 설정 변경 함수
    { // 함수 시작
        dispatch({ type: "update-settings", settings }); // 설정 저장
        setStatus(t("저장했습니다.")); // 성공 상태 반영
    }; // 함수 종료
    const width = typeof window === "undefined" ? 1440 : window.innerWidth; // 화면 너비
    const height = typeof window === "undefined" ? 900 : window.innerHeight; // 화면 높이
    const recommended = toLayoutChoice(recommendLayout({ width, height, platformMode: state.settings.platformMode, layoutId: null })); // 지금 화면에 맞는 배치
    const selected: LayoutChoice | "auto" = state.settings.layoutId === null ? "auto" : toLayoutChoice(state.settings.layoutId); // 고른 배치(예전 아홉 가지는 세 가지로 묶어 표시)
    const applied = layoutChoices.find((choice) => choice.id === (selected === "auto" ? recommended : selected)) ?? layoutChoices[0]; // 지금 적용되는 배치
    return ( // 화면 반환
        <> {/* 화면 설정 */}
            <SettingsPageHeader kicker="PREFERENCES · DISPLAY" title={t("화면 레이아웃")} description={t("채팅 화면에서 채팅방 설정을 어디에 둘지 고릅니다. 바꾸면 바로 저장됩니다.")} /> {/* 페이지 머리말 */}
            <section className={styles.section} aria-labelledby="display-layout-title"> {/* 배치 영역 */}
                <h2 id="display-layout-title">{t("채팅 화면 배치")}</h2> {/* 영역 제목 */}
                <fieldset className={styles.layoutChoices}> {/* 배치 선택 */}
                    <legend>{t("채팅방 설정 위치")}</legend> {/* 선택 제목 */}
                    <label data-selected={selected === "auto"}> {/* 자동 */}
                        <input type="radio" name="layout-choice" value="auto" checked={selected === "auto"} onChange={() => update({ layoutId: null })} /> {/* 자동 선택 */}
                        <LayoutDiagram choice={recommended} /> {/* 지금 화면의 추천 배치 그림 */}
                        <strong>{t("자동")}</strong> {/* 이름 */}
                        <small>{t("화면 크기에 맞춰 알아서 골라요. 지금 화면에서는 ‘")}{t(layoutChoices.find((choice) => choice.id === recommended)?.label)}{t("’로 보여요.")}</small> {/* 설명 */}
                    </label> {/* 자동 종료 */}
                    {layoutChoices.map((choice) => ( // 선택지 순회
                        <label key={choice.id} data-selected={selected === choice.id}> {/* 선택지 */}
                            <input type="radio" name="layout-choice" value={choice.id} checked={selected === choice.id} onChange={() => update({ layoutId: choice.layoutId })} /> {/* 배치 선택 */}
                            <LayoutDiagram choice={choice.id} /> {/* 배치 그림 */}
                            <strong>{t(choice.label)}</strong> {/* 이름 */}
                            {recommended === choice.id ? <em className={styles.recommend}>{t("지금 화면에 추천")}</em> : null} {/* 추천 표시 */}
                            <small>{t(choice.description)}</small> {/* 설명 */}
                        </label> // 선택지 종료
                    ))} {/* 순회 종료 */}
                </fieldset> {/* 배치 선택 종료 */}
                <p>{t("지금 적용:")} <strong>{t(applied.label)}</strong>{selected === "auto" ? t(" (자동)") : ""}</p> {/* 현재 상태 */}
                <p className={styles.note}>{t("휴대폰처럼 좁은 화면에서는 고른 것과 상관없이 서랍형으로 보여요. 채팅방 설정은 채팅 화면 위쪽 버튼으로 언제든 접고 펼 수 있어요.")}</p> {/* 좁은 화면 안내 */}
                {status.length === 0 ? null : <p className={styles.status} role="status">{status}</p>} {/* 저장 안내 */}
            </section> {/* 배치 영역 종료 */}
            <section id="language" className={styles.section} aria-labelledby="display-language-title"> {/* 언어 영역 */}
                <h2 id="display-language-title">{getActiveLocale() === "en" ? "Language · 언어" : "언어 · Language"}</h2> {/* 영역 제목(두 언어로 표시해 어느 화면에서도 찾을 수 있게) */}
                <label>{t("화면 언어")}<select value={state.settings.language ?? "auto"} onChange={(event) => update({ language: event.target.value as LanguageSetting })}><option value="auto">{t("자동(브라우저 언어)")}</option><option value="ko">한국어</option><option value="en">English</option></select></label> {/* 언어 선택 */}
                <p>{t("메뉴와 버튼, 안내 글이 고른 언어로 바뀝니다. 캐릭터 이름과 소개, 이미 나눈 대화는 바뀌지 않습니다.")}</p> {/* 안내 */}
            </section> {/* 언어 영역 종료 */}
            <section className={styles.section} aria-labelledby="display-form-title"> {/* 기기 영역 */}
                <h2 id="display-form-title">{t("기기 모드")}</h2> {/* 영역 제목 */}
                <label>{t("플랫폼 모드")}<select value={state.settings.platformMode} onChange={(event) => update({ platformMode: event.target.value as PlatformMode })}><option value="auto">{t("자동")}</option><option value="mobile">{t("모바일")}</option><option value="tablet">{t("태블릿")}</option><option value="desktop">{t("데스크톱")}</option></select></label> {/* 플랫폼 선택 */}
                <p>{t("배치가 자동일 때 어떤 기기로 볼지 정합니다. 보통은 자동으로 두면 됩니다.")}</p> {/* 안내 */}
            </section> {/* 기기 영역 종료 */}
        </> // 화면 설정 종료
    ); // 반환 종료
} // 함수 종료
