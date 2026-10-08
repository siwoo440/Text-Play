// 키워드 설정집과 예시 대화: 제작자가 적어 둔 배경 설정을 대화에 키워드가 나올 때만 AI에게 넘기고, 말투를 보여 주는 예시 대화를 함께 넘긴다.
import type { ExampleDialogue, LoreEntry, Message } from "@chatbot/features/core/types"; // 도메인 타입
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export const LORE_LIMIT = 20; // 설정집 항목 최대 수
export const LORE_TITLE_LIMIT = 20; // 설정 이름 최대 글자 수
export const LORE_CONTENT_LIMIT = 500; // 설정 내용 최대 글자 수
export const LORE_KEYWORD_LIMIT = 5; // 항목당 키워드 최대 수
export const LORE_KEYWORD_LENGTH = 20; // 키워드 최대 글자 수
export const LORE_SCAN_MESSAGES = 4; // 키워드를 찾는 최근 메시지 수
export const LORE_ACTIVE_LIMIT = 5; // 한 번에 넘기는 설정 최대 수
export const EXAMPLE_LIMIT = 5; // 예시 대화 최대 쌍
export const EXAMPLE_USER_LIMIT = 200; // 예시의 사용자 말 최대 글자 수
export const EXAMPLE_REPLY_LIMIT = 500; // 예시의 답 최대 글자 수

function createId(prefix: string): string // 항목 식별자 만들기
{ // 함수 시작
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; // 식별자 반환
} // 함수 종료

export function createLoreEntry(): LoreEntry // 빈 설정 항목
{ // 함수 시작
    return { id: createId("lore"), title: "", keywords: [], content: "" }; // 빈 항목 반환
} // 함수 종료

export function createExample(): ExampleDialogue // 빈 예시 대화
{ // 함수 시작
    return { id: createId("example"), user: "", reply: "" }; // 빈 예시 반환
} // 함수 종료

export function cleanKeywords(keywords: readonly string[]): string[] // 키워드 정리(앞뒤 공백·빈 값·같은 말 제거)
{ // 함수 시작
    const seen = new Set<string>(); // 이미 나온 키워드
    return keywords.map((keyword) => keyword.trim()).filter((keyword) => // 정리 순회
    { // 순회 시작
        const key = keyword.toLowerCase(); // 대소문자 무시
        if (keyword.length === 0 || seen.has(key)) // 빈 값·중복
        { // 조건 시작
            return false; // 제외
        } // 조건 종료
        seen.add(key); // 기록
        return true; // 유지
    }); // 순회 종료
} // 함수 종료

function isBlankLore(entry: LoreEntry): boolean // 아무것도 적지 않은 설정인지
{ // 함수 시작
    return entry.title.trim().length === 0 && entry.content.trim().length === 0 && cleanKeywords(entry.keywords).length === 0; // 빈 항목 판정
} // 함수 종료

export function normalizeLorebook(lorebook: readonly LoreEntry[]): LoreEntry[] // 설정집 정리(빈 항목은 버림)
{ // 함수 시작
    return lorebook.filter((entry) => !isBlankLore(entry)).map((entry) => ({ ...entry, title: entry.title.trim(), keywords: cleanKeywords(entry.keywords), content: entry.content.trim() })); // 정리 반환
} // 함수 종료

export function normalizeExamples(examples: readonly ExampleDialogue[]): ExampleDialogue[] // 예시 대화 정리(빈 쌍은 버림)
{ // 함수 시작
    return examples.filter((example) => example.user.trim().length > 0 || example.reply.trim().length > 0).map((example) => ({ ...example, user: example.user.trim(), reply: example.reply.trim() })); // 정리 반환
} // 함수 종료

export function validateLorebook(lorebook: readonly LoreEntry[]): string | null // 설정집 검증(첫 오류 문구)
{ // 함수 시작
    if (lorebook.length > LORE_LIMIT) // 개수 판정
    { // 조건 시작
        return t("설정집은 {0}개까지 만들 수 있습니다.", [LORE_LIMIT]); // 개수 오류
    } // 조건 종료
    for (const [index, entry] of lorebook.entries()) // 항목 순회
    { // 순회 시작
        const title = entry.title.trim(); // 이름
        const keywords = cleanKeywords(entry.keywords); // 키워드
        const content = entry.content.trim(); // 내용
        if (title.length === 0 || title.length > LORE_TITLE_LIMIT) // 이름 판정
        { // 조건 시작
            return t("설정 {0}의 이름을 1~{1}자로 적어 주세요.", [index + 1, LORE_TITLE_LIMIT]); // 이름 오류
        } // 조건 종료
        if (keywords.length === 0 || keywords.length > LORE_KEYWORD_LIMIT || keywords.some((keyword) => keyword.length > LORE_KEYWORD_LENGTH)) // 키워드 판정
        { // 조건 시작
            return t("설정 {0}의 키워드를 1~{1}개(각 {2}자 이하) 적어 주세요.", [index + 1, LORE_KEYWORD_LIMIT, LORE_KEYWORD_LENGTH]); // 키워드 오류
        } // 조건 종료
        if (content.length === 0 || content.length > LORE_CONTENT_LIMIT) // 내용 판정
        { // 조건 시작
            return t("설정 {0}의 내용을 1~{1}자로 적어 주세요.", [index + 1, LORE_CONTENT_LIMIT]); // 내용 오류
        } // 조건 종료
    } // 순회 종료
    return null; // 통과
} // 함수 종료

export function validateExamples(examples: readonly ExampleDialogue[]): string | null // 예시 대화 검증(첫 오류 문구)
{ // 함수 시작
    if (examples.length > EXAMPLE_LIMIT) // 개수 판정
    { // 조건 시작
        return t("예시 대화는 {0}쌍까지 만들 수 있습니다.", [EXAMPLE_LIMIT]); // 개수 오류
    } // 조건 종료
    for (const [index, example] of examples.entries()) // 예시 순회
    { // 순회 시작
        const user = example.user.trim(); // 사용자 말
        const reply = example.reply.trim(); // 답
        if (user.length === 0 || user.length > EXAMPLE_USER_LIMIT) // 사용자 말 판정
        { // 조건 시작
            return t("예시 {0}의 사용자 말을 1~{1}자로 적어 주세요.", [index + 1, EXAMPLE_USER_LIMIT]); // 사용자 말 오류
        } // 조건 종료
        if (reply.length === 0 || reply.length > EXAMPLE_REPLY_LIMIT) // 답 판정
        { // 조건 시작
            return t("예시 {0}의 답을 1~{1}자로 적어 주세요.", [index + 1, EXAMPLE_REPLY_LIMIT]); // 답 오류
        } // 조건 종료
    } // 순회 종료
    return null; // 통과
} // 함수 종료

export function matchLore(lorebook: readonly LoreEntry[], messages: readonly Pick<Message, "role" | "content">[]): LoreEntry[] // 최근 대화에 키워드가 나온 설정 고르기(가장 최근에 나온 것부터, 한도까지)
{ // 함수 시작
    const recent = messages.filter((message) => message.role !== "system").slice(-LORE_SCAN_MESSAGES).map((message) => message.content.toLowerCase()); // 최근 메시지(대소문자 무시)
    const hits = lorebook.map((entry, order) => // 항목별 마지막으로 나온 자리
    { // 순회 시작
        const keywords = cleanKeywords(entry.keywords).map((keyword) => keyword.toLowerCase()); // 키워드
        const last = recent.reduce((found, text, index) => keywords.some((keyword) => text.includes(keyword)) ? index : found, -1); // 키워드가 나온 가장 최근 메시지
        return { entry, order, last }; // 결과
    }).filter((item) => item.last >= 0 && item.entry.content.trim().length > 0); // 나온 항목만(내용이 있는 것)
    return hits.sort((left, right) => right.last - left.last || left.order - right.order).slice(0, LORE_ACTIVE_LIMIT).map((item) => item.entry); // 최근 순, 같으면 적은 순서
} // 함수 종료

export function toLorePrompt(entries: readonly LoreEntry[]): Array<{ title: string; keywords: string[]; content: string }> // AI에게 넘기는 설정 모양
{ // 함수 시작
    return entries.map((entry) => ({ title: entry.title.trim(), keywords: cleanKeywords(entry.keywords), content: entry.content.trim() })); // 이름·키워드·내용
} // 함수 종료

export function toExamplePrompt(examples: readonly ExampleDialogue[]): Array<{ user: string; reply: string }> // AI에게 넘기는 예시 대화 모양
{ // 함수 시작
    return normalizeExamples(examples).filter((example) => example.user.length > 0 && example.reply.length > 0).map((example) => ({ user: example.user, reply: example.reply })); // 두 칸이 다 있는 예시만
} // 함수 종료

export function findExampleReply(examples: ReadonlyArray<{ user: string; reply: string }>, message: string): string | null // 예시와 같은 말을 했을 때의 예시 답(연습용 모델이 말투를 흉내 낼 때 씀)
{ // 함수 시작
    const key = message.trim().toLowerCase().replace(/\s+/g, " "); // 비교용 문장
    return key.length === 0 ? null : examples.find((example) => example.user.trim().toLowerCase().replace(/\s+/g, " ") === key)?.reply ?? null; // 같은 말의 답
} // 함수 종료
