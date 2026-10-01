"use client"; // 클라이언트 컴포넌트

import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import { useRouter } from "@/desktop/next-compat/navigation"; // 경로 이동 도구
import { useRef, useState, type CSSProperties } from "react"; // 리액트 상태 도구
import { StatusScreen } from "@chatbot/components/feedback/StatusScreen"; // 공통 상태 화면
import { canViewMatureContent, isMatureCharacter } from "@chatbot/features/adult/adult-access"; // 19세 콘텐츠 판정
import { AdultContentGate } from "@chatbot/features/adult/AdultContentGate"; // 19세 잠금 화면
import { CharacterActionBar } from "@chatbot/features/character/CharacterActionBar"; // 하단 대화 동작
import { CharacterDiscoverySections } from "@chatbot/features/character/CharacterDiscoverySections"; // 탐색 보조 섹션
import { CharacterHero } from "@chatbot/features/character/CharacterHero"; // 캐릭터 히어로
import { CharacterReportDialog } from "@chatbot/features/character/CharacterReportDialog"; // 캐릭터 신고 창
import { CharacterStoryInfo } from "@chatbot/features/character/CharacterStoryInfo"; // 스토리 정보
import { ConversationSetup } from "@chatbot/features/character/ConversationSetup"; // 대화 시작 설정
import { ProloguePreview } from "@chatbot/features/character/ProloguePreview"; // 프롤로그 미리보기
import { createCharacterReport, createConversationFromPreset, createConversationHref, getCharacterDetailProfile, getLatestActiveConversation, getRelatedCharacters } from "@chatbot/features/character/character-detail-model"; // 상세 모델 함수
import styles from "@chatbot/features/character/CharacterDetail.module.css"; // 상세 화면 스타일
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 저장소
import type { ReportReason } from "@chatbot/features/core/types"; // 신고 사유 타입
import { getGenreKey } from "@chatbot/lib/theme/genre-theme"; // 장르 색 조회

export function CharacterDetail({ characterId }: { characterId: string }) // 캐릭터 상세
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const router = useRouter(); // 경로 이동기
    const character = state.characters.find((item) => item.id === characterId); // 캐릭터 조회
    const initialProfile = character === undefined ? null : getCharacterDetailProfile(character); // 초기 상세 프로필
    const [selectedProfileId, setSelectedProfileId] = useState(state.profile.id); // 선택 프로필 상태
    const [selectedPresetId, setSelectedPresetId] = useState(initialProfile?.startPresets[0]?.id ?? ""); // 선택 프리셋 상태
    const [creating, setCreating] = useState(false); // 대화 생성 상태
    const [shareStatus, setShareStatus] = useState(""); // 공유 상태
    const [reportOpen, setReportOpen] = useState(false); // 신고 창 상태
    const [reportReason, setReportReason] = useState<ReportReason>("incorrect-rating"); // 신고 사유 상태
    const creatingRef = useRef(false); // 중복 생성 잠금
    const reportTriggerRef = useRef<HTMLButtonElement | null>(null); // 신고 버튼 참조
    if (character === undefined || initialProfile === null) // 캐릭터 부재 판정
    { // 조건 시작
        return ( // 부재 화면 반환
            <StatusScreen tone="not-found" label="CHARACTER NOT FOUND" title="캐릭터를 찾을 수 없습니다" description="주소가 잘못되었거나 이 브라우저에서 삭제된 캐릭터입니다."> {/* 부재 안내 */}
                <Link href="/">메인으로 돌아가기</Link> {/* 메인 링크 */}
                <Link href={"/library" as Route}>보관함 열기</Link> {/* 보관함 링크 */}
            </StatusScreen> // 부재 안내 종료
        ); // 반환 종료
    } // 조건 종료
    const showMature = canViewMatureContent(state, new Date()); // 19세 콘텐츠 표시 여부
    if (isMatureCharacter(character) && !showMature) // 잠긴 캐릭터 판정
    { // 조건 시작
        return <AdultContentGate subject={{ kind: "character", name: character.name, coverImage: character.coverImage }} target="detail" />; // 잠금 화면 반환
    } // 조건 종료
    const visibleCharacters = showMature ? state.characters : state.characters.filter((item) => !isMatureCharacter(item)); // 등급 허용 캐릭터
    const profile = initialProfile; // 상세 프로필 확정
    const selectedPreset = profile.startPresets.find((preset) => preset.id === selectedPresetId) ?? profile.startPresets[0]; // 선택 프리셋 조회
    const selectedPrologue = profile.prologues.find((prologue) => prologue.id === selectedPreset?.prologueId) ?? profile.prologues[0]; // 선택 프롤로그 조회
    const latestConversation = getLatestActiveConversation(state.conversations, character.id); // 최근 대화 조회
    const relatedCharacters = getRelatedCharacters(character, visibleCharacters, 8); // 연관 캐릭터 조회
    const continueConversation = () => // 최근 대화 이어가기
    { // 함수 시작
        if (latestConversation === null) // 최근 대화 부재 확인
        { // 조건 시작
            return; // 이동 중단
        } // 조건 종료
        dispatch({ type: "select-conversation", conversationId: latestConversation.id }); // 최근 대화 선택
        router.push(createConversationHref(character.id, latestConversation.id, latestConversation.currentVersionId) as Route); // 대화 화면 이동
    }; // 함수 종료
    const startConversation = () => // 새 대화 시작
    { // 함수 시작
        if (creatingRef.current || selectedPreset === undefined) // 중복 실행 확인
        { // 조건 시작
            return; // 생성 중단
        } // 조건 종료
        creatingRef.current = true; // 생성 잠금 설정
        setCreating(true); // 생성 상태 설정
        const result = createConversationFromPreset(state, character.id, selectedPreset.id); // 새 대화 생성
        dispatch({ type: "replace-state", state: result.state }); // 생성 상태 저장
        router.push(result.href as Route); // 대화 화면 이동
    }; // 함수 종료
    const shareCharacter = async () => // 캐릭터 공유
    { // 함수 시작
        try // 복사 시도
        { // 시도 시작
            if (navigator.clipboard?.writeText === undefined) // 클립보드 부재 확인
            { // 조건 시작
                throw new Error("clipboard-unavailable"); // 클립보드 오류
            } // 조건 종료
            await navigator.clipboard.writeText(window.location.href); // 현재 링크 복사
            setShareStatus("공유 링크를 복사했습니다."); // 성공 상태 설정
        } // 시도 종료
        catch // 복사 실패 처리
        { // 실패 시작
            setShareStatus("공유 링크를 복사하지 못했습니다."); // 실패 상태 설정
        } // 실패 종료
    }; // 함수 종료
    const openReport = (trigger: HTMLButtonElement) => // 신고 창 열기
    { // 함수 시작
        reportTriggerRef.current = trigger; // 원래 버튼 저장
        setReportOpen(true); // 신고 창 표시
    }; // 함수 종료
    const closeReport = () => // 신고 창 닫기
    { // 함수 시작
        setReportOpen(false); // 신고 창 숨김
        queueMicrotask(() => reportTriggerRef.current?.focus()); // 원래 버튼 초점
    }; // 함수 종료
    const submitReport = () => // 신고 저장
    { // 함수 시작
        dispatch({ type: "add-character-report", report: createCharacterReport(character.id, reportReason) }); // 로컬 신고 추가
        closeReport(); // 신고 창 닫기
    }; // 함수 종료
    const bookmarked = state.bookmarkedCharacterIds.includes(character.id); // 보관 상태
    const liked = state.likedCharacterIds.includes(character.id); // 좋아요 상태
    const followed = state.followedCreatorIds.includes(character.creatorId); // 팔로우 상태
    const pageStyle = { "--character-accent": profile.accentColor, "--character-image": `url("${character.coverImage}")` } as CSSProperties; // 캐릭터 테마
    return ( // 상세 반환
        <main className={styles.page} style={pageStyle} data-genre={getGenreKey(character.tags)} data-surface="light"> {/* 상세 본문 */}
            <div className={styles.background} aria-hidden="true" /> {/* 흐림 배경 */}
            <div className={styles.content}> {/* 상세 내용 */}
                <CharacterHero character={character} profile={profile} bookmarked={bookmarked} liked={liked} followed={followed} latestConversation={latestConversation} creating={creating} shareStatus={shareStatus} onBookmark={() => dispatch({ type: "toggle-bookmark", characterId: character.id })} onLike={() => dispatch({ type: "toggle-character-like", characterId: character.id })} onFollow={() => dispatch({ type: "toggle-creator-follow", creatorId: character.creatorId })} onShare={shareCharacter} onMore={openReport} onContinue={continueConversation} onStart={startConversation} /> {/* 히어로 */}
                <CharacterStoryInfo character={character} profile={profile} /> {/* 스토리 정보 */}
                <ConversationSetup profile={state.profile} presets={profile.startPresets} selectedProfileId={selectedProfileId} selectedPresetId={selectedPreset?.id ?? ""} onProfileChange={setSelectedProfileId} onPresetChange={setSelectedPresetId} /> {/* 시작 설정 */}
                {selectedPrologue === undefined || selectedPreset === undefined ? null : <ProloguePreview key={selectedPrologue.id} prologue={selectedPrologue} presetName={selectedPreset.name} fallbackImage={character.coverImage} characterName={character.name} />} {/* 프롤로그 미리보기 */}
                <CharacterDiscoverySections profile={profile} userProfile={state.profile} characters={visibleCharacters} relatedCharacters={relatedCharacters} /> {/* 업데이트와 탐색 */}
                <CharacterActionBar latestConversation={latestConversation} creating={creating} onContinue={continueConversation} onStart={startConversation} /> {/* 대화 동작 */}
            </div> {/* 상세 내용 종료 */}
            {reportOpen ? <CharacterReportDialog characterName={character.name} reason={reportReason} onReasonChange={setReportReason} onCancel={closeReport} onSubmit={submitReport} /> : null} {/* 신고 창 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료
