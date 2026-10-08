import { beforeEach, describe, expect, it } from "vitest"; // 테스트 도구
import { clearDraft, coerceDraft, draftKey, loadDraft, saveDraft } from "@chatbot/features/character/draft-storage"; // 초안 보관
import { createDefaultStatusTemplate } from "@chatbot/features/core/defaults"; // 기본 상태창

const base = { name: "", tags: [] as string[], statusTemplate: createDefaultStatusTemplate(true), events: [] as unknown[], updates: [] as unknown[], visibility: "private" }; // 기준 초안

describe("작성 중 자동 저장 보관", () => // 보관 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 테스트마다 비움

    it("작품 종류와 식별자로 저장 키를 만든다", () => // 키
    { // 검증 시작
        expect(draftKey("character", undefined)).toBe("mateverse:draft:character:new"); // 새 캐릭터
        expect(draftKey("story", "story-1")).toBe("mateverse:draft:story:story-1"); // 스토리 수정
    }); // 검증 종료

    it("보관한 초안을 시각과 함께 다시 읽고, 지우면 사라진다", () => // 보관·읽기·지우기
    { // 검증 시작
        const key = draftKey("character", undefined); // 키
        expect(loadDraft(localStorage, key, base)).toBeNull(); // 처음엔 없음
        expect(saveDraft(localStorage, key, { ...base, name: "리안", tags: ["힐링"] }, "2026-10-03T12:00:00.000Z")).toBe(true); // 보관
        expect(loadDraft(localStorage, key, base)).toEqual({ savedAt: "2026-10-03T12:00:00.000Z", draft: { ...base, name: "리안", tags: ["힐링"] } }); // 다시 읽기
        clearDraft(localStorage, key); // 지우기
        expect(loadDraft(localStorage, key, base)).toBeNull(); // 없음
    }); // 검증 종료

    it("모양이 다른 항목과 모르는 항목은 버리고 기준 값을 쓴다", () => // 모양 맞추기
    { // 검증 시작
        const coerced = coerceDraft(base, { name: 7, tags: "힐링", visibility: "public", extra: true, statusTemplate: { enabled: true }, events: [{ id: 1 }], updates: [{ id: "u", version: "V2", date: "2026-10-01", note: "새 장면" }] }); // 예전 모양이 섞인 값
        expect(coerced.name).toBe(""); // 글자가 아니면 기준 값
        expect(coerced.tags).toEqual([]); // 목록이 아니면 기준 값
        expect(coerced.visibility).toBe("public"); // 같은 종류는 사용
        expect("extra" in coerced).toBe(false); // 모르는 항목 제외
        expect(coerced.statusTemplate).toEqual(base.statusTemplate); // 예전 상태창 형식은 기준 값
        expect(coerced.events).toEqual([]); // 잘못된 이벤트는 기준 값
        expect(coerced.updates).toHaveLength(1); // 올바른 업데이트 기록은 유지
        expect(coerceDraft(base, "글자")).toBe(base); // 묶음이 아니면 기준 값
    }); // 검증 종료

    it("설정집·예시 대화가 없는 예전 보관분은 빈 목록으로, 모양이 다른 항목은 기준 값으로 읽는다", () => // 설정집 모양 맞추기
    { // 검증 시작
        const withLore = { ...base, lorebook: [] as unknown[], examples: [] as unknown[] }; // 설정집이 있는 기준 초안
        const entry = { id: "lore-1", title: "금서 구역", keywords: ["금서"], content: "사서만 들어갈 수 있다." }; // 올바른 설정
        const example = { id: "example-1", user: "오늘 뭐 해?", reply: "책을 정리하고 있었어." }; // 올바른 예시
        expect(coerceDraft(withLore, { name: "리안" })).toMatchObject({ name: "리안", lorebook: [], examples: [] }); // 예전 보관분
        expect(coerceDraft(withLore, { lorebook: [entry], examples: [example] })).toMatchObject({ lorebook: [entry], examples: [example] }); // 올바른 값은 유지
        expect(coerceDraft(withLore, { lorebook: [{ ...entry, keywords: "금서" }], examples: [{ ...example, reply: 7 }] })).toMatchObject({ lorebook: [], examples: [] }); // 다른 모양은 기준 값
    }); // 검증 종료

    it("깨진 보관 값은 없는 것으로 본다", () => // 깨진 값
    { // 검증 시작
        localStorage.setItem("mateverse:draft:character:new", "{깨진 값"); // 깨진 JSON
        expect(loadDraft(localStorage, "mateverse:draft:character:new", base)).toBeNull(); // 없음
        localStorage.setItem("mateverse:draft:character:new", JSON.stringify({ draft: base })); // 시각 없음
        expect(loadDraft(localStorage, "mateverse:draft:character:new", base)).toBeNull(); // 없음
        expect(saveDraft({ setItem: () => { throw new Error("가득 참"); } }, "키", base, "2026-10-03T12:00:00.000Z")).toBe(false); // 공간이 없으면 실패를 알림
    }); // 검증 종료
}); // 묶음 종료
