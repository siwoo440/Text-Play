import type { WritingStyle } from "@chatbot/features/core/types"; // 문체 타입

export interface SuggestionInput // 추천 답변 입력
{ // 구조 시작
    names: string[]; // 상대 인물 이름(스토리는 등장인물)
    emotion: string; // 현재 감정
    turn: number; // 현재 턴
    seed: string; // 결정 키
} // 구조 종료

const actions = ["*조용히 고개를 끄덕인다*", "*한 걸음 다가가 눈을 맞춘다*", "*주변을 천천히 둘러본다*", "*작게 웃음을 터뜨린다*"]; // 행동
const questions = ["{name}, 지금 무슨 생각 하고 있어?", "{name}, 그 얘기 조금만 더 들려줄래?", "{name}, 혹시 내가 도울 일 있어?", "{name}, 다음엔 어디로 가 볼까?"]; // 질문
const feelings = ["괜찮아, 천천히 해도 돼.", "나도 같은 마음이었어.", "이 순간이 좀 더 길었으면 좋겠다.", "솔직히 조금 긴장돼."]; // 감정 표현

function hash(text: string): number // 결정 해시
{ // 함수 시작
    return [...text].reduce((total, character) => (total * 31 + (character.codePointAt(0) ?? 0)) >>> 0, 11); // 해시 반환
} // 함수 종료

export function createSuggestedReplies(input: SuggestionInput): string[] // 추천 답변 3개(행동·질문·감정)
{ // 함수 시작
    const key = hash(`${input.seed}|${input.turn}|${input.emotion}`); // 결정 키
    const name = input.names[key % Math.max(input.names.length, 1)] ?? "너"; // 말 걸 상대
    return [actions[key % actions.length], questions[(key >>> 3) % questions.length].replace("{name}", name), feelings[(key >>> 5) % feelings.length]]; // 3개 반환
} // 함수 종료

export const writingStyles: Array<{ id: WritingStyle; label: string; description: string }> = // 문체 목록
[ // 목록 시작
    { id: "default", label: "기본", description: "제작자 의도대로" }, // 기본
    { id: "romance", label: "로맨스", description: "내면과 감정 중심" }, // 로맨스
    { id: "hardboiled", label: "하드보일드", description: "속도감 있는 전개" }, // 하드보일드
    { id: "comic", label: "코믹", description: "가볍고 유쾌한 톤" }, // 코믹
    { id: "literary", label: "문학적", description: "감각적인 묘사" }, // 문학적
]; // 목록 종료

export function getStyleSample(style: WritingStyle, name: string): string[] // 문체 미리보기 문장
{ // 함수 시작
    const samples: Record<WritingStyle, string[]> = // 문체별 예시
    { // 예시 시작
        default: [`${name}가 잠시 망설이다 네 소매를 붙잡았다.`, `${name} | 가지 마…`], // 기본
        romance: [`${name}의 손끝이 떨렸다. 놓치고 싶지 않다는 마음이 숨길 틈도 없이 번졌다.`, `${name} | …조금만 더 있어 줘.`], // 로맨스
        hardboiled: [`${name}가 소매를 낚아챘다. 짧은 숨. 시간이 없었다.`, `${name} | 움직이지 마. 지금은.`], // 하드보일드
        comic: [`${name}가 소매를 붙잡다 그대로 미끄러졌다. 둘 다 잠깐 말이 없었다.`, `${name} | …방금 건 못 본 걸로 해 줘!`], // 코믹
        literary: [`창밖의 빛이 기울었다. ${name}의 손이 그 빛을 따라 네 소매 끝에 내려앉았다.`, `${name} | 가지 마, 아직은.`], // 문학적
    }; // 예시 종료
    return samples[style]; // 예시 반환
} // 함수 종료
