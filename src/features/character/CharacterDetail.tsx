"use client"; // 클라이언트 컴포넌트

import Image from "next/image"; // 최적화 이미지
import Link from "next/link"; // 내부 경로 링크
import { useAppStore } from "@/features/core/AppProvider"; // 앱 저장소
import type { AppState, Conversation } from "@/features/core/types"; // 상태 타입

export interface ConversationStartResult // 대화 시작 결과
{ // 구조 시작
    state: AppState; // 결과 상태
    conversation: Conversation; // 대상 대화
    href: string; // 이동 경로
} // 구조 종료

export function ensureConversationForCharacter(state: AppState, characterId: string, now = new Date().toISOString()): ConversationStartResult // 대화 준비
{ // 함수 시작
    const existing = state.conversations.find((conversation) => conversation.characterId === characterId); // 기존 대화 조회
    if (existing !== undefined) // 기존 대화 판정
    { // 조건 시작
        return { state, conversation: existing, href: `/chat/${characterId}` }; // 기존 대화 반환
    } // 조건 종료
    const character = state.characters.find((item) => item.id === characterId); // 캐릭터 조회
    if (character === undefined) // 캐릭터 부재 판정
    { // 조건 시작
        throw new Error("존재하지 않는 캐릭터입니다."); // 경로 오류
    } // 조건 종료
    const conversation: Conversation = // 새 대화
    { // 대화 시작
        id: `conversation-${characterId}`, // 대화 식별자
        characterId, // 캐릭터 식별자
        userId: state.profile.id, // 사용자 식별자
        title: character.name, // 대화 제목
        relationshipLevel: 0, // 초기 관계
        relationshipStage: "첫 만남", // 초기 단계
        emotion: "호기심", // 초기 감정
        currentScene: "/images/scenes/fallback-scene.svg", // 초기 장면
        lastMessage: character.greeting, // 첫 메시지
        archivedAt: null, // 보관 시각
        createdAt: now, // 생성 시각
        updatedAt: now, // 수정 시각
    }; // 대화 종료
    return { state: { ...state, conversations: [...state.conversations, conversation], selectedConversationId: conversation.id }, conversation, href: `/chat/${characterId}` }; // 새 대화 반환
} // 함수 종료

export function CharacterDetail({ characterId }: { characterId: string }) // 캐릭터 상세
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const character = state.characters.find((item) => item.id === characterId); // 캐릭터 조회
    if (character === undefined) // 캐릭터 부재 판정
    { // 조건 시작
        return <main><h1>캐릭터를 찾을 수 없습니다.</h1><Link href="/">탐색으로 돌아가기</Link></main>; // 오류 화면
    } // 조건 종료
    const start = () => // 대화 시작 처리
    { // 함수 시작
        const result = ensureConversationForCharacter(state, character.id); // 대화 준비
        dispatch({ type: "upsert-conversation", conversation: result.conversation }); // 대화 저장
        dispatch({ type: "select-conversation", conversationId: result.conversation.id }); // 대화 선택
    }; // 함수 종료
    const bookmarked = state.bookmarkedCharacterIds.includes(character.id); // 보관 상태
    const toggleBookmark = () => dispatch({ type: "toggle-bookmark", characterId: character.id }); // 보관 전환
    return ( // 상세 반환
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 28px 96px" }}> {/* 상세 본문 */}
            <Image src={character.coverImage} alt={character.name} width={480} height={640} priority style={{ width: "min(100%, 480px)", height: "auto", borderRadius: 24, objectFit: "cover" }} /> {/* 대표 이미지 */}
            <p>{character.creatorName} 제작</p> {/* 제작자 */}
            <h1>{character.name}</h1> {/* 캐릭터 이름 */}
            <p>{character.summary}</p> {/* 한 줄 소개 */}
            <p>{character.description}</p> {/* 상세 설명 */}
            <h2>성격</h2> {/* 성격 제목 */}
            <p>{character.personality}</p> {/* 성격 설명 */}
            <h2>세계관</h2> {/* 세계관 제목 */}
            <p>{character.worldSetting}</p> {/* 세계관 설명 */}
            <h2>첫 대화</h2> {/* 첫 대화 제목 */}
            <blockquote>{character.greeting}</blockquote> {/* 첫 인사 */}
            <p>{character.tags.map((tag) => <span key={tag}>#{tag} </span>)}</p> {/* 태그 목록 */}
            <a href={`/chat/${character.id}`} onClick={start}>대화 시작</a> {/* 대화 링크 */}
            <button type="button" aria-pressed={bookmarked} onClick={toggleBookmark}>{bookmarked ? "보관함에서 제거" : "보관함에 추가"}</button> {/* 보관 버튼 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료
