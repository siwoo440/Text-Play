"use client"; // 클라이언트 컴포넌트

import Link from "next/link"; // 내부 링크
import Image from "next/image"; // 최적화 이미지
import type { Route } from "next"; // 경로 타입
import { useEffect, useMemo, useState } from "react"; // 리액트 도구
import { CharacterPreview } from "@/features/character/CharacterPreview"; // 미리보기
import { normalizeCharacterDraft, validateCharacterDraft, type CharacterValidationResult } from "@/features/character/character-validation"; // 초안 검증
import { useAppStore } from "@/features/core/AppProvider"; // 앱 상태
import type { Character, CharacterDraft, PublicationStatus } from "@/features/core/types"; // 캐릭터 타입
import styles from "@/features/character/CharacterEditor.module.css"; // 편집기 스타일

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
    }); // 초안 종료
} // 함수 종료

export function CharacterEditor({ characterId }: { characterId?: string }) // 캐릭터 편집기
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const existing = characterId === undefined ? undefined : state.characters.find((character) => character.id === characterId); // 기존 캐릭터
    const initialDraft = useMemo(() => existing === undefined ? createEmptyDraft() : toDraft(existing), [existing]); // 초기 초안
    const [draft, setDraft] = useState<CharacterDraft>(initialDraft); // 편집 초안
    const [result, setResult] = useState<CharacterValidationResult>({ valid: true, errors: {} }); // 검증 결과
    const [notice, setNotice] = useState(""); // 저장 안내
    const [savedId] = useState(() => existing?.id ?? `character-${Date.now()}`); // 저장 식별자
    const [dirty, setDirty] = useState(false); // 변경 표시
    useEffect(() => // 이탈 경고 효과
    { // 효과 시작
        const warn = (event: BeforeUnloadEvent) => // 이탈 처리
        { // 처리 시작
            if (dirty) // 변경 판정
            { // 조건 시작
                event.preventDefault(); // 이탈 경고
            } // 조건 종료
        }; // 처리 종료
        const confirmNavigation = (event: MouseEvent) => // 내부 이동 처리
        { // 처리 시작
            if (!dirty || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) // 경고 제외 판정
            { // 조건 시작
                return; // 처리 종료
            } // 조건 종료
            const target = event.target; // 클릭 대상
            if (!(target instanceof Element)) // 요소 여부 판정
            { // 조건 시작
                return; // 처리 종료
            } // 조건 종료
            const anchor = target.closest("a[href]"); // 링크 탐색
            if (!(anchor instanceof HTMLAnchorElement)) // 링크 여부 판정
            { // 조건 시작
                return; // 처리 종료
            } // 조건 종료
            const destination = new URL(anchor.href, window.location.href); // 이동 주소 생성
            if (destination.origin !== window.location.origin) // 외부 주소 판정
            { // 조건 시작
                return; // 처리 종료
            } // 조건 종료
            const accepted = window.confirm("저장하지 않은 변경 사항이 있습니다. 페이지를 이동하시겠습니까?"); // 이동 확인
            if (!accepted) // 이동 취소 판정
            { // 조건 시작
                event.preventDefault(); // 기본 이동 취소
                event.stopPropagation(); // 링크 전파 중단
            } // 조건 종료
        }; // 처리 종료
        window.addEventListener("beforeunload", warn); // 경고 구독
        document.addEventListener("click", confirmNavigation, true); // 내부 이동 구독
        return () => // 경고 정리
        { // 정리 시작
            window.removeEventListener("beforeunload", warn); // 새로고침 경고 해제
            document.removeEventListener("click", confirmNavigation, true); // 내부 이동 해제
        }; // 정리 종료
    }, [dirty]); // 변경 상태 의존
    if (characterId !== undefined && existing === undefined) // 수정 대상 부재 판정
    { // 조건 시작
        return <main className={styles.missing}><h1>수정할 캐릭터를 찾을 수 없습니다.</h1><Link href={"/library" as Route}>보관함으로 돌아가기</Link></main>; // 부재 화면
    } // 조건 종료
    if (existing !== undefined && existing.creatorId !== state.profile.id) // 수정 권한 판정
    { // 조건 시작
        return <main className={styles.missing}><h1>이 캐릭터를 수정할 권한이 없습니다.</h1><Link href={"/library" as Route}>보관함으로 돌아가기</Link></main>; // 권한 화면
    } // 조건 종료
    const update = <K extends keyof CharacterDraft>(key: K, value: CharacterDraft[K]) => // 필드 변경
    { // 함수 시작
        setDraft((current) => ({ ...current, [key]: value })); // 초안 갱신
        setDirty(true); // 변경 표시
        setNotice(""); // 안내 초기화
    }; // 함수 종료
    const save = (publicationStatus: PublicationStatus) => // 캐릭터 저장
    { // 함수 시작
        const normalized = normalizeCharacterDraft(draft); // 초안 정규화
        const validation = validateCharacterDraft(normalized); // 초안 검증
        setResult(validation); // 검증 결과 반영
        if (!validation.valid) // 오류 판정
        { // 조건 시작
            setNotice("입력 내용을 확인해 주세요."); // 오류 안내
            return; // 저장 중단
        } // 조건 종료
        const now = new Date().toISOString(); // 현재 시각
        const character: Character = // 저장 캐릭터
        { // 캐릭터 시작
            ...normalized, // 초안 적용
            id: savedId, // 식별자 적용
            creatorId: state.profile.id, // 제작자 식별자
            creatorName: state.profile.nickname, // 제작자 이름
            publicationStatus, // 발행 상태
            popularity: existing?.popularity ?? 0, // 인기도 유지
            createdAt: existing?.createdAt ?? now, // 생성 시각 유지
            updatedAt: now, // 수정 시각 갱신
        }; // 캐릭터 종료
        dispatch({ type: "upsert-character", character }); // 캐릭터 저장
        setDraft(normalized); // 정규 초안 반영
        setDirty(false); // 변경 해제
        setNotice(publicationStatus === "draft" ? "임시 저장했습니다." : "공개 저장했습니다."); // 성공 안내
    }; // 함수 종료
    const error = (key: keyof CharacterDraft) => result.errors[key] === undefined ? null : <span role="alert" className={styles.error}>{result.errors[key]}</span>; // 오류 표시
    return ( // 편집기 반환
        <main className={styles.page}> {/* 편집기 본문 */}
            <header className={styles.header}> {/* 편집기 헤더 */}
                <div><span>CHARACTER STUDIO</span><h1>{existing === undefined ? "새 캐릭터 만들기" : `${existing.name} 수정`}</h1><p>입력과 동시에 캐릭터 카드와 첫 대화를 확인할 수 있습니다.</p></div> {/* 제목 영역 */}
                <Link href={"/library" as Route}>보관함 보기</Link> {/* 보관함 링크 */}
            </header> {/* 헤더 종료 */}
            <div className={styles.workspace}> {/* 작업 영역 */}
                <form className={styles.form} onSubmit={(event) => event.preventDefault()}> {/* 입력 폼 */}
                    <label>캐릭터 이름<input value={draft.name} onChange={(event) => update("name", event.target.value)} maxLength={41} /></label> {/* 이름 입력 */}
                    {error("name")} {/* 이름 오류 */}
                    <label>한 줄 소개<input value={draft.summary} onChange={(event) => update("summary", event.target.value)} maxLength={81} /></label> {/* 소개 입력 */}
                    {error("summary")} {/* 소개 오류 */}
                    <label>상세 설명<textarea value={draft.description} onChange={(event) => update("description", event.target.value)} rows={4} /></label> {/* 설명 입력 */}
                    {error("description")} {/* 설명 오류 */}
                    <label>성격<textarea value={draft.personality} onChange={(event) => update("personality", event.target.value)} rows={4} /></label> {/* 성격 입력 */}
                    {error("personality")} {/* 성격 오류 */}
                    <label>첫 인사<textarea value={draft.greeting} onChange={(event) => update("greeting", event.target.value)} rows={4} /></label> {/* 인사 입력 */}
                    {error("greeting")} {/* 인사 오류 */}
                    <label>세계관<textarea value={draft.worldSetting} onChange={(event) => update("worldSetting", event.target.value)} rows={4} /></label> {/* 세계관 입력 */}
                    {error("worldSetting")} {/* 세계관 오류 */}
                    <label>제작자용 비공개 프롬프트<textarea value={draft.prompt} onChange={(event) => update("prompt", event.target.value)} rows={4} /></label> {/* 프롬프트 입력 */}
                    {error("prompt")} {/* 프롬프트 오류 */}
                    <label>태그<input value={draft.tags.join(", ")} onChange={(event) => update("tags", event.target.value.split(","))} placeholder="힐링, 판타지, 여행" /></label> {/* 태그 입력 */}
                    {error("tags")} {/* 태그 오류 */}
                    <fieldset className={styles.images}> {/* 이미지 선택 */}
                        <legend>대표 이미지</legend> {/* 이미지 제목 */}
                        {imageOptions.map((path) => <label key={path} data-selected={draft.coverImage === path}><input type="radio" name="cover-image" value={path} checked={draft.coverImage === path} onChange={() => update("coverImage", path)} /><ImageOption path={path} /></label>)} {/* 이미지 목록 */}
                    </fieldset> {/* 이미지 종료 */}
                    {error("coverImage")} {/* 이미지 오류 */}
                    <label>공개 범위<select value={draft.visibility} onChange={(event) => update("visibility", event.target.value as CharacterDraft["visibility"])}><option value="private">비공개</option><option value="unlisted">링크 공개</option><option value="public">전체 공개</option></select></label> {/* 공개 범위 */}
                    <div className={styles.actions}> {/* 저장 동작 */}
                        <button type="button" className={styles.secondary} onClick={() => save("draft")}>임시 저장</button> {/* 임시 저장 */}
                        <button type="button" className={styles.primary} onClick={() => save("published")}>공개 저장</button> {/* 공개 저장 */}
                    </div> {/* 동작 종료 */}
                    <p role="status" aria-label="저장 상태" className={styles.notice}>{notice}</p> {/* 저장 안내 */}
                </form> {/* 폼 종료 */}
                <CharacterPreview draft={draft} /> {/* 실시간 미리보기 */}
            </div> {/* 작업 종료 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료

function ImageOption({ path }: { path: string }) // 이미지 선택 항목
{ // 함수 시작
    const name = path.split("/").at(-1)?.replace(".webp", "") ?? "캐릭터"; // 이미지 이름
    return <span><Image src={path} alt={`${name} 이미지`} width={120} height={160} /><small>{name}</small></span>; // 이미지 항목 반환
} // 함수 종료
