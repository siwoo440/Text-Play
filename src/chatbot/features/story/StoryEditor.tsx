"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Image from "@/desktop/next-compat/image"; // 최적화 이미지
import Link from "@/desktop/next-compat/link"; // 내부 링크
import { useState } from "react"; // 리액트 상태
import { StatusScreen } from "@chatbot/components/feedback/StatusScreen"; // 공통 상태 화면
import { canViewMatureContent, contentRatingLabels, isAdultVerified } from "@chatbot/features/adult/adult-access"; // 19세 판정·등급 문구
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import type { Character, ContentRating, PublicationStatus, Story, StoryCastMember } from "@chatbot/features/core/types"; // 도메인 타입
import { useUnsavedChangesGuard } from "@chatbot/features/core/useUnsavedChangesGuard"; // 이탈 경고
import { matchesKoreanText } from "@chatbot/features/conversation/conversation-list-model"; // 초성 포함 검색
import { STORY_CAST_LIMIT } from "@chatbot/features/story/story-model"; // 등장인물 최대 수
import { createEmptyStoryDraft, createStoryCastMember, getCastRequiredRating, getStoryCandidates, isRatingBelow, normalizeStoryDraft, storyCoverOptions, toStoryDraft, validateStoryDraft, type StoryDraft, type StoryValidationResult } from "@chatbot/features/story/story-validation"; // 초안 도구
import editorStyles from "@chatbot/features/character/CharacterEditor.module.css"; // 공통 편집기 스타일
import styles from "@chatbot/features/story/StoryEditor.module.css"; // 스토리 편집기 스타일

const ratingOptions: ContentRating[] = ["all", "teen", "mature"]; // 등급 선택지
const coverNames: Record<string, string> = { "/images/scenes/moon-library.svg": "달빛 도서관", "/images/scenes/rainy-classroom.svg": "비 오는 교실", "/images/scenes/dawn-letter.svg": "새벽 편지" }; // 표지 이름

export function StoryEditor({ storyId }: { storyId?: string }) // 스토리 편집기
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const existing = storyId === undefined ? undefined : state.stories.find((story) => story.id === storyId); // 기존 스토리
    const [draft, setDraft] = useState<StoryDraft>(() => existing === undefined ? createEmptyStoryDraft() : toStoryDraft(existing)); // 편집 초안
    const [result, setResult] = useState<StoryValidationResult>({ valid: true, errors: {} }); // 검증 결과
    const [notice, setNotice] = useState(""); // 저장 안내
    const [ratingNotice, setRatingNotice] = useState(""); // 등급 자동 조정 안내
    const [savedId] = useState(() => existing?.id ?? `story-${Date.now()}`); // 저장 식별자
    const [dirty, setDirty] = useState(false); // 변경 표시
    const [pickerQuery, setPickerQuery] = useState(""); // 등장인물 검색어
    useUnsavedChangesGuard(dirty); // 저장하지 않은 변경 이탈 경고
    if (storyId !== undefined && existing === undefined) // 수정 대상 부재 판정
    { // 조건 시작
        return ( // 부재 화면 반환
            <StatusScreen tone="not-found" label="STORY NOT FOUND" title="수정할 스토리를 찾을 수 없습니다" description="주소가 잘못되었거나 이 브라우저에서 삭제된 스토리입니다."> {/* 부재 안내 */}
                <Link href={"/stories" as Route}>스토리 모드로 이동</Link> {/* 목록 링크 */}
            </StatusScreen> // 부재 안내 종료
        ); // 반환 종료
    } // 조건 종료
    if (existing !== undefined && existing.creatorId !== state.profile.id) // 수정 권한 판정
    { // 조건 시작
        return ( // 권한 화면 반환
            <StatusScreen tone="restricted" label="NO PERMISSION" title="이 스토리를 수정할 권한이 없습니다." description="직접 만든 스토리만 수정할 수 있습니다. 상세 화면에서 이야기를 시작할 수 있습니다."> {/* 권한 안내 */}
                <Link href={`/stories/${encodeURIComponent(existing.id)}` as Route}>스토리 상세로 이동</Link> {/* 상세 링크 */}
            </StatusScreen> // 권한 안내 종료
        ); // 반환 종료
    } // 조건 종료
    const now = new Date(); // 현재 시각
    const adultVerified = isAdultVerified(state.profile, now); // 성인 인증 상태
    const candidates = getStoryCandidates(state, canViewMatureContent(state, now)); // 고를 수 있는 캐릭터
    const castCharacters = draft.cast.flatMap((member) => state.characters.filter((character) => character.id === member.characterId && !candidates.includes(character))); // 이미 들어간 다른 캐릭터(수정 시)
    const choices = [...candidates, ...castCharacters].filter((character) => draft.cast.some((member) => member.characterId === character.id) || matchesKoreanText(`${character.name} ${character.tags.join(" ")}`, pickerQuery)); // 화면 후보(고른 인물은 항상 표시)
    const required = getCastRequiredRating(draft.cast, state.characters); // 등장인물 기준 최소 등급
    const full = draft.cast.length >= STORY_CAST_LIMIT; // 인원 가득 참 여부
    const saved = state.stories.some((story) => story.id === savedId); // 저장된 적 있는지
    const touch = () => // 변경 표시
    { // 함수 시작
        setDirty(true); // 변경 표시
        setNotice(""); // 저장 안내 지우기
    }; // 함수 종료
    const update = <K extends keyof StoryDraft>(key: K, value: StoryDraft[K]) => // 필드 변경
    { // 함수 시작
        setDraft((current) => ({ ...current, [key]: value })); // 초안 갱신
        if (key === "contentRating") // 등급 직접 변경 판정
        { // 조건 시작
            setRatingNotice(""); // 자동 조정 안내 지우기
        } // 조건 종료
        touch(); // 변경 표시
    }; // 함수 종료
    const changeCast = (cast: StoryCastMember[]) => // 등장인물 변경(등급 자동 맞춤)
    { // 함수 시작
        const nextRequired = getCastRequiredRating(cast, state.characters); // 새 최소 등급
        const raise = isRatingBelow(draft.contentRating, nextRequired); // 등급 올림 필요 여부
        setDraft((current) => ({ ...current, cast, contentRating: raise ? nextRequired : current.contentRating })); // 초안 갱신
        setRatingNotice(raise ? `등장인물에 맞춰 이용 등급을 ${contentRatingLabels[nextRequired]}로 올렸어요.` : ""); // 조정 안내
        touch(); // 변경 표시
    }; // 함수 종료
    const toggleCharacter = (character: Character) => // 등장인물 넣기·빼기
    { // 함수 시작
        const included = draft.cast.some((member) => member.characterId === character.id); // 포함 여부
        if (included) // 빼기 판정
        { // 조건 시작
            changeCast(draft.cast.filter((member) => member.characterId !== character.id)); // 빼기
            return; // 처리 종료
        } // 조건 종료
        if (!full) // 자리 있음 판정
        { // 조건 시작
            changeCast([...draft.cast, createStoryCastMember(character)]); // 넣기
        } // 조건 종료
    }; // 함수 종료
    const updateMember = (index: number, patch: Partial<StoryCastMember>) => // 등장인물 정보 변경
    { // 함수 시작
        setDraft((current) => ({ ...current, cast: current.cast.map((member, position) => position === index ? { ...member, ...patch } : member) })); // 해당 인물 갱신
        touch(); // 변경 표시
    }; // 함수 종료
    const moveForward = (index: number) => // 앞으로 옮기기
    { // 함수 시작
        if (index === 0) // 맨 앞 판정
        { // 조건 시작
            return; // 이동 생략
        } // 조건 종료
        const cast = [...draft.cast]; // 복사
        [cast[index - 1], cast[index]] = [cast[index], cast[index - 1]]; // 자리 바꾸기
        changeCast(cast); // 반영
    }; // 함수 종료
    const save = (publicationStatus: PublicationStatus) => // 스토리 저장
    { // 함수 시작
        const normalized = normalizeStoryDraft(draft); // 초안 정리
        const validation = validateStoryDraft(normalized, state.characters); // 초안 검증
        if (validation.valid && normalized.contentRating === "mature" && !adultVerified) // 인증 없는 19세 판정
        { // 조건 시작
            setResult({ valid: false, errors: { contentRating: "19세 이용가는 성인 인증 후 선택할 수 있습니다." } }); // 등급 오류
            setNotice("입력 내용을 확인해 주세요."); // 오류 안내
            return; // 저장 중단
        } // 조건 종료
        setResult(validation); // 검증 결과 반영
        if (!validation.valid) // 오류 판정
        { // 조건 시작
            setNotice("입력 내용을 확인해 주세요."); // 오류 안내
            return; // 저장 중단
        } // 조건 종료
        const stamp = new Date().toISOString(); // 저장 시각
        const previous = state.stories.find((story) => story.id === savedId); // 이전 저장본
        const story: Story = // 저장 스토리
        { // 스토리 시작
            ...normalized, // 초안 적용
            id: savedId, // 식별자
            creatorId: state.profile.id, // 제작자
            creatorName: state.profile.nickname, // 제작자 이름
            publicationStatus, // 발행 상태
            popularity: previous?.popularity ?? 0, // 인기도 유지
            createdAt: previous?.createdAt ?? stamp, // 생성 시각 유지
            updatedAt: stamp, // 수정 시각
        }; // 스토리 종료
        dispatch({ type: "upsert-story", story }); // 스토리 저장
        setDraft(normalized); // 정리 초안 반영
        setDirty(false); // 변경 해제
        setNotice(publicationStatus === "draft" ? "임시 저장했습니다." : "공개 저장했습니다."); // 성공 안내
    }; // 함수 종료
    const error = (key: keyof StoryDraft) => result.errors[key] === undefined ? null : <span role="alert" className={editorStyles.error}>{result.errors[key]}</span>; // 오류 표시
    return ( // 편집기 반환
        <main className={editorStyles.page}> {/* 편집기 본문 */}
            <header className={editorStyles.header}> {/* 편집기 머리말 */}
                <div><span>STORY STUDIO</span><h1>{existing === undefined ? "새 스토리 만들기" : `${existing.title} 수정`}</h1><p>캐릭터 1~{STORY_CAST_LIMIT}명을 불러 모아 하나의 상황극을 만듭니다.</p></div> {/* 제목 영역 */}
                <Link href={"/library" as Route}>보관함 보기</Link> {/* 보관함 링크 */}
            </header> {/* 머리말 종료 */}
            <div className={editorStyles.workspace}> {/* 작업 영역 */}
                <form className={editorStyles.form} onSubmit={(event) => event.preventDefault()}> {/* 입력 폼 */}
                    <label>스토리 제목<input value={draft.title} onChange={(event) => update("title", event.target.value)} maxLength={41} /></label> {/* 제목 */}
                    {error("title")} {/* 제목 오류 */}
                    <label>한 줄 소개<input value={draft.summary} onChange={(event) => update("summary", event.target.value)} maxLength={81} /></label> {/* 소개 */}
                    {error("summary")} {/* 소개 오류 */}
                    <label>줄거리·세계관<textarea value={draft.synopsis} onChange={(event) => update("synopsis", event.target.value)} rows={4} /></label> {/* 줄거리 */}
                    {error("synopsis")} {/* 줄거리 오류 */}
                    <fieldset className={styles.picker}> {/* 등장인물 고르기 */}
                        <legend>등장인물 고르기</legend> {/* 고르기 제목 */}
                        <span className={styles.pickerCount} data-full={full ? "true" : undefined}>{draft.cast.length}/{STORY_CAST_LIMIT}명</span> {/* 인원 표시 */}
                        <input type="search" className={styles.pickerSearch} aria-label="등장인물 검색" placeholder="이름·태그로 찾기 (초성 가능)" value={pickerQuery} onChange={(event) => setPickerQuery(event.target.value)} /> {/* 후보 검색 */}
                        {pickerQuery.trim().length > 0 && choices.every((character) => draft.cast.some((member) => member.characterId === character.id)) ? <p className={editorStyles.hint}>‘{pickerQuery}’에 맞는 캐릭터가 없습니다.</p> : null} {/* 빈 검색 결과 */}
                        <div className={styles.pickerGrid}> {/* 후보 목록 */}
                            {choices.map((character) => // 후보 순회
                            { // 순회 시작
                                const checked = draft.cast.some((member) => member.characterId === character.id); // 포함 여부
                                return ( // 후보 반환
                                    <label key={character.id} data-selected={checked ? "true" : undefined}> {/* 후보 항목 */}
                                        <input type="checkbox" checked={checked} disabled={!checked && full} onChange={() => toggleCharacter(character)} /> {/* 선택 상자 */}
                                        <Image src={character.coverImage} alt="" width={72} height={72} /> {/* 얼굴 */}
                                        <span>{character.name}{character.contentRating === "all" ? null : <small> · {contentRatingLabels[character.contentRating]}</small>}</span> {/* 이름·등급 */}
                                    </label> // 후보 항목 종료
                                ); // 후보 반환 종료
                            })} {/* 순회 종료 */}
                        </div> {/* 후보 목록 종료 */}
                    </fieldset> {/* 고르기 종료 */}
                    {draft.cast.length === 0 ? <p className={editorStyles.hint}>등장인물을 한 명만 골라도 상황극이 됩니다. 첫 번째 인물이 대표 인물이 됩니다.</p> : ( // 고른 인물 판정
                        <ol className={styles.castList} aria-label="고른 등장인물"> {/* 고른 인물 목록 */}
                            {draft.cast.map((member, index) => // 인물 순회
                            { // 순회 시작
                                const character = state.characters.find((item) => item.id === member.characterId); // 연결 캐릭터
                                const name = character?.name ?? member.displayName; // 표시 이름
                                return ( // 인물 반환
                                    <li key={member.characterId}> {/* 인물 항목 */}
                                        <div className={styles.castHead}> {/* 인물 머리 */}
                                            {character === undefined ? <span className={styles.castFace} aria-hidden="true">{member.displayName.slice(0, 1)}</span> : <Image className={styles.castFace} src={character.coverImage} alt="" width={64} height={64} />} {/* 얼굴 */}
                                            <span className={styles.castTitle}><strong>{name}</strong>{index === 0 ? <span className={styles.leadBadge}>대표 인물</span> : null}{character === undefined ? <span className={styles.missing}>삭제된 캐릭터</span> : null}</span> {/* 이름·표시 */}
                                            <span className={styles.castButtons}> {/* 인물 동작 */}
                                                <button type="button" aria-label={`${name} 앞으로`} disabled={index === 0} onClick={() => moveForward(index)}>↑</button> {/* 앞으로 */}
                                                <button type="button" aria-label={`${name} 빼기`} onClick={() => changeCast(draft.cast.filter((_, position) => position !== index))}>빼기</button> {/* 빼기 */}
                                            </span> {/* 동작 종료 */}
                                        </div> {/* 머리 종료 */}
                                        <div className={styles.castFields}> {/* 인물 입력 */}
                                            <label>이야기 속 이름<input aria-label={`${name} 이야기 속 이름`} value={member.displayName} maxLength={13} onChange={(event) => updateMember(index, { displayName: event.target.value })} /></label> {/* 이름 */}
                                            <label>역할<input aria-label={`${name} 역할`} value={member.role} maxLength={121} placeholder="이 이야기에서 맡는 역할" onChange={(event) => updateMember(index, { role: event.target.value })} /></label> {/* 역할 */}
                                            <label className={styles.wide}>첫 대사<input aria-label={`${name} 첫 대사`} value={member.firstLine} maxLength={301} placeholder="시작 장면에서 건넬 한마디(비워도 됨)" onChange={(event) => updateMember(index, { firstLine: event.target.value })} /></label> {/* 첫 대사 */}
                                        </div> {/* 입력 종료 */}
                                    </li> // 인물 항목 종료
                                ); // 인물 반환 종료
                            })} {/* 순회 종료 */}
                        </ol> // 목록 종료
                    )} {/* 고른 인물 판정 종료 */}
                    {error("cast")} {/* 등장인물 오류 */}
                    <label>시작 장면<textarea value={draft.opening} onChange={(event) => update("opening", event.target.value)} rows={4} aria-describedby="story-opening-hint" /></label> {/* 시작 장면 */}
                    <p id="story-opening-hint" className={editorStyles.hint}>첫 화면의 내레이션으로 나오고, 등장인물의 첫 대사가 뒤에 이어집니다.</p> {/* 시작 장면 안내 */}
                    {error("opening")} {/* 시작 장면 오류 */}
                    <label>내 역할<input value={draft.userRole} onChange={(event) => update("userRole", event.target.value)} maxLength={201} placeholder="예: 오늘 처음 온 전학생" /></label> {/* 내 역할 */}
                    {error("userRole")} {/* 역할 오류 */}
                    <label>태그<input value={draft.tags.join(", ")} onChange={(event) => update("tags", event.target.value.split(","))} placeholder="미스터리, 학원, 판타지" /></label> {/* 태그 */}
                    {error("tags")} {/* 태그 오류 */}
                    <fieldset className={`${editorStyles.images} ${styles.covers}`}> {/* 표지 고르기 */}
                        <legend>표지 이미지</legend> {/* 표지 제목 */}
                        {storyCoverOptions.map((path) => <label key={path} data-selected={draft.coverImage === path}><input type="radio" name="story-cover" value={path} checked={draft.coverImage === path} onChange={() => update("coverImage", path)} /><span><Image src={path} alt={`${coverNames[path] ?? "장면"} 표지`} width={240} height={150} /><small>{coverNames[path] ?? "장면"}</small></span></label>)} {/* 표지 목록 */}
                    </fieldset> {/* 표지 종료 */}
                    {error("coverImage")} {/* 표지 오류 */}
                    <label>공개 범위<select value={draft.visibility} onChange={(event) => update("visibility", event.target.value as StoryDraft["visibility"])}><option value="private">비공개</option><option value="unlisted">링크 공개</option><option value="public">전체 공개</option></select></label> {/* 공개 범위 */}
                    <label>이용 등급<select value={draft.contentRating} aria-describedby="story-rating-hint" onChange={(event) => update("contentRating", event.target.value as ContentRating)}>{ratingOptions.map((rating) => <option key={rating} value={rating} disabled={isRatingBelow(rating, required) || (rating === "mature" && !adultVerified)}>{contentRatingLabels[rating]}</option>)}</select></label> {/* 이용 등급 */}
                    <p id="story-rating-hint" className={editorStyles.hint}>{ratingNotice.length > 0 ? ratingNotice : required === "all" ? "등장인물 중 가장 높은 등급보다 낮게 정할 수 없습니다." : `등장인물 기준 최소 ${contentRatingLabels[required]}입니다.`}</p> {/* 등급 안내 */}
                    {error("contentRating")} {/* 등급 오류 */}
                    <div className={editorStyles.actions}> {/* 저장 동작 */}
                        <button type="button" className={editorStyles.secondary} onClick={() => save("draft")}>임시 저장</button> {/* 임시 저장 */}
                        <button type="button" className={editorStyles.primary} onClick={() => save("published")}>공개 저장</button> {/* 공개 저장 */}
                    </div> {/* 동작 종료 */}
                    <p role="status" aria-label="저장 상태" className={editorStyles.notice}>{notice}</p> {/* 저장 안내 */}
                    {saved && !dirty ? <Link href={`/stories/${encodeURIComponent(savedId)}` as Route} className={styles.viewLink}>스토리 보기</Link> : null} {/* 상세 링크 */}
                </form> {/* 폼 종료 */}
                <StoryPreview draft={draft} characters={state.characters} /> {/* 미리보기 */}
            </div> {/* 작업 종료 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료

function StoryPreview({ draft, characters }: { draft: StoryDraft; characters: Character[] }) // 스토리 미리보기
{ // 함수 시작
    const title = draft.title.trim() || "제목 없는 스토리"; // 표시 제목
    const summary = draft.summary.trim() || "한 줄 소개가 여기에 표시됩니다."; // 표시 소개
    const opening = draft.opening.trim() || "시작 장면을 입력하면 첫 화면이 완성됩니다."; // 표시 시작 장면
    const lines = draft.cast.filter((member) => member.firstLine.trim().length > 0); // 첫 대사
    return ( // 미리보기 반환
        <aside className={`${editorStyles.preview} ${styles.preview}`} data-testid="story-preview" aria-label="스토리 미리보기"> {/* 미리보기 */}
            <span className={editorStyles.previewLabel}>LIVE PREVIEW</span> {/* 표시 */}
            <Image src={draft.coverImage} alt={`${title} 표지`} width={640} height={400} priority /> {/* 표지 */}
            <div className={editorStyles.previewBody}> {/* 본문 */}
                <span className={editorStyles.ratingTag} data-rating={draft.contentRating}>{contentRatingLabels[draft.contentRating]}</span> {/* 등급 */}
                <h2>{title}</h2> {/* 제목 */}
                <p>{summary}</p> {/* 소개 */}
                <div className={styles.previewCast}> {/* 등장인물 */}
                    {draft.cast.length === 0 ? <span className={styles.previewEmpty}>아직 등장인물이 없습니다.</span> : draft.cast.map((member) => // 인물 순회
                    { // 순회 시작
                        const character = characters.find((item) => item.id === member.characterId); // 연결 캐릭터
                        return <span key={member.characterId}>{character === undefined ? null : <Image src={character.coverImage} alt="" width={48} height={48} />}{member.displayName || "이름 없음"}</span>; // 인물 반환
                    })} {/* 순회 종료 */}
                </div> {/* 등장인물 종료 */}
                <div className={styles.previewScene}> {/* 시작 장면 */}
                    <p className={styles.previewNarration}>{opening}</p> {/* 내레이션 */}
                    {lines.length === 0 ? null : <ul>{lines.map((member) => <li key={member.characterId}><strong>{member.displayName}</strong><span>{member.firstLine}</span></li>)}</ul>} {/* 첫 대사 */}
                </div> {/* 시작 장면 종료 */}
                {draft.userRole.trim().length === 0 ? null : <p className={styles.previewRole}>내 역할 · {draft.userRole.trim()}</p>} {/* 내 역할 */}
            </div> {/* 본문 종료 */}
        </aside> // 미리보기 종료
    ); // 반환 종료
} // 함수 종료
