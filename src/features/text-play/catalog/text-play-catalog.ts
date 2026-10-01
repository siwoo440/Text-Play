import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import { mockCharacters } from "@/mocks/fixtures"; // 기본 캐릭터 기준값
import { rankingCharacterConcepts } from "@/mocks/ranking-character-concepts"; // 랭킹 캐릭터 콘셉트

export type TextPlayGenreKey = "healing" | "fantasy" | "modern" | "romance" | "mystery" | "sf" | "other"; // 장르 색 종류

export const TEXT_PLAY_GENRE_LABELS: Readonly<Record<Exclude<TextPlayGenreKey, "other">, string>> = // 장르 이름
{ // 이름 시작
    healing: "힐링", // 힐링 장르
    fantasy: "판타지", // 판타지 장르
    modern: "현대", // 현대 장르
    romance: "로맨스", // 로맨스 장르
    mystery: "미스터리", // 미스터리 장르
    sf: "SF", // SF 장르
}; // 이름 종료

export const TEXT_PLAY_CATEGORIES = ["전체", ...Object.values(TEXT_PLAY_GENRE_LABELS)]; // 장르 필터 목록

export interface TextPlayWork // 작품 계약
{ // 구조 시작
    id: string; // 작품 식별자
    title: string; // 작품 제목
    leadName: string; // 주요 등장인물
    summary: string; // 한 줄 소개
    description: string; // 상세 소개
    tags: string[]; // 검색 태그
    genre: TextPlayGenreKey; // 대표 장르
    genreLabel: string; // 대표 장르 이름
    coverImage: string; // 대표 이미지
    playCount: number; // 플레이 수
    playable: boolean; // 플레이 가능 여부
} // 구조 종료

const genreKeyByLabel = new Map(Object.entries(TEXT_PLAY_GENRE_LABELS).map(([key, label]) => [label, key as TextPlayGenreKey])); // 이름별 장르

export function getTextPlayGenreKeyByLabel(label: string): TextPlayGenreKey | "all" // 이름으로 장르 조회
{ // 함수 시작
    return label === "전체" ? "all" : genreKeyByLabel.get(label) ?? "other"; // 장르 반환
} // 함수 종료

export function getTextPlayGenreKey(tags: readonly string[]): TextPlayGenreKey // 태그로 대표 장르 조회
{ // 함수 시작
    return tags.map((tag) => genreKeyByLabel.get(tag)).find((key) => key !== undefined) ?? "other"; // 첫 장르 반환
} // 함수 종료

function getGenreLabel(tags: readonly string[]): string // 대표 장르 이름 조회
{ // 함수 시작
    const key = getTextPlayGenreKey(tags); // 대표 장르 조회
    return key === "other" ? tags[0] ?? "이야기" : TEXT_PLAY_GENRE_LABELS[key]; // 장르 이름 반환
} // 함수 종료

export function withKoreanParticle(word: string, withoutFinal: string, withFinal: string): string // 받침별 조사 결합
{ // 함수 시작
    const code = word.charCodeAt(word.length - 1) - 0xac00; // 마지막 글자 위치
    const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0; // 받침 여부
    return `${word}${hasFinal ? withFinal : withoutFinal}`; // 조사 결합 반환
} // 함수 종료

function createWork(work: Omit<TextPlayWork, "genre" | "genreLabel">): TextPlayWork // 작품 생성기
{ // 함수 시작
    return { ...work, genre: getTextPlayGenreKey(work.tags), genreLabel: getGenreLabel(work.tags) }; // 장르 포함 반환
} // 함수 종료

const demoWork = createWork( // 실제 샘플 작품
{ // 작품 시작
    id: DEMO_TEXT_PLAY_PACKAGE.id, // 작품 식별자
    title: DEMO_TEXT_PLAY_PACKAGE.title, // 작품 제목
    leadName: "리라", // 주요 등장인물
    summary: DEMO_TEXT_PLAY_PACKAGE.description, // 한 줄 소개
    description: "달빛 등불을 들고 사라진 기록을 따라가 숲 아래에서 들려오는 목소리의 정체를 밝히는 판타지 미스터리입니다. 선택지와 직접 입력으로 이야기를 이어 갑니다.", // 상세 소개
    tags: ["판타지", "미스터리", "기록"], // 검색 태그
    coverImage: "/images/text-play/moonlit-forest-cover.svg", // 대표 이미지
    playCount: 212400, // 플레이 수
    playable: true, // 플레이 가능
}); // 작품 종료

const baseWorkTitles: Readonly<Record<string, { title: string; leadName: string }>> = // 기본 캐릭터 작품 제목
{ // 제목 시작
    rian: { title: "새벽 도서관의 기억", leadName: "리안" }, // 리안 작품
    harin: { title: "퇴근길 카페의 약속", leadName: "하린" }, // 하린 작품
    sera: { title: "비 오는 교실의 방과 후", leadName: "세라" }, // 세라 작품
    kyle: { title: "잃어버린 별의 좌표", leadName: "카일" }, // 카일 작품
    noah: { title: "달빛 기록관의 편지", leadName: "노아" }, // 노아 작품
    miel: { title: "숲의 치료소", leadName: "미엘" }, // 미엘 작품
    yuna: { title: "옥상 밴드의 미완성 노래", leadName: "유나" }, // 유나 작품
}; // 제목 종료

const baseWorks = mockCharacters.filter((character) => baseWorkTitles[character.id] !== undefined).map((character, index) => createWork( // 기본 캐릭터 작품 변환
{ // 작품 시작
    id: `work-${character.id}`, // 작품 식별자
    title: baseWorkTitles[character.id].title, // 작품 제목
    leadName: baseWorkTitles[character.id].leadName, // 주요 등장인물
    summary: character.summary, // 한 줄 소개
    description: `${character.description} ${character.worldSetting}`, // 상세 소개
    tags: [...character.tags], // 검색 태그
    coverImage: character.coverImage, // 대표 이미지
    playCount: 184000 - index * 9600, // 플레이 수
    playable: false, // 준비 중
})); // 변환 종료

const conceptWorks = rankingCharacterConcepts.slice(0, 43).map((concept, index) => createWork( // 랭킹 콘셉트 작품 변환
{ // 작품 시작
    id: `work-rank-${String(index + 8).padStart(3, "0")}`, // 작품 식별자
    title: concept.setting, // 작품 제목
    leadName: concept.name, // 주요 등장인물
    summary: `${concept.role} ${withKoreanParticle(concept.name, "와", "과")} ${concept.signature}의 비밀을 쫓는 이야기`, // 한 줄 소개
    description: `${concept.setting}에서 ${concept.role} ${withKoreanParticle(concept.name, "를", "을")} 만나 ${concept.signature}에 얽힌 사건을 선택과 직접 입력으로 풀어 갑니다.`, // 상세 소개
    tags: [...concept.tags], // 검색 태그
    coverImage: `/images/characters/rank-${String(index + 8).padStart(3, "0")}.webp`, // 대표 이미지
    playCount: 112000 - index * 1730, // 플레이 수
    playable: false, // 준비 중
})); // 변환 종료

export const TEXT_PLAY_WORKS: TextPlayWork[] = [demoWork, ...baseWorks, ...conceptWorks].sort((left, right) => right.playCount - left.playCount); // 전체 작품 목록

export function filterTextPlayWorks(works: readonly TextPlayWork[], query: string, category: string): TextPlayWork[] // 작품 필터
{ // 함수 시작
    const normalized = query.trim().toLowerCase(); // 검색어 정규화
    return works.filter((work) => // 작품 순회
    { // 필터 시작
        const categoryMatch = category === "전체" || work.tags.includes(category); // 장르 일치
        const searchTarget = `${work.title} ${work.leadName} ${work.summary} ${work.tags.join(" ")}`.toLowerCase(); // 검색 대상
        return categoryMatch && (normalized.length === 0 || searchTarget.includes(normalized)); // 복합 결과
    }); // 필터 종료
} // 함수 종료
