"use client"; // 클라이언트 컴포넌트

import { useState } from "react"; // 리액트 상태
import type { WorkExtras } from "@chatbot/features/core/defaults"; // 작품 추가 필드
import type { StatusTemplate } from "@chatbot/features/core/types"; // 상태창 형식
import { createWorkUpdate, CUSTOM_LABEL_LIMIT, PLAY_GUIDE_LIMIT, UPDATE_NOTE_LIMIT, type WorkExtrasErrors } from "@chatbot/features/character/work-extras"; // 추가 필드 규칙
import { getDateKey } from "@chatbot/lib/time/date-key"; // 날짜 키
import styles from "@chatbot/features/character/CharacterEditor.module.css"; // 편집기 스타일

const statusItems: Array<{ key: keyof Omit<StatusTemplate, "enabled" | "customLabels">; label: string }> = [{ key: "location", label: "장소" }, { key: "time", label: "작품 속 시간" }, { key: "tip", label: "진행 팁" }, { key: "affection", label: "호감도" }, { key: "thought", label: "속마음" }]; // 상태창 항목

export function WorkExtrasFields({ value, errors, onChange }: { value: WorkExtras; errors: WorkExtrasErrors; onChange(patch: Partial<WorkExtras>): void }) // 플레이 가이드·상태창·업데이트 기록 입력
{ // 함수 시작
    const [version, setVersion] = useState(""); // 새 기록 버전
    const [note, setNote] = useState(""); // 새 기록 내용
    const template = value.statusTemplate; // 상태창 형식
    const setTemplate = (patch: Partial<StatusTemplate>) => onChange({ statusTemplate: { ...template, ...patch } }); // 형식 변경
    const labels = [template.customLabels[0] ?? "", template.customLabels[1] ?? ""]; // 직접 항목 두 칸
    const addUpdate = () => // 기록 추가
    { // 함수 시작
        if (version.trim().length === 0 || note.trim().length === 0) // 빈 입력 판정
        { // 조건 시작
            return; // 추가 중단
        } // 조건 종료
        onChange({ updates: [createWorkUpdate(version, note, getDateKey(new Date())), ...value.updates] }); // 최신 기록을 앞에
        setVersion(""); // 입력 비우기
        setNote(""); // 입력 비우기
    }; // 함수 종료
    return ( // 입력 반환
        <> {/* 추가 필드 묶음 */}
            <label>플레이 가이드<textarea value={value.playGuide} maxLength={PLAY_GUIDE_LIMIT + 1} rows={6} placeholder="진행 방법, 숨은 공간, 상태창 활용법처럼 대화 전에 알려 주고 싶은 내용을 적어 주세요." onChange={(event) => onChange({ playGuide: event.target.value })} /></label> {/* 플레이 가이드 */}
            {errors.playGuide === undefined ? null : <span role="alert" className={styles.error}>{errors.playGuide}</span>} {/* 가이드 오류 */}
            <fieldset className={styles.optionGroup}> {/* 상태창 */}
                <legend>상태창</legend> {/* 제목 */}
                <label className={styles.switchRow}><input type="checkbox" checked={template.enabled} onChange={(event) => setTemplate({ enabled: event.target.checked })} />매 턴 상태창 보여 주기</label> {/* 사용 여부 */}
                <div className={styles.checkGrid}>{statusItems.map((item) => <label key={item.key}><input type="checkbox" checked={template[item.key]} disabled={!template.enabled} onChange={(event) => setTemplate({ [item.key]: event.target.checked })} />{item.label}</label>)}</div> {/* 항목 선택 */}
                <div className={styles.inlineFields}>{labels.map((label, index) => <label key={index}>직접 항목 {index + 1}<input value={label} maxLength={CUSTOM_LABEL_LIMIT + 1} disabled={!template.enabled} placeholder={index === 0 ? "예: 단서" : "예: 체력"} onChange={(event) => { const next = [...labels]; next[index] = event.target.value; setTemplate({ customLabels: next }); }} /></label>)}</div> {/* 직접 항목 */}
            </fieldset> {/* 상태창 종료 */}
            {errors.statusTemplate === undefined ? null : <span role="alert" className={styles.error}>{errors.statusTemplate}</span>} {/* 상태창 오류 */}
            <fieldset className={styles.optionGroup}> {/* 업데이트 기록 */}
                <legend>업데이트 기록</legend> {/* 제목 */}
                <div className={styles.inlineFields}> {/* 새 기록 */}
                    <label>버전<input value={version} maxLength={20} placeholder="예: V2" onChange={(event) => setVersion(event.target.value)} /></label> {/* 버전 */}
                    <label className={styles.grow}>변경 내용<input value={note} maxLength={UPDATE_NOTE_LIMIT} placeholder="예: 새 시작 장면 추가" onChange={(event) => setNote(event.target.value)} /></label> {/* 내용 */}
                    <button type="button" className={styles.smallButton} onClick={addUpdate}>기록 추가</button> {/* 추가 */}
                </div> {/* 새 기록 종료 */}
                {value.updates.length === 0 ? <p className={styles.hint}>아직 업데이트 기록이 없어요. 대화 화면의 업데이트 정보에 표시됩니다.</p> : <ul className={styles.updateList} aria-label="업데이트 기록 목록">{value.updates.map((update) => <li key={update.id}><strong>{update.version}</strong><small>{update.date}</small><span>{update.note}</span><button type="button" aria-label={`${update.version} 기록 삭제`} onClick={() => onChange({ updates: value.updates.filter((item) => item.id !== update.id) })}>삭제</button></li>)}</ul>} {/* 기록 목록 */}
            </fieldset> {/* 업데이트 종료 */}
            {errors.updates === undefined ? null : <span role="alert" className={styles.error}>{errors.updates}</span>} {/* 기록 오류 */}
        </> // 묶음 종료
    ); // 반환 종료
} // 함수 종료
