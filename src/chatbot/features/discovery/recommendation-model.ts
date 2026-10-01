import { getDiscoverableCharacters, isMatureCharacter } from "@chatbot/features/adult/adult-access"; // 19세 콘텐츠 판정
import type { AppState, Character } from "@chatbot/features/core/types"; // 도메인 타입

export interface RecommendationResult // 유저 추천 결과
{ // 구조 시작
    characters: Character[]; // 추천 캐릭터
    basisTags: string[]; // 추천 기준 태그(취향 순)
    personalized: boolean; // 취향 기반 여부(아니면 인기순)
} // 구조 종료

export interface InterestEntry // 관심 목록 항목
{ // 구조 시작
    character: Character; // 캐릭터
    liked: boolean; // 좋아요 여부
    bookmarked: boolean; // 보관 여부
} // 구조 종료

const signalWeights = { liked: 3, bookmarked: 2, conversation: 2 }; // 취향 신호 가중치

type RecommendationState = Pick<AppState, "characters" | "likedCharacterIds" | "bookmarkedCharacterIds" | "conversations">; // 계산에 쓰는 상태

function getSignals(state: RecommendationState): Map<string, number> // 캐릭터별 취향 가중치
{ // 함수 시작
    const signals = new Map<string, number>(); // 가중치 목록
    const add = (characterId: string, weight: number) => signals.set(characterId, (signals.get(characterId) ?? 0) + weight); // 가중치 더하기
    state.likedCharacterIds.forEach((id) => add(id, signalWeights.liked)); // 좋아요
    state.bookmarkedCharacterIds.forEach((id) => add(id, signalWeights.bookmarked)); // 보관
    for (const conversation of state.conversations) // 대화 순회
    { // 순회 시작
        if (conversation.archivedAt !== null) // 보관 대화 판정
        { // 조건 시작
            continue; // 보관 대화 제외
        } // 조건 종료
        const ids = conversation.mode === "story" ? conversation.storyCast.map((member) => member.characterId) : [conversation.characterId]; // 대화 인물
        ids.forEach((id) => add(id, signalWeights.conversation)); // 대화 반영
    } // 순회 종료
    return signals; // 가중치 반환
} // 함수 종료

export function getRecommendedCharacters(state: RecommendationState, showMature: boolean, limit = 8): RecommendationResult // 유저 추천 캐릭터
{ // 함수 시작
    const signals = getSignals(state); // 취향 신호
    const tagWeights = new Map<string, number>(); // 태그 취향
    for (const [characterId, weight] of signals) // 신호 순회
    { // 순회 시작
        const character = state.characters.find((item) => item.id === characterId); // 캐릭터 조회
        character?.tags.forEach((tag) => tagWeights.set(tag, (tagWeights.get(tag) ?? 0) + weight)); // 태그 가중치 더하기
    } // 순회 종료
    const candidates = getDiscoverableCharacters(state.characters, showMature).filter((character) => !signals.has(character.id)); // 아직 모르는 공개 캐릭터
    const basisTags = [...tagWeights.entries()].sort((left, right) => right[1] - left[1]).map(([tag]) => tag); // 취향 태그 순서
    if (tagWeights.size === 0) // 취향 정보 없음 판정
    { // 조건 시작
        return { characters: candidates.slice(0, limit), basisTags: [], personalized: false }; // 인기순 추천
    } // 조건 종료
    const score = (character: Character) => character.tags.reduce((sum, tag) => sum + (tagWeights.get(tag) ?? 0), 0); // 취향 점수
    const ranked = candidates.map((character, index) => ({ character, index, score: score(character) })).sort((left, right) => right.score - left.score || left.index - right.index); // 점수 높은 순(같으면 인기순)
    return { characters: ranked.slice(0, limit).map((entry) => entry.character), basisTags, personalized: true }; // 취향 추천
} // 함수 종료

export function getInterestCharacters(state: Pick<AppState, "characters" | "likedCharacterIds" | "bookmarkedCharacterIds">, showMature: boolean): InterestEntry[] // 관심 목록(좋아요·보관)
{ // 함수 시작
    const liked = new Set(state.likedCharacterIds); // 좋아요 집합
    const bookmarked = new Set(state.bookmarkedCharacterIds); // 보관 집합
    const ids = [...new Set([...state.likedCharacterIds, ...state.bookmarkedCharacterIds])]; // 합친 순서(중복 제거)
    return ids.flatMap((id) => // 항목 변환
    { // 변환 시작
        const character = state.characters.find((item) => item.id === id); // 캐릭터 조회
        if (character === undefined || (!showMature && isMatureCharacter(character))) // 사라짐·19세 숨김 판정
        { // 조건 시작
            return []; // 항목 제외
        } // 조건 종료
        return [{ character, liked: liked.has(id), bookmarked: bookmarked.has(id) }]; // 항목 반환
    }); // 변환 종료
} // 함수 종료
