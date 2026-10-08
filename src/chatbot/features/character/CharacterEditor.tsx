"use client"; // 클라이언트 컴포넌트

import Link from "@/desktop/next-compat/link"; // 내부 링크
import Image from "@/desktop/next-compat/image"; // 최적화 이미지
import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import { useMemo, useState } from "react"; // 리액트 도구
import { StatusScreen } from "@chatbot/components/feedback/StatusScreen"; // 공통 상태 화면
import { canViewMatureContent, contentRatingLabels, isAdultVerified } from "@chatbot/features/adult/adult-access"; // 성인 인증 판정·등급 문구
import { CharacterPreview } from "@chatbot/features/character/CharacterPreview"; // 미리보기
import { normalizeCharacterDraft, validateCharacterDraft, type CharacterValidationResult } from "@chatbot/features/character/character-validation"; // 초안 검증
import { appReducer } from "@chatbot/features/core/app-reducer"; // 앱 리듀서(시험 대화용 임시 상태)
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { ensureConversationForCharacter } from "@chatbot/features/character/character-detail-model"; // 대화 준비
import { draftKey } from "@chatbot/features/character/draft-storage"; // 자동 저장 키
import { EditorStepNav, EditorStepSection, useEditorSteps, type EditorStepDefinition } from "@chatbot/features/character/EditorSteps"; // 편집 단계
import { TEST_CHAT_BALANCE, TestChat, type TestChatSession } from "@chatbot/features/character/TestChat"; // 시험 대화
import { useDraftAutosave } from "@chatbot/features/character/useDraftAutosave"; // 작성 중 자동 저장
import type { LLMAdapter } from "@chatbot/lib/adapters/llm-adapter"; // 대화 계약
import { useUnsavedChangesGuard } from "@chatbot/features/core/useUnsavedChangesGuard"; // 이탈 경고
import { createDefaultStatusTemplate } from "@chatbot/features/core/defaults"; // 기본 상태창
import { WorkExtrasFields } from "@chatbot/features/character/WorkExtrasFields"; // 플레이 가이드·상태창·업데이트 입력
import { WorkLoreFields } from "@chatbot/features/character/LoreEditor"; // 키워드 설정집·예시 대화 입력
import type { Character, CharacterDraft, PublicationStatus } from "@chatbot/features/core/types"; // 캐릭터 타입
import { canUseImageForRating, findImageBySource, isGeneratedImageSource } from "@chatbot/features/images/image-model"; // 내 이미지 도구
import styles from "@chatbot/features/character/CharacterEditor.module.css"; // 편집기 스타일
import { localeTag, t } from "@chatbot/lib/i18n"; // 화면 글자 번역·날짜와 숫자 형식
import { TagInput } from "@chatbot/features/character/TagInput"; // 태그 입력칸

const imageOptions = ["rian", "harin", "sera", "kyle", "noah", "miel", "yuna"].map((id) => `/images/characters/${id}.webp`); // 이미지 목록

function createEmptyDraft(): CharacterDraft // 빈 초안 생성
{ // 함수 시작
    return ( // 초안 반환
    { // 초안 시작
        name: "", // 빈 이름
        summary: "", // 빈 소개
        description: "", // 빈 설명
        personality: "", // 빈 성격
        greeting: "", // 빈 인사
        worldSetting: "", // 빈 세계관
        prompt: "", // 빈 프롬프트
        tags: [], // 빈 태그
        coverImage: imageOptions[0], // 기본 이미지
        visibility: "private", // 기본 공개 범위
        contentRating: "all", // 기본 이용 등급
        playGuide: "", // 플레이 가이드
        statusTemplate: createDefaultStatusTemplate(true), // 상태창 형식
        updates: [], // 업데이트 기록
        events: [], // 스탯 조건 이벤트
        lorebook: [], // 키워드 설정집
        examples: [], // 예시 대화
    }); // 초안 종료
} // 함수 종료

function toDraft(character: Character): CharacterDraft // 캐릭터 초안 변환
{ // 함수 시작
    return ( // 초안 반환
    { // 초안 시작
        name: character.name, // 이름 복사
        summary: character.summary, // 소개 복사
        description: character.description, // 설명 복사
        personality: character.personality, // 성격 복사
        greeting: character.greeting, // 인사 복사
        worldSetting: character.worldSetting, // 세계관 복사
        prompt: character.prompt, // 프롬프트 복사
        tags: [...character.tags], // 태그 복사
        coverImage: character.coverImage, // 이미지 복사
        visibility: character.visibility, // 공개 범위 복사
        contentRating: character.contentRating, // 이용 등급 복사
        playGuide: character.playGuide, // 플레이 가이드 복사
        statusTemplate: structuredClone(character.statusTemplate), // 상태창 형식 복사
        updates: structuredClone(character.updates), // 업데이트 기록 복사
        events: structuredClone(character.events), // 이벤트 복사
        lorebook: structuredClone(character.lorebook), // 설정집 복사
        examples: structuredClone(character.examples), // 예시 대화 복사
    }); // 초안 종료
} // 함수 종료

const characterSteps: EditorStepDefinition[] = // 캐릭터 편집 단계
[ // 단계 시작
    { id: "basic", label: "기본 정보", hint: "이름과 소개, 태그, 대표 이미지를 정해요.", fields: ["name", "summary", "description", "tags", "coverImage"] }, // 기본 정보
    { id: "persona", label: "성격과 세계관", hint: "성격과 첫 인사, 세계관, AI에게만 알려 줄 내용과 설정집, 예시 대화를 적어요.", fields: ["personality", "greeting", "worldSetting", "prompt", "lorebook", "examples"] }, // 성격과 세계관
    { id: "play", label: "진행 설정", hint: "플레이 가이드와 상태창, 스탯, 이벤트, 업데이트 기록을 정해요.", fields: ["playGuide", "statusTemplate", "events", "updates"] }, // 진행 설정
    { id: "publish", label: "공개 설정", hint: "누가 볼 수 있는지와 이용 등급을 정하고 저장해요.", fields: ["visibility", "contentRating"] }, // 공개 설정
]; // 단계 종료

export function formatSavedAt(value: string): string // 자동 저장 시각 표시
{ // 함수 시작
    return new Intl.DateTimeFormat(localeTag(), { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }).format(new Date(value)); // 한국 시각 반환
} // 함수 종료

export function CharacterEditor({ characterId, initialImageId, llm }: { characterId?: string; initialImageId?: string; llm?: LLMAdapter }) // 캐릭터 편집기(이미지 스튜디오에서 고른 이미지로 시작 가능)
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const existing = characterId === undefined ? undefined : state.characters.find((character) => character.id === characterId); // 기존 캐릭터
    const startImage = initialImageId === undefined ? undefined : state.images.find((image) => image.id === initialImageId && (image.contentRating !== "mature" || canViewMatureContent(state, new Date()))); // 스튜디오에서 넘어온 이미지
    const initialDraft = useMemo(() => existing === undefined ? { ...createEmptyDraft(), ...(startImage === undefined ? {} : { coverImage: startImage.src }) } : toDraft(existing), [existing, startImage]); // 초기 초안
    const [draft, setDraft] = useState<CharacterDraft>(initialDraft); // 편집 초안
    const [result, setResult] = useState<CharacterValidationResult>({ valid: true, errors: {} }); // 검증 결과
    const [notice, setNotice] = useState(""); // 저장 안내
    const [savedId] = useState(() => existing?.id ?? `character-${Date.now()}`); // 저장 식별자
    const [dirty, setDirty] = useState(false); // 변경 표시
    const adultVerified = isAdultVerified(state.profile, new Date()); // 성인 인증 상태
    const showMature = canViewMatureContent(state, new Date()); // 19+ 표시 여부
    const myImages = [...state.images.filter((image) => image.contentRating !== "mature" || showMature), ...(isGeneratedImageSource(draft.coverImage) && !state.images.some((image) => image.src === draft.coverImage) ? [{ id: "current", src: draft.coverImage, prompt: t("현재 대표 이미지") }] : [])]; // 고를 수 있는 내 이미지(지운 이미지는 현재 값만 유지)
    useUnsavedChangesGuard(dirty); // 저장하지 않은 변경 이탈 경고
    const steps = useEditorSteps(characterSteps, existing !== undefined); // 편집 단계(새로 만들 때는 단계별, 수정은 전체 보기)
    const autosave = useDraftAutosave(draftKey("character", characterId), draft, dirty, initialDraft); // 작성 중 자동 저장
    const [testing, setTesting] = useState(false); // 시험 대화 열림
    if (characterId !== undefined && existing === undefined) // 수정 대상 부재 판정
    { // 조건 시작
        return ( // 부재 화면 반환
            <StatusScreen tone="not-found" label="CHARACTER NOT FOUND" title={t("수정할 캐릭터를 찾을 수 없습니다")} description={t("주소가 잘못되었거나 이 브라우저에서 삭제된 캐릭터입니다.")}> {/* 부재 안내 */}
                <Link href={"/library" as Route}>{t("보관함으로 돌아가기")}</Link> {/* 보관함 링크 */}
            </StatusScreen> // 부재 안내 종료
        ); // 반환 종료
    } // 조건 종료
    if (existing !== undefined && existing.creatorId !== state.profile.id) // 수정 권한 판정
    { // 조건 시작
        return ( // 권한 화면 반환
            <StatusScreen tone="restricted" label="NO PERMISSION" title={t("이 캐릭터를 수정할 권한이 없습니다.")} description={t("직접 만든 캐릭터만 수정할 수 있습니다. 상세 화면에서 대화를 시작하거나 보관할 수 있습니다.")}> {/* 권한 안내 */}
                <Link href={"/library" as Route}>{t("보관함으로 돌아가기")}</Link> {/* 보관함 링크 */}
            </StatusScreen> // 권한 안내 종료
        ); // 반환 종료
    } // 조건 종료
    const update = <K extends keyof CharacterDraft>(key: K, value: CharacterDraft[K]) => // 필드 변경
    { // 함수 시작
        setDraft((current) => ({ ...current, [key]: value })); // 초안 갱신
        setDirty(true); // 변경 표시
        setNotice(""); // 안내 초기화
    }; // 함수 종료
    const restoreDraft = () => // 자동 저장한 내용 이어 쓰기
    { // 함수 시작
        const value = autosave.restore(); // 보관 초안
        if (value !== null) // 초안 있음
        { // 조건 시작
            setDraft(value); // 초안 교체
            setDirty(true); // 변경 표시
            setNotice(t("자동 저장한 내용을 불러왔습니다.")); // 안내
        } // 조건 종료
    }; // 함수 종료
    const openTestChat = () => // 시험 대화 열기(필수 입력을 먼저 확인)
    { // 함수 시작
        const validation = validateCharacterDraft(normalizeCharacterDraft(draft)); // 초안 검증
        setResult(validation); // 검증 결과 반영
        if (!validation.valid) // 오류 판정
        { // 조건 시작
            steps.showErrors(validation.errors); // 오류 단계로
            setNotice(t("시험 대화를 하려면 입력 내용을 먼저 확인해 주세요.")); // 안내
            return; // 중단
        } // 조건 종료
        setTesting(true); // 열기
    }; // 함수 종료
    const startTestChat = (): TestChatSession => // 지금 초안으로 임시 대화 만들기(저장하지 않음)
    { // 함수 시작
        const now = new Date().toISOString(); // 현재 시각
        const character: Character = { ...normalizeCharacterDraft(draft), id: "test-chat-character", creatorId: state.profile.id, creatorName: state.profile.nickname, publicationStatus: "draft", popularity: 0, createdAt: now, updatedAt: now }; // 임시 캐릭터
        const base = appReducer({ ...structuredClone(state), wallet: { ...state.wallet, balance: TEST_CHAT_BALANCE } }, { type: "upsert-character", character }); // 임시 상태
        const started = ensureConversationForCharacter(base, character.id, now); // 임시 대화
        return { state: started.state, conversationId: started.conversation.id }; // 준비물 반환
    }; // 함수 종료
    const save = (publicationStatus: PublicationStatus) => // 캐릭터 저장
    { // 함수 시작
        const normalized = normalizeCharacterDraft(draft); // 초안 정규화
        const validation = validateCharacterDraft(normalized); // 초안 검증
        setResult(validation); // 검증 결과 반영
        steps.showErrors(validation.errors); // 오류가 난 단계로
        if (validation.valid && normalized.contentRating === "mature" && !adultVerified) // 인증 없는 19세 등급 판정
        { // 조건 시작
            setResult({ valid: false, errors: { contentRating: t("19세 이용가는 성인 인증 후 선택할 수 있습니다.") } }); // 등급 오류 반영
            steps.showErrors({ contentRating: true }); // 공개 설정 단계로
            setNotice(t("입력 내용을 확인해 주세요.")); // 오류 안내
            return; // 저장 중단
        } // 조건 종료
        const coverSource = findImageBySource(state.images, normalized.coverImage); // 대표 이미지가 내 이미지인지
        if (validation.valid && coverSource !== undefined && !canUseImageForRating(coverSource.contentRating, normalized.contentRating)) // 이미지 등급 판정
        { // 조건 시작
            const label = contentRatingLabels[coverSource.contentRating]; // 이미지 등급 이름
            setResult({ valid: false, errors: { coverImage: t("{0} 이미지를 쓰려면 이용 등급을 {1} 이상으로 정해 주세요.", [label, label]) } }); // 등급 오류
            steps.showErrors({ coverImage: true }); // 기본 정보 단계로
            setNotice(t("입력 내용을 확인해 주세요.")); // 오류 안내
            return; // 저장 중단
        } // 조건 종료
        if (!validation.valid) // 오류 판정
        { // 조건 시작
            setNotice(t("입력 내용을 확인해 주세요.")); // 오류 안내
            return; // 저장 중단
        } // 조건 종료
        const now = new Date().toISOString(); // 현재 시각
        const previous = state.characters.find((item) => item.id === savedId); // 이전 저장본(새로 만들다가 이 화면에서 이미 저장한 것 포함)
        const character: Character = // 저장 캐릭터
        { // 캐릭터 시작
            ...normalized, // 초안 적용
            id: savedId, // 식별자 적용
            creatorId: state.profile.id, // 제작자 식별자
            creatorName: state.profile.nickname, // 제작자 이름
            publicationStatus, // 발행 상태
            popularity: previous?.popularity ?? 0, // 인기도 유지
            createdAt: previous?.createdAt ?? now, // 생성 시각 유지(두 번째 저장부터는 처음 저장한 때)
            updatedAt: now, // 수정 시각 갱신
        }; // 캐릭터 종료
        dispatch({ type: "upsert-character", character }); // 캐릭터 저장
        setDraft(normalized); // 정규 초안 반영
        setDirty(false); // 변경 해제
        autosave.clear(); // 자동 저장분 지움
        setNotice(publicationStatus === "draft" ? t("임시 저장했습니다.") : t("공개 저장했습니다.")); // 성공 안내
    }; // 함수 종료
    const error = (key: keyof CharacterDraft) => result.errors[key] === undefined ? null : <span role="alert" className={styles.error}>{result.errors[key]}</span>; // 오류 표시
    return ( // 편집기 반환
        <main className={styles.page} data-surface="light"> {/* 편집기 본문 */}
            <header className={styles.header}> {/* 편집기 헤더 */}
                <div><span>CHARACTER STUDIO</span><h1>{existing === undefined ? t("새 캐릭터 만들기") : t("{0} 수정", [existing.name])}</h1><p>{t("입력과 동시에 캐릭터 카드와 첫 대화를 확인할 수 있습니다.")}</p></div> {/* 제목 영역 */}
                <Link href={"/library" as Route}>{t("보관함 보기")}</Link> {/* 보관함 링크 */}
            </header> {/* 헤더 종료 */}
            <div className={styles.workspace}> {/* 작업 영역 */}
                <form className={styles.form} onSubmit={(event) => event.preventDefault()}> {/* 입력 폼 */}
                    <EditorStepNav steps={characterSteps} controller={steps} errors={result.errors} /> {/* 편집 단계 */}
                    {autosave.stored === null ? null : ( // 자동 저장분 판정
                        <div className={styles.draftNotice} role="group" aria-label={t("자동 저장 안내")}> {/* 자동 저장 안내 */}
                            <p>{t("지난번에 쓰다가 자동 저장한 내용이 있어요(")}{formatSavedAt(autosave.stored.savedAt)}{t("). 이어서 쓸까요?")}</p> {/* 안내 */}
                            <button type="button" className={styles.smallButton} onClick={restoreDraft}>{t("이어서 쓰기")}</button> {/* 이어 쓰기 */}
                            <button type="button" className={styles.smallButton} onClick={autosave.discard}>{t("지우기")}</button> {/* 지우기 */}
                        </div> // 자동 저장 안내 종료
                    )} {/* 판정 종료 */}
                    <EditorStepSection steps={characterSteps} step={characterSteps[0]} controller={steps}> {/* 단계 1 */}
                        <label>{t("캐릭터 이름")}<input value={draft.name} onChange={(event) => update("name", event.target.value)} maxLength={41} /></label> {/* 이름 입력 */}
                        {error("name")} {/* 이름 오류 */}
                        <label>{t("한 줄 소개")}<input value={draft.summary} onChange={(event) => update("summary", event.target.value)} maxLength={81} /></label> {/* 소개 입력 */}
                        {error("summary")} {/* 소개 오류 */}
                        <label>{t("상세 설명")}<textarea value={draft.description} onChange={(event) => update("description", event.target.value)} rows={4} /></label> {/* 설명 입력 */}
                        {error("description")} {/* 설명 오류 */}
                        <TagInput label={t("태그")} tags={draft.tags} placeholder={t("힐링, 판타지, 여행")} onChange={(tags) => update("tags", tags)} /> {/* 태그 입력(친 글자를 그대로 보여 줌) */}
                        {error("tags")} {/* 태그 오류 */}
                        <fieldset className={styles.images}> {/* 이미지 선택 */}
                            <legend>{t("대표 이미지")}</legend> {/* 이미지 제목 */}
                            {imageOptions.map((path) => <label key={path} data-selected={draft.coverImage === path}><input type="radio" name="cover-image" value={path} checked={draft.coverImage === path} onChange={() => update("coverImage", path)} /><ImageOption path={path} /></label>)} {/* 이미지 목록 */}
                            {myImages.map((image) => <label key={image.src} data-selected={draft.coverImage === image.src} data-kind="mine"><input type="radio" name="cover-image" value={image.id} checked={draft.coverImage === image.src} onChange={() => update("coverImage", image.src)} /><span><Image src={image.src} alt="" width={120} height={160} unoptimized /><small>{image.prompt}</small></span></label>)} {/* 내 이미지 */}
                        </fieldset> {/* 이미지 종료 */}
                        {error("coverImage")} {/* 이미지 오류 */}
                    </EditorStepSection> {/* 단계 1 종료 */}
                    <EditorStepSection steps={characterSteps} step={characterSteps[1]} controller={steps}> {/* 단계 2 */}
                        <label>{t("성격")}<textarea value={draft.personality} onChange={(event) => update("personality", event.target.value)} rows={4} /></label> {/* 성격 입력 */}
                        {error("personality")} {/* 성격 오류 */}
                        <label>{t("첫 인사")}<textarea value={draft.greeting} onChange={(event) => update("greeting", event.target.value)} rows={4} /></label> {/* 인사 입력 */}
                        {error("greeting")} {/* 인사 오류 */}
                        <label>{t("세계관")}<textarea value={draft.worldSetting} onChange={(event) => update("worldSetting", event.target.value)} rows={4} /></label> {/* 세계관 입력 */}
                        {error("worldSetting")} {/* 세계관 오류 */}
                        <label>{t("제작자용 비공개 프롬프트")}<textarea value={draft.prompt} onChange={(event) => update("prompt", event.target.value)} rows={4} /></label> {/* 프롬프트 입력 */}
                        {error("prompt")} {/* 프롬프트 오류 */}
                        <WorkLoreFields value={draft} errors={result.errors} replyLabel={t("캐릭터 답")} onChange={(patch) => { setDraft((current) => ({ ...current, ...patch })); setDirty(true); setNotice(""); }} /> {/* 키워드 설정집·예시 대화 */}
                    </EditorStepSection> {/* 단계 2 종료 */}
                    <EditorStepSection steps={characterSteps} step={characterSteps[2]} controller={steps}> {/* 단계 3 */}
                        <WorkExtrasFields value={draft} errors={result.errors} onChange={(patch) => { setDraft((current) => ({ ...current, ...patch })); setDirty(true); setNotice(""); }} /> {/* 플레이 가이드·상태창·업데이트 */}
                    </EditorStepSection> {/* 단계 3 종료 */}
                    <EditorStepSection steps={characterSteps} step={characterSteps[3]} controller={steps}> {/* 단계 4 */}
                        <label>{t("공개 범위")}<select value={draft.visibility} onChange={(event) => update("visibility", event.target.value as CharacterDraft["visibility"])}><option value="private">{t("비공개")}</option><option value="unlisted">{t("링크 공개")}</option><option value="public">{t("전체 공개")}</option></select></label> {/* 공개 범위 */}
                        <label>{t("이용 등급")}<select value={draft.contentRating} aria-describedby="rating-hint" onChange={(event) => update("contentRating", event.target.value as CharacterDraft["contentRating"])}><option value="all">{t("전체 이용가")}</option><option value="teen">{t("15세 이용가")}</option><option value="mature" disabled={!adultVerified}>{t("19세 이용가")}</option></select></label> {/* 이용 등급 */}
                        <p id="rating-hint" className={styles.hint}>{adultVerified ? t("19세 이용가 캐릭터는 19+를 켠 성인 인증 사용자에게만 보입니다.") : t("19세 이용가는 성인 인증 후 선택할 수 있습니다.")}</p> {/* 등급 안내 */}
                        {error("contentRating")} {/* 등급 오류 */}
                    </EditorStepSection> {/* 단계 4 종료 */}
                    <div className={styles.actions}> {/* 저장 동작 */}
                        <button type="button" className={styles.secondary} onClick={openTestChat}>{t("시험 대화")}</button> {/* 시험 대화 */}
                        <button type="button" className={styles.secondary} onClick={() => save("draft")}>{t("임시 저장")}</button> {/* 임시 저장 */}
                        <button type="button" className={styles.primary} onClick={() => save("published")}>{t("공개 저장")}</button> {/* 공개 저장 */}
                    </div> {/* 동작 종료 */}
                    <p role="status" aria-label={t("저장 상태")} className={styles.notice}>{notice}</p> {/* 저장 안내 */}
                    {autosave.savedAt === null || !dirty ? null : <p className={styles.autosave}>{t("작성 중인 내용을 자동 저장했어요 ·")} {formatSavedAt(autosave.savedAt)}</p>} {/* 자동 저장 표시 */}
                </form> {/* 폼 종료 */}
                <CharacterPreview draft={draft} /> {/* 실시간 미리보기 */}
            </div> {/* 작업 종료 */}
            {testing ? <TestChat title={draft.name.trim()} tags={draft.tags} start={startTestChat} onClose={() => setTesting(false)} llm={llm} /> : null} {/* 시험 대화 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료

function ImageOption({ path }: { path: string }) // 이미지 선택 항목
{ // 함수 시작
    const name = path.split("/").at(-1)?.replace(".webp", "") ?? t("캐릭터"); // 이미지 이름
    return <span><Image src={path} alt={t("{0} 이미지", [name])} width={120} height={160} /><small>{name}</small></span>; // 이미지 항목 반환
} // 함수 종료
