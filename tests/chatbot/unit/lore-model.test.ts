import { describe, expect, it } from "vitest"; // 테스트 도구
import { cleanKeywords, createExample, createLoreEntry, EXAMPLE_LIMIT, findExampleReply, LORE_ACTIVE_LIMIT, LORE_LIMIT, matchLore, normalizeExamples, normalizeLorebook, toExamplePrompt, toLorePrompt, validateExamples, validateLorebook } from "@chatbot/features/chat/lore-model"; // 설정집 규칙
import type { ExampleDialogue, LoreEntry } from "@chatbot/features/core/types"; // 도메인 타입

const lore = (id: string, title: string, keywords: string[], content = `${title} 설명`): LoreEntry => ({ id, title, keywords, content }); // 설정 만들기
const say = (role: "user" | "assistant" | "system", content: string) => ({ role, content }); // 메시지 만들기

describe("키워드 설정집", () => // 설정집 묶음
{ // 묶음 시작
    it("새 설정과 예시는 서로 다른 식별자로 비어서 만들어진다", () => // 생성 검증
    { // 검증 시작
        const first = createLoreEntry(); // 첫 설정
        const second = createLoreEntry(); // 둘째 설정
        expect(first).toMatchObject({ title: "", keywords: [], content: "" }); // 빈 설정
        expect(first.id).not.toBe(second.id); // 다른 식별자
        expect(createExample()).toMatchObject({ user: "", reply: "" }); // 빈 예시
    }); // 검증 종료

    it("키워드는 앞뒤 공백과 빈 값, 같은 말을 정리한다", () => // 키워드 정리 검증
    { // 검증 시작
        expect(cleanKeywords([" 도서관 ", "", "금서", "도서관", "Moon", "moon"])).toEqual(["도서관", "금서", "Moon"]); // 정리 결과
    }); // 검증 종료

    it("정리하면 아무것도 적지 않은 설정과 예시는 사라지고 나머지는 공백이 정리된다", () => // 정리 검증
    { // 검증 시작
        expect(normalizeLorebook([lore("a", " 달빛 도서관 ", [" 도서관", " "], " 자정에만 열린다. "), lore("b", " ", [" "], " ")])).toEqual([lore("a", "달빛 도서관", ["도서관"], "자정에만 열린다.")]); // 빈 설정 제거
        expect(normalizeExamples([{ id: "x", user: " 안녕 ", reply: " 어서 와. " }, { id: "y", user: " ", reply: "" }])).toEqual([{ id: "x", user: "안녕", reply: "어서 와." }]); // 빈 예시 제거
    }); // 검증 종료

    it("설정은 이름·키워드·내용이 모두 있어야 하고 한도를 넘으면 안 된다", () => // 설정 검증
    { // 검증 시작
        expect(validateLorebook([lore("a", "달빛 도서관", ["도서관"])])).toBeNull(); // 통과
        expect(validateLorebook([lore("a", "", ["도서관"])])).toBe("설정 1의 이름을 1~20자로 적어 주세요."); // 이름 없음
        expect(validateLorebook([lore("a", "가".repeat(21), ["도서관"])])).toBe("설정 1의 이름을 1~20자로 적어 주세요."); // 이름 김
        expect(validateLorebook([lore("a", "달빛 도서관", ["도서관"]), lore("b", "금서", [" "])])).toBe("설정 2의 키워드를 1~5개(각 20자 이하) 적어 주세요."); // 키워드 없음
        expect(validateLorebook([lore("a", "금서", ["가", "나", "다", "라", "마", "바"])])).toBe("설정 1의 키워드를 1~5개(각 20자 이하) 적어 주세요."); // 키워드 많음
        expect(validateLorebook([lore("a", "금서", ["가".repeat(21)])])).toBe("설정 1의 키워드를 1~5개(각 20자 이하) 적어 주세요."); // 키워드 김
        expect(validateLorebook([lore("a", "금서", ["금서"], " ")])).toBe("설정 1의 내용을 1~500자로 적어 주세요."); // 내용 없음
        expect(validateLorebook([lore("a", "금서", ["금서"], "가".repeat(501))])).toBe("설정 1의 내용을 1~500자로 적어 주세요."); // 내용 김
        expect(validateLorebook(Array.from({ length: LORE_LIMIT + 1 }, (_item, index) => lore(`l${index}`, `설정${index}`, ["가"])))).toBe("설정집은 20개까지 만들 수 있습니다."); // 개수 초과
    }); // 검증 종료

    it("예시 대화는 사용자 말과 답이 모두 있어야 하고 한도를 넘으면 안 된다", () => // 예시 검증
    { // 검증 시작
        const example = (user: string, reply: string, id = "e"): ExampleDialogue => ({ id, user, reply }); // 예시 만들기
        expect(validateExamples([example("안녕", "어서 와.")])).toBeNull(); // 통과
        expect(validateExamples([example("", "어서 와.")])).toBe("예시 1의 사용자 말을 1~200자로 적어 주세요."); // 사용자 말 없음
        expect(validateExamples([example("가".repeat(201), "어서 와.")])).toBe("예시 1의 사용자 말을 1~200자로 적어 주세요."); // 사용자 말 김
        expect(validateExamples([example("안녕", "어서 와."), example("잘 가", " ", "f")])).toBe("예시 2의 답을 1~500자로 적어 주세요."); // 답 없음
        expect(validateExamples([example("안녕", "가".repeat(501))])).toBe("예시 1의 답을 1~500자로 적어 주세요."); // 답 김
        expect(validateExamples(Array.from({ length: EXAMPLE_LIMIT + 1 }, (_item, index) => example("안녕", "어서 와.", `e${index}`)))).toBe("예시 대화는 5쌍까지 만들 수 있습니다."); // 개수 초과
    }); // 검증 종료

    it("최근 대화에 키워드가 나온 설정만 고르고 대소문자는 가리지 않는다", () => // 키워드 찾기 검증
    { // 검증 시작
        const book = [lore("a", "달빛 도서관", ["도서관"]), lore("b", "금서", ["금서", "Forbidden"]), lore("c", "열쇠", ["열쇠"])]; // 설정집
        expect(matchLore(book, [say("assistant", "어서 와."), say("user", "이 도서관은 언제 열어?")]).map((entry) => entry.id)).toEqual(["a"]); // 한 개
        expect(matchLore(book, [say("user", "FORBIDDEN 책이 있어?")]).map((entry) => entry.id)).toEqual(["b"]); // 대소문자 무시
        expect(matchLore(book, [say("user", "오늘 날씨 좋다")])).toEqual([]); // 없음
        expect(matchLore([], [say("user", "도서관")])).toEqual([]); // 설정집 없음
    }); // 검증 종료

    it("가장 최근에 나온 설정을 앞에 두고, 오래된 대화와 시스템 메시지는 보지 않는다", () => // 순서·범위 검증
    { // 검증 시작
        const book = [lore("a", "달빛 도서관", ["도서관"]), lore("b", "금서", ["금서"]), lore("c", "열쇠", ["열쇠"])]; // 설정집
        const talk = [say("user", "열쇠는 어디 있어?"), say("assistant", "도서관 안쪽에 있어."), say("system", "금서 이야기는 건너뜀"), say("user", "그럼 가 보자"), say("assistant", "좋아."), say("user", "도서관이 넓네")]; // 대화
        expect(matchLore(book, talk).map((entry) => entry.id)).toEqual(["a"]); // 최근 네 개(시스템 제외) 안에서만: 열쇠는 범위 밖, 금서는 시스템 메시지
        expect(matchLore(book, [say("user", "금서가 궁금해"), say("assistant", "도서관에 있어."), say("user", "열쇠도 필요해?")]).map((entry) => entry.id)).toEqual(["c", "a", "b"]); // 최근에 나온 순서
    }); // 검증 종료

    it("한 번에 넘기는 설정은 다섯 개까지이고 내용이 빈 설정은 넘기지 않는다", () => // 한도 검증
    { // 검증 시작
        const book = Array.from({ length: 7 }, (_item, index) => lore(`l${index}`, `설정${index}`, [`단어${index}`])); // 일곱 설정
        const picked = matchLore(book, [say("user", book.map((entry) => entry.keywords[0]).join(" "))]); // 모두 언급
        expect(picked).toHaveLength(LORE_ACTIVE_LIMIT); // 다섯 개
        expect(picked.map((entry) => entry.id)).toEqual(["l0", "l1", "l2", "l3", "l4"]); // 같은 메시지면 적은 순서
        expect(matchLore([lore("a", "빈 설정", ["도서관"], " ")], [say("user", "도서관")])).toEqual([]); // 내용 없음
    }); // 검증 종료

    it("AI에게 넘길 모양으로 바꾸고, 예시와 같은 말에는 예시 답을 찾는다", () => // 넘김 모양 검증
    { // 검증 시작
        expect(toLorePrompt([lore("a", " 달빛 도서관 ", [" 도서관 ", ""], " 자정에만 열린다. ")])).toEqual([{ title: "달빛 도서관", keywords: ["도서관"], content: "자정에만 열린다." }]); // 이름·키워드·내용
        const examples = toExamplePrompt([{ id: "x", user: " 오늘  뭐 해? ", reply: " 책을 정리하고 있었어. " }, { id: "y", user: "안녕", reply: " " }]); // 예시 정리
        expect(examples).toEqual([{ user: "오늘  뭐 해?", reply: "책을 정리하고 있었어." }]); // 두 칸이 다 있는 예시만
        expect(findExampleReply(examples, "  오늘 뭐 해?  ")).toBe("책을 정리하고 있었어."); // 공백 차이는 무시
        expect(findExampleReply(examples, "내일 뭐 해?")).toBeNull(); // 다른 말
        expect(findExampleReply(examples, " ")).toBeNull(); // 빈 말
    }); // 검증 종료
}); // 묶음 종료
