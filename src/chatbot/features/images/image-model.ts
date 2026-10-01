import type { ContentRating, GeneratedImage, ImageAspect, ImageExposure, ImageStyle } from "@chatbot/features/core/types"; // 도메인 타입
import { getRegionPolicy, type ServiceRegion } from "@chatbot/lib/config/service-region"; // 지역 정책

export const IMAGE_PROMPT_LIMIT = 400; // 장면 설명 최대 글자 수
export const GENERATED_IMAGE_SOURCE_LIMIT = 60_000; // 생성 이미지 데이터 최대 길이
const sourcePrefix = "data:image/svg+xml;charset=utf-8,"; // Mock 생성 이미지 형식
const encodedPattern = /^data:image\/svg\+xml;charset=utf-8,[A-Za-z0-9%\-_.!~*'()]+$/; // 인코딩된 데이터만 허용

export const imageStyleLabels: Record<ImageStyle, string> = { anime: "애니메이션", illustration: "일러스트", watercolor: "수채화", cinematic: "시네마틱" }; // 그림체 이름
export const imageAspectLabels: Record<ImageAspect, string> = { portrait: "세로 3:4", square: "정사각 1:1", landscape: "가로 16:10" }; // 비율 이름
const aspectSizes: Record<ImageAspect, [number, number]> = { portrait: [600, 800], square: [700, 700], landscape: [800, 500] }; // 비율별 크기

export function getImageSize(aspect: ImageAspect): { width: number; height: number } // 비율별 픽셀 크기
{ // 함수 시작
    const [width, height] = aspectSizes[aspect]; // 크기 조회
    return { width, height }; // 크기 반환
} // 함수 종료
const stylePalettes: Record<ImageStyle, string[][]> = // 그림체별 색 묶음
{ // 색 시작
    anime: [["#fbcfe8", "#c4b5fd", "#7c3aed"], ["#bae6fd", "#f9a8d4", "#db2777"], ["#fde68a", "#fda4af", "#e11d48"]], // 애니메이션
    illustration: [["#fde68a", "#fca5a5", "#b45309"], ["#a5b4fc", "#99f6e4", "#4338ca"], ["#fed7aa", "#c4b5fd", "#9a3412"]], // 일러스트
    watercolor: [["#dcfce7", "#bae6fd", "#15803d"], ["#fce7f3", "#e0e7ff", "#be185d"], ["#fef9c3", "#d1fae5", "#0f766e"]], // 수채화
    cinematic: [["#0f172a", "#334155", "#f59e0b"], ["#1e1b4b", "#4c1d95", "#f472b6"], ["#111827", "#0e7490", "#fbbf24"]], // 시네마틱
}; // 색 종료
const ratingOrder: Record<ContentRating, number> = { all: 0, teen: 1, mature: 2 }; // 등급 순서

const realPersonPattern = /연예인|유명인|셀럽|정치인|대통령|실존|실제\s*(인물|사람)|딥\s*페이크|deepfake|(얼굴|사진)\s*합성|닮은꼴/i; // 실존 인물 표현
const minorPattern = /미성년|초등학생|중학생|고등학생|여고생|남고생|여중생|남중생|초딩|중딩|고딩|아동|어린이|유아|아기|로리|쇼타|교복|(?<![0-9])(1[0-8]|[1-9])\s*(살|세)|(열|열한|열두|열세|열네|열다섯|열여섯|열일곱|열여덟|한|두|세|네|다섯|여섯|일곱|여덟|아홉)\s*살/; // 미성년자 표현

export interface ImageRequest // 생성 요청
{ // 구조 시작
    prompt: string; // 장면 설명
    style: ImageStyle; // 그림체
    aspect: ImageAspect; // 비율
    referenceCharacterId: string | null; // 참고 캐릭터
    contentRating: ContentRating; // 이용 등급
} // 구조 종료

export type ImageCheckResult = { ok: true } | { ok: false; category: "invalid" | "minor" | "real-person"; message: string }; // 요청 검사 결과

function hashText(text: string): number // 문자열 해시
{ // 함수 시작
    let hash = 2166136261; // 시작 값
    for (const character of text) // 글자 순회
    { // 순회 시작
        hash ^= character.codePointAt(0) ?? 0; // 글자 섞기
        hash = Math.imul(hash, 16777619) >>> 0; // 곱셈 섞기
    } // 순회 종료
    return hash; // 해시 반환
} // 함수 종료

function decorations(prompt: string, width: number, height: number, accent: string, key: number): string // 설명 낱말에 맞는 장식
{ // 함수 시작
    const parts: string[] = []; // 장식 목록
    if (/비|rain|빗/.test(prompt)) // 비 장면
    { // 조건 시작
        for (let index = 0; index < 18; index += 1) // 빗줄기
        { // 순회 시작
            const x = ((key >>> (index % 16)) + index * 47) % width; // 가로 위치
            const y = (index * 53) % height; // 세로 위치
            parts.push(`<line x1="${x}" y1="${y}" x2="${x - 14}" y2="${y + 46}" stroke="#ffffff" stroke-opacity=".55" stroke-width="2"/>`); // 빗줄기 추가
        } // 순회 종료
    } // 조건 종료
    if (/달|밤|night|moon/.test(prompt)) // 밤 장면
    { // 조건 시작
        parts.push(`<circle cx="${width * 0.78}" cy="${height * 0.2}" r="${Math.min(width, height) * 0.1}" fill="#fef9c3" fill-opacity=".9"/>`); // 달
    } // 조건 종료
    if (/바다|파도|해변|sea|wave/.test(prompt)) // 바다 장면
    { // 조건 시작
        parts.push(`<path d="M0 ${height * 0.78} Q ${width * 0.25} ${height * 0.72} ${width * 0.5} ${height * 0.78} T ${width} ${height * 0.78} V ${height} H 0 Z" fill="#38bdf8" fill-opacity=".55"/>`); // 파도
    } // 조건 종료
    if (/숲|나무|정원|forest|tree/.test(prompt)) // 숲 장면
    { // 조건 시작
        for (let index = 0; index < 5; index += 1) // 나무
        { // 순회 시작
            const x = (index + 0.5) * (width / 5); // 나무 위치
            parts.push(`<path d="M${x} ${height * 0.55} L${x - 40} ${height * 0.85} H${x + 40} Z" fill="#166534" fill-opacity=".6"/>`); // 나무 추가
        } // 순회 종료
    } // 조건 종료
    if (/별|우주|은하|star|space/.test(prompt)) // 별 장면
    { // 조건 시작
        for (let index = 0; index < 24; index += 1) // 별
        { // 순회 시작
            parts.push(`<circle cx="${(key % 97 + index * 61) % width}" cy="${(index * 37) % (height * 0.6)}" r="${1 + (index % 3)}" fill="#ffffff" fill-opacity=".85"/>`); // 별 추가
        } // 순회 종료
    } // 조건 종료
    parts.push(`<ellipse cx="${width / 2}" cy="${height * 0.5}" rx="${width * 0.09}" ry="${width * 0.1}" fill="${accent}" fill-opacity=".75"/>`); // 인물 머리
    parts.push(`<path d="M${width * 0.32} ${height} Q ${width / 2} ${height * 0.52} ${width * 0.68} ${height} Z" fill="${accent}" fill-opacity=".75"/>`); // 인물 몸
    return parts.join(""); // 장식 반환
} // 함수 종료

export function createMockImageSource(input: Pick<ImageRequest, "prompt" | "style" | "aspect">): string // Mock 이미지 만들기(같은 입력이면 같은 그림)
{ // 함수 시작
    const [width, height] = aspectSizes[input.aspect]; // 크기
    const key = hashText(`${input.style}|${input.aspect}|${input.prompt.trim()}`); // 결정 키
    const palettes = stylePalettes[input.style]; // 그림체 색
    const [top, bottom, accent] = palettes[key % palettes.length]; // 색 선택
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/>${decorations(input.prompt, width, height, accent, key)}<text x="${width - 16}" y="${height - 16}" text-anchor="end" font-family="sans-serif" font-size="18" fill="#ffffff" fill-opacity=".8">MOCK</text></svg>`; // SVG 본문
    return `${sourcePrefix}${encodeURIComponent(svg)}`; // 데이터 주소 반환
} // 함수 종료

export function isGeneratedImageSource(source: string): boolean // 생성 이미지 형식인지
{ // 함수 시작
    if (source.length > GENERATED_IMAGE_SOURCE_LIMIT || !encodedPattern.test(source)) // 형식·크기 판정
    { // 조건 시작
        return false; // 거부
    } // 조건 종료
    const decoded = decodeURIComponent(source.slice(sourcePrefix.length)).toLowerCase(); // 본문 해석
    return decoded.startsWith("<svg") && !decoded.includes("<script") && !/\son[a-z]+\s*=/.test(decoded) && !decoded.includes("href=\"http"); // 스크립트·외부 연결 거부
} // 함수 종료

export function checkImageRequest(input: Pick<ImageRequest, "prompt" | "contentRating">): ImageCheckResult // 생성 전 금지 검사(실존 인물·미성년자)
{ // 함수 시작
    const prompt = input.prompt.trim(); // 설명 정리
    if (prompt.length === 0 || prompt.length > IMAGE_PROMPT_LIMIT) // 길이 판정
    { // 조건 시작
        return { ok: false, category: "invalid", message: `장면 설명을 1~${IMAGE_PROMPT_LIMIT}자로 적어 주세요.` }; // 길이 오류
    } // 조건 종료
    if (realPersonPattern.test(prompt)) // 실존 인물 판정(모든 등급)
    { // 조건 시작
        return { ok: false, category: "real-person", message: "실존 인물을 그리거나 합성하는 이미지는 만들 수 없어요." }; // 실존 인물 거부
    } // 조건 종료
    if (input.contentRating === "mature" && minorPattern.test(prompt)) // 미성년자 19세 판정
    { // 조건 시작
        return { ok: false, category: "minor", message: "미성년자로 보이는 인물은 19세 이미지로 만들 수 없어요." }; // 미성년자 거부
    } // 조건 종료
    return { ok: true }; // 통과
} // 함수 종료

export function getImageExposure(rating: ContentRating, region: ServiceRegion): ImageExposure // 19세 이미지 가림 처리
{ // 함수 시작
    return rating === "mature" ? getRegionPolicy(region).exposure : "none"; // 19세만 지역 정책 적용
} // 함수 종료

export function createGeneratedImage(input: ImageRequest, region: ServiceRegion, now: string, id: string): GeneratedImage // 생성 결과 만들기
{ // 함수 시작
    const src = createMockImageSource(input); // Mock 그림(실제 모델 연결 시 이 자리를 바꾼다)
    return { id, prompt: input.prompt.trim(), style: input.style, aspect: input.aspect, referenceCharacterId: input.referenceCharacterId, contentRating: input.contentRating, exposure: getImageExposure(input.contentRating, region), src, favorite: false, createdAt: now }; // 결과 반환
} // 함수 종료

export function canUseImageForRating(imageRating: ContentRating, workRating: ContentRating): boolean // 작품 등급으로 쓸 수 있는 이미지인지
{ // 함수 시작
    return ratingOrder[imageRating] <= ratingOrder[workRating]; // 이미지 등급이 작품 등급 이하
} // 함수 종료

export function findImageBySource(images: readonly GeneratedImage[], source: string): GeneratedImage | undefined // 경로로 생성 이미지 찾기
{ // 함수 시작
    return images.find((image) => image.src === source); // 이미지 반환
} // 함수 종료
