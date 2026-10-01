"use client"; // 클라이언트 컴포넌트

import { useState } from "react"; // 리액트 상태
import { ChatDialog } from "@chatbot/features/chat/ChatDialog"; // 대화상자
import { chatFontOptions, chatFontSizeOptions, getChatFontFamily, getChatFontSize, loadChatFont } from "@chatbot/features/chat/chat-fonts"; // 채팅 글꼴
import { canUseThinking, chatTiers, getReplyTokenLimit, getTierMaxCost, lengthOptions, normalizeTierOption, thinkingOptions, USER_NOTE_EXTENDED_COST, USER_NOTE_EXTENDED_LIMIT, USER_NOTE_LIMIT } from "@chatbot/features/chat/chat-tiers"; // 모델 등급
import { createMemory, getConversationMemories, MEMORY_CONTENT_LIMIT, memoryCategories, memoryCategoryLabels, type MemoryOrder } from "@chatbot/features/chat/memory-model"; // 요약 메모리
import { getStyleSample, writingStyles } from "@chatbot/features/chat/suggestion-model"; // 문체
import { DEFAULT_PERSONA_ID } from "@chatbot/features/core/defaults"; // 기본 프로필
import type { CharacterMemory, ChatFont, ChatFontSize, ChatTierId, MemoryCategory, Persona, TierOption, WorkUpdate, WritingStyle } from "@chatbot/features/core/types"; // 도메인 타입
import styles from "@chatbot/features/chat/ChatPanels.module.css"; // 채팅 보조 영역 스타일

export function TierDialog({ tierOptions, onSave, onClose }: { tierOptions: Record<ChatTierId, TierOption>; onSave(options: Record<ChatTierId, TierOption>): void; onClose(): void }) // 답변 길이 및 생각 조절
{ // 함수 시작
    const [draft, setDraft] = useState(() => structuredClone(tierOptions)); // 편집 값
    const [expanded, setExpanded] = useState<ChatTierId | null>(null); // 펼친 등급
    const update = (tier: ChatTierId, patch: Partial<TierOption>) => setDraft((current) => ({ ...current, [tier]: normalizeTierOption({ ...current[tier], ...patch }) })); // 값 변경
    return ( // 대화상자 반환
        <ChatDialog title="답변 길이 및 생각 조절" description="이 채팅방의 답변 최대 길이와 생각 깊이를 모델 등급별로 조절해요. 기본 길이를 넘는 만큼만 토큰이 더 들어요." onClose={onClose} footer={<button type="button" className={styles.primaryButton} onClick={() => { onSave(draft); onClose(); }}>저장</button>}> {/* 대화상자 */}
            <ul className={styles.tierList}> {/* 등급 목록 */}
                {chatTiers.map((tier) => // 등급 순회
                { // 순회 시작
                    const option = draft[tier.id]; // 등급 값
                    const open = expanded === tier.id; // 펼침 여부
                    const lengthIndex = lengthOptions.findIndex((item) => item.value === option.length); // 길이 위치
                    const thinkingIndex = thinkingOptions.findIndex((item) => item.value === option.thinking); // 생각 위치
                    return ( // 등급 반환
                        <li key={tier.id} data-tier={tier.id}> {/* 등급 */}
                            <button type="button" className={styles.tierRow} aria-expanded={open} onClick={() => setExpanded(open ? null : tier.id)}><strong>{tier.label}</strong><span>최대 {getTierMaxCost(tier.id)} 토큰</span><span aria-hidden="true">{open ? "⌃" : "›"}</span></button> {/* 등급 줄 */}
                            {!open ? null : ( // 펼침 판정
                                <div className={styles.tierBody}> {/* 조절 */}
                                    <label>답변 최대 길이 ({getReplyTokenLimit(option.length).toLocaleString("ko-KR")} 토큰)<input type="range" min={0} max={lengthOptions.length - 1} step={1} value={lengthIndex} aria-valuetext={lengthOptions[lengthIndex].label} onChange={(event) => update(tier.id, { length: lengthOptions[Number(event.target.value)].value })} /></label> {/* 길이 */}
                                    <small className={styles.hintText}>추가 500토큰 구간당 {tier.extraPerBlock} 토큰</small> {/* 추가 비용 */}
                                    <div className={styles.rangeLabels} aria-hidden="true">{lengthOptions.map((item) => <span key={item.label}>{item.label}</span>)}</div> {/* 눈금 */}
                                    <label>생각 깊이<input type="range" min={0} max={thinkingOptions.length - 1} step={1} value={thinkingIndex} disabled={!canUseThinking(option.length)} aria-valuetext={thinkingOptions[thinkingIndex].label} onChange={(event) => update(tier.id, { thinking: thinkingOptions[Number(event.target.value)].value })} /></label> {/* 생각 */}
                                    {canUseThinking(option.length) ? null : <small className={styles.warnText}>답변 최대 길이가 1.5배 이상일 때만 설정할 수 있어요</small>} {/* 생각 조건 */}
                                    <div className={styles.rangeLabels} aria-hidden="true">{thinkingOptions.map((item) => <span key={item.label}>{item.label}</span>)}</div> {/* 눈금 */}
                                </div> // 조절 종료
                            )} {/* 펼침 종료 */}
                        </li> // 등급 종료
                    ); // 반환 종료
                })} {/* 순회 종료 */}
            </ul> {/* 목록 종료 */}
        </ChatDialog> // 대화상자 종료
    ); // 반환 종료
} // 함수 종료

export function MemoryDialog({ conversationId, characterId, memories, onUpsert, onDelete, onClose }: { conversationId: string; characterId: string; memories: CharacterMemory[]; onUpsert(memories: CharacterMemory[]): void; onDelete(memoryId: string): void; onClose(): void }) // 요약 메모리
{ // 함수 시작
    const [category, setCategory] = useState<MemoryCategory>("long"); // 분류
    const [order, setOrder] = useState<MemoryOrder>("newest"); // 정렬
    const [editing, setEditing] = useState(false); // 편집 모드
    const [adding, setAdding] = useState(false); // 추가 입력
    const [draft, setDraft] = useState(""); // 추가 내용
    const [edits, setEdits] = useState<Record<string, string>>({}); // 고친 내용
    const list = getConversationMemories(memories, conversationId, category, order); // 현재 목록
    const add = () => // 추가
    { // 함수 시작
        if (draft.trim().length === 0) // 빈 입력
        { // 조건 시작
            return; // 생략
        } // 조건 종료
        const now = new Date().toISOString(); // 시각
        onUpsert([createMemory({ id: `memory-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, conversationId, characterId, category, content: draft, editedByUser: true, now })]); // 저장
        setDraft(""); // 비우기
        setAdding(false); // 닫기
    }; // 함수 종료
    const saveEdits = () => // 편집 저장
    { // 함수 시작
        const now = new Date().toISOString(); // 시각
        const changed = list.filter((memory) => edits[memory.id] !== undefined && edits[memory.id].trim() !== memory.content && edits[memory.id].trim().length > 0).map((memory) => ({ ...memory, content: edits[memory.id].trim().slice(0, MEMORY_CONTENT_LIMIT), editedByUser: true, updatedAt: now })); // 바뀐 기억
        if (changed.length > 0) // 변경 판정
        { // 조건 시작
            onUpsert(changed); // 저장
        } // 조건 종료
        setEdits({}); // 초기화
        setEditing(false); // 편집 종료
    }; // 함수 종료
    return ( // 대화상자 반환
        <ChatDialog title="요약 메모리" onClose={onClose} wide footer={editing ? <><button type="button" className={styles.secondaryButton} onClick={() => { setEdits({}); setEditing(false); }}>취소</button><button type="button" className={styles.primaryButton} onClick={saveEdits}>편집 저장</button></> : <><button type="button" className={styles.secondaryButton} disabled={list.length === 0} onClick={() => setEditing(true)}>편집</button><button type="button" className={styles.primaryButton} onClick={() => setAdding(true)}>추가</button></>}> {/* 대화상자 */}
            <div className={styles.chipTabs} role="tablist" aria-label="메모리 분류"> {/* 분류 */}
                {memoryCategories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} onClick={() => { setCategory(item); setEditing(false); setAdding(false); }}>{memoryCategoryLabels[item]}</button>)} {/* 분류 버튼 */}
            </div> {/* 분류 종료 */}
            <div className={styles.memoryHead}><strong>총 {list.length}개</strong><label><span className="sr-only">정렬</span><select value={order} onChange={(event) => setOrder(event.target.value as MemoryOrder)}><option value="newest">최신순</option><option value="oldest">오래된순</option></select></label></div> {/* 개수·정렬 */}
            {adding ? <div className={styles.memoryAdd}><label>{memoryCategoryLabels[category]} 추가<textarea value={draft} maxLength={MEMORY_CONTENT_LIMIT} rows={3} placeholder="기억해 둘 내용을 적어 주세요." onChange={(event) => setDraft(event.target.value)} /></label><div><button type="button" className={styles.secondaryButton} onClick={() => setAdding(false)}>취소</button><button type="button" className={styles.primaryButton} onClick={add}>등록</button></div></div> : null} {/* 추가 입력 */}
            {list.length === 0 ? <p className={styles.emptyText}>{category === "goal" ? "이 대화의 목표를 추가해 보세요." : "요약 메모리가 추가되려면 더 많은 메시지가 필요해요."}</p> : ( // 목록 판정
                <ul className={styles.memoryList}> {/* 기억 목록 */}
                    {list.map((memory) => <li key={memory.id}>{editing ? <><textarea aria-label={`${memoryCategoryLabels[category]} 내용 수정`} value={edits[memory.id] ?? memory.content} maxLength={MEMORY_CONTENT_LIMIT} rows={2} onChange={(event) => setEdits((current) => ({ ...current, [memory.id]: event.target.value }))} /><button type="button" className={styles.dangerText} aria-label={`${memory.content} 삭제`} onClick={() => onDelete(memory.id)}>삭제</button></> : <><p>{memory.content}</p><small>{memory.editedByUser ? "직접 작성 · " : "자동 요약 · "}{new Date(memory.updatedAt).toLocaleDateString("ko-KR")}</small></>}</li>)} {/* 기억 */}
                </ul> // 목록 종료
            )} {/* 목록 판정 종료 */}
        </ChatDialog> // 대화상자 종료
    ); // 반환 종료
} // 함수 종료

export function StyleDialog({ value, sampleName, onSave, onClose }: { value: WritingStyle; sampleName: string; onSave(style: WritingStyle): void; onClose(): void }) // 문체 변경
{ // 함수 시작
    const [style, setStyle] = useState(value); // 고른 문체
    const sample = getStyleSample(style, sampleName); // 미리보기
    return ( // 대화상자 반환
        <ChatDialog title="문체 변경" onClose={onClose} wide footer={<button type="button" className={styles.primaryButton} onClick={() => { onSave(style); onClose(); }}>확인</button>}> {/* 대화상자 */}
            <fieldset className={styles.radioCards}> {/* 문체 선택 */}
                <legend className="sr-only">문체</legend> {/* 제목 */}
                {writingStyles.map((item) => <label key={item.id} data-selected={style === item.id ? "true" : undefined}><input type="radio" name="writing-style" checked={style === item.id} onChange={() => setStyle(item.id)} /><span><strong>{item.label}</strong><small>{item.description}</small></span></label>)} {/* 문체 카드 */}
            </fieldset> {/* 선택 종료 */}
            <div className={styles.preview} aria-label="문체 미리보기"><strong>{writingStyles.find((item) => item.id === style)?.label}</strong>{sample.map((line) => <p key={line}>{line}</p>)}</div> {/* 미리보기 */}
        </ChatDialog> // 대화상자 종료
    ); // 반환 종료
} // 함수 종료

export function UserNoteDialog({ note, extended, onSave, onClose }: { note: string; extended: boolean; onSave(note: string, extended: boolean): void; onClose(): void }) // 유저 노트
{ // 함수 시작
    const [text, setText] = useState(note); // 노트
    const [wide, setWide] = useState(extended); // 확장
    const limit = wide ? USER_NOTE_EXTENDED_LIMIT : USER_NOTE_LIMIT; // 글자 한도
    return ( // 대화상자 반환
        <ChatDialog title="유저노트" description="이 채팅방에서 반드시 기억해 줬으면 하는 내용을 적어 주세요." onClose={onClose} footer={<button type="button" className={styles.primaryButton} disabled={text.length > limit} onClick={() => { onSave(text.trim(), wide); onClose(); }}>등록</button>}> {/* 대화상자 */}
            <label className={styles.fieldLabel}><span className="sr-only">유저노트 내용</span><textarea value={text} rows={8} maxLength={USER_NOTE_EXTENDED_LIMIT} placeholder="잊으면 안 되는 중요한 내용, 추가하고 싶은 설정 등" onChange={(event) => setText(event.target.value)} /></label> {/* 노트 */}
            <div className={styles.noteFoot}> {/* 아래 줄 */}
                <label className={styles.switch}><input type="checkbox" role="switch" checked={wide} onChange={(event) => setWide(event.target.checked)} /><span><strong>유저노트 {USER_NOTE_EXTENDED_LIMIT.toLocaleString("ko-KR")}자 확장</strong><small>메시지당 {USER_NOTE_EXTENDED_COST} 토큰 추가</small></span></label> {/* 확장 */}
                <span className={styles.counter} data-over={text.length > limit ? "true" : undefined}>{text.length}/{limit}</span> {/* 글자 수 */}
            </div> {/* 아래 줄 종료 */}
            {text.length > limit ? <p className={styles.warnText} role="alert">{limit}자 이하로 줄이거나 확장을 켜 주세요.</p> : null} {/* 초과 안내 */}
        </ChatDialog> // 대화상자 종료
    ); // 반환 종료
} // 함수 종료

export function PersonaDialog({ personas, currentId, onSelect, onUpsert, onDelete, onClose }: { personas: Persona[]; currentId: string; onSelect(personaId: string): void; onUpsert(persona: Persona): void; onDelete(personaId: string): void; onClose(): void }) // 대화 프로필
{ // 함수 시작
    const [form, setForm] = useState<Persona | null>(null); // 편집 중 프로필
    const [menuFor, setMenuFor] = useState<string | null>(null); // 메뉴 연 프로필
    const startNew = () => { const now = new Date().toISOString(); setForm({ id: `persona-${Date.now().toString(36)}`, name: "", description: "", createdAt: now, updatedAt: now }); }; // 새 프로필
    const save = () => // 저장
    { // 함수 시작
        if (form === null || form.name.trim().length === 0) // 빈 이름
        { // 조건 시작
            return; // 생략
        } // 조건 종료
        onUpsert({ ...form, name: form.name.trim().slice(0, 20), description: form.description.trim().slice(0, 300), updatedAt: new Date().toISOString() }); // 저장
        setForm(null); // 닫기
    }; // 함수 종료
    return ( // 대화상자 반환
        <ChatDialog title="대화 프로필" description="이 채팅방에서 내가 어떤 사람으로 등장할지 골라요." onClose={onClose}> {/* 대화상자 */}
            <ul className={styles.personaList}> {/* 프로필 목록 */}
                {personas.map((persona) => <li key={persona.id} data-current={persona.id === currentId ? "true" : undefined}><button type="button" className={styles.personaPick} aria-pressed={persona.id === currentId} onClick={() => onSelect(persona.id)}>{persona.id === currentId ? <span className={styles.currentBadge}>현재</span> : null}<strong>{persona.name}</strong>{persona.description.length === 0 ? null : <small>{persona.description}</small>}</button><button type="button" className={styles.moreButton} aria-label={`${persona.name} 프로필 메뉴`} aria-expanded={menuFor === persona.id} onClick={() => setMenuFor(menuFor === persona.id ? null : persona.id)}>…</button>{menuFor === persona.id ? <div className={styles.inlineMenu}><button type="button" onClick={() => { setForm(structuredClone(persona)); setMenuFor(null); }}>수정</button>{persona.id === DEFAULT_PERSONA_ID ? null : <button type="button" className={styles.dangerText} onClick={() => { onDelete(persona.id); setMenuFor(null); }}>삭제</button>}</div> : null}</li>)} {/* 프로필 */}
            </ul> {/* 목록 종료 */}
            {form === null ? <button type="button" className={styles.wideButton} onClick={startNew}>프로필 추가</button> : ( // 편집 판정
                <div className={styles.personaForm}> {/* 편집 */}
                    <label className={styles.fieldLabel}>이름<input value={form.name} maxLength={20} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label> {/* 이름 */}
                    <label className={styles.fieldLabel}>소개<textarea value={form.description} maxLength={300} rows={3} placeholder="예: 오늘 처음 출근한 신입 사원" onChange={(event) => setForm({ ...form, description: event.target.value })} /></label> {/* 소개 */}
                    <div className={styles.rowButtons}><button type="button" className={styles.secondaryButton} onClick={() => setForm(null)}>취소</button><button type="button" className={styles.primaryButton} disabled={form.name.trim().length === 0} onClick={save}>프로필 저장</button></div> {/* 동작 */}
                </div> // 편집 종료
            )} {/* 편집 판정 종료 */}
        </ChatDialog> // 대화상자 종료
    ); // 반환 종료
} // 함수 종료

export function PlayGuideDialog({ text, onClose }: { text: string; onClose(): void }) // 플레이 가이드
{ // 함수 시작
    return ( // 대화상자 반환
        <ChatDialog title="플레이 가이드" onClose={onClose} footer={<button type="button" className={styles.primaryButton} onClick={onClose}>확인</button>}> {/* 대화상자 */}
            <div className={styles.guideText}>{text.trim().length === 0 ? "제작자가 작성한 플레이 가이드가 없어요." : text}</div> {/* 가이드 */}
        </ChatDialog> // 대화상자 종료
    ); // 반환 종료
} // 함수 종료

export function FontDialog({ font, size, onSave, onClose }: { font: ChatFont; size: ChatFontSize; onSave(font: ChatFont, size: ChatFontSize): void; onClose(): void }) // 글꼴
{ // 함수 시작
    const [picked, setPicked] = useState(font); // 고른 글꼴
    const [pickedSize, setPickedSize] = useState(size); // 고른 크기
    const choose = (id: ChatFont) => { loadChatFont(id); setPicked(id); }; // 글꼴 고르기(미리 불러오기)
    return ( // 대화상자 반환
        <ChatDialog title="글꼴" onClose={onClose} footer={<><button type="button" className={styles.secondaryButton} onClick={onClose}>취소</button><button type="button" className={styles.primaryButton} onClick={() => { onSave(picked, pickedSize); onClose(); }}>확인</button></>}> {/* 대화상자 */}
            <fieldset className={styles.radioCards}> {/* 글꼴 */}
                <legend className="sr-only">글꼴</legend> {/* 제목 */}
                {chatFontOptions.map((option) => <label key={option.id} data-selected={picked === option.id ? "true" : undefined}><input type="radio" name="chat-font" checked={picked === option.id} onChange={() => choose(option.id)} /><span style={{ fontFamily: option.family }}><strong>{option.label}</strong></span></label>)} {/* 글꼴 카드 */}
            </fieldset> {/* 글꼴 종료 */}
            <fieldset className={styles.segmented}> {/* 크기 */}
                <legend>글자 크기</legend> {/* 제목 */}
                {chatFontSizeOptions.map((option) => <label key={option.id} data-selected={pickedSize === option.id ? "true" : undefined}><input type="radio" name="chat-font-size" checked={pickedSize === option.id} onChange={() => setPickedSize(option.id)} />{option.label}</label>)} {/* 크기 선택 */}
            </fieldset> {/* 크기 종료 */}
            <div className={styles.preview} aria-label="글꼴 미리보기" style={{ fontFamily: getChatFontFamily(picked), fontSize: getChatFontSize(pickedSize) }}><p>비가 그친 밤, 기록관 창가에 달빛이 번졌다. 펼쳐진 책의 마지막 페이지는 아직 하얗게 비어 있었다.</p><p><strong>리안 |</strong> 왔구나. 마침 손이 하나 더 필요했어.</p></div> {/* 미리보기 */}
        </ChatDialog> // 대화상자 종료
    ); // 반환 종료
} // 함수 종료

export const shortcutList: Array<{ keys: string; action: string }> = // 키보드 단축키
[ // 목록 시작
    { keys: "Enter", action: "메시지 보내기" }, // 전송
    { keys: "Shift + Enter", action: "줄 바꾸기" }, // 줄바꿈
    { keys: "/", action: "명령어 열기(빈 입력창에서)" }, // 명령어
    { keys: "Alt + S", action: "추천 답변 열기·닫기" }, // 추천
    { keys: "Alt + 8", action: "지문(*행동*) 넣기" }, // 지문
    { keys: "Alt + R", action: "마지막 응답 다시 생성" }, // 다시 생성
    { keys: "Alt + I", action: "상태창 접기·펼치기" }, // 상태창
    { keys: "Alt + ← / →", action: "이전·다음 턴 상태창 보기" }, // 상태창 이동
    { keys: "Esc", action: "열린 창 닫기" }, // 닫기
]; // 목록 종료

export function ShortcutsDialog({ onClose }: { onClose(): void }) // 키보드 단축키
{ // 함수 시작
    return ( // 대화상자 반환
        <ChatDialog title="키보드 단축키" onClose={onClose} footer={<button type="button" className={styles.primaryButton} onClick={onClose}>확인</button>}> {/* 대화상자 */}
            <dl className={styles.shortcutList}>{shortcutList.map((item) => <div key={item.keys}><dt><kbd>{item.keys}</kbd></dt><dd>{item.action}</dd></div>)}</dl> {/* 단축키 */}
        </ChatDialog> // 대화상자 종료
    ); // 반환 종료
} // 함수 종료

export function UpdatesDialog({ updates, onClose }: { updates: WorkUpdate[]; onClose(): void }) // 업데이트 정보
{ // 함수 시작
    return ( // 대화상자 반환
        <ChatDialog title="업데이트 정보" onClose={onClose} footer={<button type="button" className={styles.primaryButton} onClick={onClose}>확인</button>}> {/* 대화상자 */}
            <ol className={styles.updateTimeline}>{updates.map((update) => <li key={update.id}><div><strong>{update.version}</strong><small>{update.date}</small></div><p>{update.note}</p></li>)}</ol> {/* 기록 */}
        </ChatDialog> // 대화상자 종료
    ); // 반환 종료
} // 함수 종료
