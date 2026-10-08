"use client"; // 클라이언트 컴포넌트

import Image from "@/desktop/next-compat/image"; // 이미지
import { useState } from "react"; // 리액트 상태
import { chatFontOptions } from "@chatbot/features/chat/chat-fonts"; // 글꼴 이름
import { getTierOption, lengthOptions, THINKING_DEPTH_ENABLED, thinkingOptions } from "@chatbot/features/chat/chat-tiers"; // 길이·생각 이름
import { FontDialog, MemoryDialog, PersonaDialog, PlayGuideDialog, ShortcutsDialog, StyleDialog, TierDialog, UpdatesDialog, UserNoteDialog } from "@chatbot/features/chat/ChatSettingsDialogs"; // 설정 대화상자
import { writingStyles } from "@chatbot/features/chat/suggestion-model"; // 문체 이름
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import type { ConversationSettings, WorkUpdate } from "@chatbot/features/core/types"; // 도메인 타입
import styles from "@chatbot/features/chat/ChatPanels.module.css"; // 채팅 보조 영역 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export type ChatDialogId = "guide" | "persona" | "note" | "style" | "memory" | "shortcuts" | "tier" | "font" | "updates"; // 대화상자 종류
type DialogId = ChatDialogId; // 내부 이름

interface ChatSettingsPanelProps // 채팅방 설정 패널 속성
{ // 구조 시작
    conversationId: string; // 대화
    characterId: string; // 대표 캐릭터
    settings: ConversationSettings; // 대화방 설정
    onUpdateSettings(patch: Partial<ConversationSettings>): void; // 설정 변경
    playGuide: string; // 플레이 가이드
    updates: WorkUpdate[]; // 업데이트 기록
    presetName: string; // 시작 설정 이름
    sceneImages: string[]; // 이 대화의 상황 이미지
    currentScene: string; // 현재 장면
    busy: boolean; // 응답 중
    onApplyScene(src: string): void; // 상황 이미지를 장면으로
    sampleName: string; // 문체 미리보기 이름
    request: { dialog: ChatDialogId; seq: number } | null; // 명령어·단축키로 들어온 대화상자 열기 요청
    ensureSaved(): void; // 아직 저장 전인 새 대화를 먼저 저장
} // 구조 종료

export function ChatSettingsPanel(props: ChatSettingsPanelProps) // 채팅방 설정 패널(오른쪽)
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const [dialog, setDialog] = useState<DialogId | null>(null); // 열린 대화상자
    const [requestSeen, setRequestSeen] = useState(props.request?.seq ?? 0); // 처리한 열기 요청
    if (props.request !== null && props.request.seq !== requestSeen) // 새 열기 요청
    { // 조건 시작
        setRequestSeen(props.request.seq); // 처리 기록
        setDialog(props.request.dialog); // 대화상자 열기
    } // 조건 종료
    const { settings } = props; // 대화방 설정
    const persona = state.personas.find((item) => item.id === settings.personaId) ?? state.personas[0]; // 현재 프로필
    const memoryCount = state.memories.filter((memory) => memory.conversationId === props.conversationId).length; // 메모리 수
    const tierOption = getTierOption(settings.tierOptions, settings.tier); // 현재 등급 설정
    const close = () => setDialog(null); // 닫기
    const menuItem = (id: DialogId, label: string, value?: string) => <li><button type="button" className={styles.menuButton} onClick={() => setDialog(id)}><span>{label}</span>{value === undefined || value.length === 0 ? null : <small><span className="sr-only">, </span>{t(value)}</small>}<span aria-hidden="true">›</span></button></li>; // 메뉴 줄
    const toggleItem = (label: string, checked: boolean, onChange: (value: boolean) => void) => <li><label className={styles.toggleRow}><span>{label}</span><input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label></li>; // 켜고 끄기 줄
    const latestUpdate = props.updates[0]; // 최신 업데이트
    return ( // 패널 반환
        <section className={styles.settingsPanel} aria-label={t("채팅방 설정 메뉴")}> {/* 설정 패널 */}
            {props.sceneImages.length === 0 ? null : ( // 상황 이미지 판정
                <div className={styles.sceneStrip} aria-label={t("상황 이미지 모음")}> {/* 이미지 모음 */}
                    {props.sceneImages.map((src, index) => <button key={`${src.slice(-24)}-${index}`} type="button" aria-label={t("상황 이미지 {0} 장면으로", [index + 1])} disabled={props.busy} data-current={props.currentScene === src ? "true" : undefined} onClick={() => props.onApplyScene(src)}><Image src={src} alt="" width={120} height={90} unoptimized={src.startsWith("data:")} /></button>)} {/* 이미지 */}
                </div> // 모음 종료
            )} {/* 이미지 판정 종료 */}
            <h3>{t("대화 설정")}</h3> {/* 묶음 제목 */}
            <ul className={styles.menu}> {/* 메뉴 */}
                {menuItem("guide", t("플레이 가이드"))} {/* 플레이 가이드 */}
                {menuItem("persona", t("대화 프로필"), persona?.name)} {/* 대화 프로필 */}
                {menuItem("note", t("유저 노트"), settings.userNote.length === 0 ? "" : t("{0}자", [settings.userNote.length]))} {/* 유저 노트 */}
                {menuItem("style", t("문체 변경"), writingStyles.find((item) => item.id === settings.writingStyle)?.label)} {/* 문체 */}
                {menuItem("memory", t("요약 메모리"), t("{0}개", [memoryCount]))} {/* 요약 메모리 */}
                {menuItem("shortcuts", t("키보드 단축키"))} {/* 단축키 */}
            </ul> {/* 메뉴 종료 */}
            <h3>{t("스토리 고급 설정")}</h3> {/* 묶음 제목 */}
            <ul className={styles.menu}> {/* 메뉴 */}
                {THINKING_DEPTH_ENABLED ? menuItem("tier", t("답변 길이 및 생각 조절"), t("{0} · 생각 {1}", [lengthOptions.find((item) => item.value === tierOption.length)?.label ?? t("기본"), thinkingOptions.find((item) => item.value === tierOption.thinking)?.label ?? t("끄기")])) : menuItem("tier", t("답변 길이 조절"), t(lengthOptions.find((item) => item.value === tierOption.length)?.label ?? "기본"))} {/* 길이(생각 깊이는 답변에 반영될 때까지 숨김) */}
                {toggleItem(t("유저 사칭 방지"), settings.preventImpersonation, (value) => props.onUpdateSettings({ preventImpersonation: value }))} {/* 사칭 방지 */}
            </ul> {/* 메뉴 종료 */}
            <h3>{t("전체 설정")}</h3> {/* 묶음 제목 */}
            <ul className={styles.menu}> {/* 메뉴 */}
                {menuItem("font", t("글꼴"), chatFontOptions.find((item) => item.id === state.settings.chatFont)?.label)} {/* 글꼴 */}
                {toggleItem(t("상황 이미지 보기"), state.settings.showSceneImages, (value) => dispatch({ type: "update-settings", settings: { showSceneImages: value } }))} {/* 상황 이미지 */}
            </ul> {/* 메뉴 종료 */}
            <h3>{t("업데이트 정보")}</h3> {/* 묶음 제목 */}
            <ul className={styles.menu}>{menuItem("updates", latestUpdate?.version ?? "V1", latestUpdate?.date)}</ul> {/* 업데이트 */}
            <h3>{t("시작 설정")}</h3> {/* 묶음 제목 */}
            <p className={styles.plainValue}>{props.presetName}</p> {/* 시작 설정(나의 토큰은 오른쪽 패널 보유 토큰과 같아 뺌) */}
            {dialog === "guide" ? <PlayGuideDialog text={props.playGuide} onClose={close} /> : null} {/* 플레이 가이드 */}
            {dialog === "persona" ? <PersonaDialog personas={state.personas} currentId={persona?.id ?? ""} onSelect={(personaId) => props.onUpdateSettings({ personaId: personaId === state.personas[0]?.id ? null : personaId })} onUpsert={(item) => dispatch({ type: "upsert-persona", persona: item })} onDelete={(personaId) => dispatch({ type: "delete-persona", personaId })} onClose={close} /> : null} {/* 대화 프로필 */}
            {dialog === "note" ? <UserNoteDialog note={settings.userNote} extended={settings.userNoteExtended} onSave={(note, extended) => props.onUpdateSettings({ userNote: note, userNoteExtended: extended })} onClose={close} /> : null} {/* 유저 노트 */}
            {dialog === "style" ? <StyleDialog value={settings.writingStyle} sampleName={props.sampleName} onSave={(style) => props.onUpdateSettings({ writingStyle: style })} onClose={close} /> : null} {/* 문체 */}
            {dialog === "memory" ? <MemoryDialog conversationId={props.conversationId} characterId={props.characterId} memories={state.memories} onUpsert={(memories) => { props.ensureSaved(); dispatch({ type: "upsert-memories", memories }); }} onDelete={(memoryId) => dispatch({ type: "delete-memory", memoryId })} onClose={close} /> : null} {/* 요약 메모리 */}
            {dialog === "shortcuts" ? <ShortcutsDialog onClose={close} /> : null} {/* 단축키 */}
            {dialog === "tier" ? <TierDialog tierOptions={settings.tierOptions} onSave={(tierOptions) => props.onUpdateSettings({ tierOptions })} onClose={close} /> : null} {/* 길이·생각 */}
            {dialog === "font" ? <FontDialog font={state.settings.chatFont} size={state.settings.chatFontSize} onSave={(chatFont, chatFontSize) => dispatch({ type: "update-settings", settings: { chatFont, chatFontSize } })} onClose={close} /> : null} {/* 글꼴 */}
            {dialog === "updates" ? <UpdatesDialog updates={props.updates} onClose={close} /> : null} {/* 업데이트 */}
        </section> // 패널 종료
    ); // 반환 종료
} // 함수 종료
