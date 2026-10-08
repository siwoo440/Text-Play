import { describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { createEmptyStoryDraft, createStoryCastMember, getStoryCandidates, getStoryCoverChoices, keepStoryCover, normalizeStoryDraft, storyCoverOptions, toStoryDraft, validateStoryDraft, type StoryDraft } from "@chatbot/features/story/story-validation"; // 검증 대상

const state = createInitialState(); // 기본 상태
const rian = state.characters.find((character) => character.id === "rian")!; // 리안
const sera = state.characters.find((character) => character.id === "sera")!; // 세라(15세)

function validDraft(): StoryDraft // 정상 초안
{ // 함수 시작
    return { ...createEmptyStoryDraft(), title: "새벽 기록 조사", summary: "사라진 문장을 찾는다.", opening: "기록관 문이 열린다.", cast: [createStoryCastMember(rian)], contentRating: "all" }; // 초안 반환
} // 함수 종료

describe("스토리 입력 검증", () => // 검증 묶음
{ // 묶음 시작
    it("빈 초안은 제목·소개·시작 장면·등장인물 오류를 한 번에 돌려준다", () => // 필수값 검증
    { // 검증 시작
        const result = validateStoryDraft(createEmptyStoryDraft(), state.characters); // 빈 초안 검증
        expect(result.valid).toBe(false); // 실패 확인
        expect(result.errors).toEqual( // 오류 확인
        { // 예상 시작
            title: "스토리 제목을 입력해 주세요.", // 제목 오류
            summary: "한 줄 소개를 입력해 주세요.", // 소개 오류
            opening: "시작 장면을 입력해 주세요.", // 시작 장면 오류
            cast: "등장인물을 1명 이상 골라 주세요.", // 등장인물 오류
        }); // 예상 종료
    }); // 검증 종료

    it("정상 초안은 통과하고 공백·중복 태그를 정리한다", () => // 정상 검증
    { // 검증 시작
        const draft = { ...validDraft(), title: "  새벽 기록 조사  ", tags: [" 미스터리 ", "미스터리", ""] }; // 공백 초안
        expect(validateStoryDraft(draft, state.characters)).toEqual({ valid: true, errors: {} }); // 통과 확인
        expect(normalizeStoryDraft(draft).title).toBe("새벽 기록 조사"); // 제목 정리 확인
        expect(normalizeStoryDraft(draft).tags).toEqual(["미스터리"]); // 태그 정리 확인
    }); // 검증 종료

    it("새 등장인물은 캐릭터 이름에서 짧은 이름을 만들고 역할·첫 대사는 비워 둔다", () => // 기본값 검증
    { // 검증 시작
        const member = createStoryCastMember(rian); // 등장인물 생성
        expect(member).toEqual({ characterId: "rian", displayName: "리안", role: "", firstLine: "" }); // 기본값 확인
    }); // 검증 종료

    it("등장인물은 최대 4명이고 같은 캐릭터·같은 이야기 속 이름은 쓸 수 없다", () => // 등장인물 규칙 검증
    { // 검증 시작
        const five = state.characters.slice(0, 5).map((character) => createStoryCastMember(character)); // 5명
        expect(validateStoryDraft({ ...validDraft(), cast: five, contentRating: "teen" }, state.characters).errors.cast).toBe("등장인물은 최대 4명까지 넣을 수 있습니다."); // 인원 초과
        expect(validateStoryDraft({ ...validDraft(), cast: [createStoryCastMember(rian), createStoryCastMember(rian)] }, state.characters).errors.cast).toBe("같은 캐릭터를 두 번 넣을 수 없습니다."); // 같은 캐릭터
        const sameName = [createStoryCastMember(rian), { ...createStoryCastMember(sera), displayName: "리안" }]; // 같은 이름
        expect(validateStoryDraft({ ...validDraft(), cast: sameName, contentRating: "teen" }, state.characters).errors.cast).toBe("등장인물의 이야기 속 이름이 겹칩니다."); // 이름 중복
    }); // 검증 종료

    it("이야기 속 이름은 비울 수 없고 대괄호·내레이션은 쓸 수 없다", () => // 이름 규칙 검증
    { // 검증 시작
        const check = (displayName: string) => validateStoryDraft({ ...validDraft(), cast: [{ ...createStoryCastMember(rian), displayName }] }, state.characters).errors.cast; // 이름 검증
        expect(check(" ")).toBe("등장인물의 이야기 속 이름을 입력해 주세요."); // 빈 이름
        expect(check("[리안]")).toBe("이야기 속 이름에는 대괄호와 @를 쓸 수 없습니다."); // 대괄호
        expect(check("내레이션")).toBe("‘내레이션’은 등장인물 이름으로 쓸 수 없습니다."); // 내레이션
        expect(check("가".repeat(13))).toBe("이야기 속 이름은 12자 이하여야 합니다."); // 길이
    }); // 검증 종료

    it("사라진 캐릭터를 등장인물로 쓸 수 없다", () => // 캐릭터 존재 검증
    { // 검증 시작
        const ghost = { characterId: "ghost", displayName: "유령", role: "", firstLine: "" }; // 없는 캐릭터
        expect(validateStoryDraft({ ...validDraft(), cast: [ghost] }, state.characters).errors.cast).toBe("등장인물 중 사라진 캐릭터가 있습니다. 다시 골라 주세요."); // 부재 오류
    }); // 검증 종료

    it("이용 등급은 등장인물의 가장 높은 등급보다 낮을 수 없다", () => // 등급 검증
    { // 검증 시작
        const draft = { ...validDraft(), cast: [createStoryCastMember(rian), createStoryCastMember(sera)], contentRating: "all" as const }; // 15세 인물 포함
        expect(validateStoryDraft(draft, state.characters).errors.contentRating).toBe("등장인물 기준으로 15세 이용가 이상이어야 합니다."); // 등급 오류
        expect(validateStoryDraft({ ...draft, contentRating: "teen" }, state.characters).valid).toBe(true); // 맞춘 등급 통과
    }); // 검증 종료

    it("표지는 준비된 장면 이미지나 프로젝트의 캐릭터 이미지만 쓸 수 있다", () => // 표지 검증
    { // 검증 시작
        expect(storyCoverOptions).toContain("/images/scenes/moon-library.webp"); // 표지 목록 확인
        expect(storyCoverOptions).not.toContain("/images/scenes/moon-library.svg"); // 예전 임시 그림은 선택지에 없음
        expect(validateStoryDraft({ ...validDraft(), coverImage: "/images/characters/rian.webp" }, state.characters).errors.coverImage).toBeUndefined(); // 캐릭터 이미지 허용
        expect(validateStoryDraft({ ...validDraft(), coverImage: "https://example.com/a.png" }, state.characters).errors.coverImage).toBe("준비된 표지 이미지를 골라 주세요."); // 외부 이미지 거부
        expect(validateStoryDraft({ ...validDraft(), coverImage: "/images/characters/../secret.webp" }, state.characters).errors.coverImage).toBe("준비된 표지 이미지를 골라 주세요."); // 경로 이동 거부
    }); // 검증 종료

    it("표지 선택지는 장면 이미지 3종 뒤에 고른 등장인물의 이미지를 붙인다", () => // 표지 선택지 검증
    { // 검증 시작
        const choices = getStoryCoverChoices([createStoryCastMember(rian), createStoryCastMember(sera)], state.characters); // 선택지
        expect(choices.map((choice) => choice.path)).toEqual([...storyCoverOptions, rian.coverImage, sera.coverImage]); // 순서 확인
        expect(choices.at(-1)?.label).toBe("세라"); // 인물 표지 이름 확인
    }); // 검증 종료

    it("등장인물을 바꿀 때 표지는 빠진 인물의 그림이었을 때만 기본 표지로 돌아간다", () => // 표지 유지 검증
    { // 검증 시작
        const both = [createStoryCastMember(rian), createStoryCastMember(sera)]; // 두 사람
        const onlyRian = [createStoryCastMember(rian)]; // 세라가 빠짐
        const mine = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E"; // 내가 만든 그림(갤러리에서 지웠거나 지금은 가려진 것)
        expect(keepStoryCover(sera.coverImage, both, onlyRian, state.characters)).toBe(storyCoverOptions[0]); // 빠진 인물의 그림이면 기본 표지로
        expect(keepStoryCover(rian.coverImage, both, onlyRian, state.characters)).toBe(rian.coverImage); // 남은 인물의 그림은 그대로
        expect(keepStoryCover(sera.coverImage, both, [...both].reverse(), state.characters)).toBe(sera.coverImage); // 순서만 바꾸면 그대로
        expect(keepStoryCover(storyCoverOptions[2], both, onlyRian, state.characters)).toBe(storyCoverOptions[2]); // 장면 표지는 그대로
        expect(keepStoryCover(mine, both, onlyRian, state.characters)).toBe(mine); // 내 그림은 선택지에 없어도 그대로
        expect(keepStoryCover(mine, onlyRian, both, state.characters)).toBe(mine); // 인물을 더해도 그대로
    }); // 검증 종료

    it("등장인물 후보는 공개 캐릭터와 내 캐릭터이고 19+는 볼 수 있을 때만 포함한다", () => // 후보 검증
    { // 검증 시작
        const next = createInitialState(); // 상태 복사
        next.characters = [...next.characters, { ...rian, id: "mine", name: "내 비공개 인물", creatorId: next.profile.id, visibility: "private", publicationStatus: "draft" }, { ...rian, id: "other-private", name: "남의 비공개", visibility: "private" }, { ...rian, id: "mature", name: "성인 인물", contentRating: "mature" }]; // 후보 추가
        const ids = getStoryCandidates(next, false).map((character) => character.id); // 후보 목록
        expect(ids).toContain("mine"); // 내 캐릭터 포함
        expect(ids).not.toContain("other-private"); // 남의 비공개 제외
        expect(ids).not.toContain("mature"); // 19+ 제외
        expect(getStoryCandidates(next, true).map((character) => character.id)).toContain("mature"); // 19+ 표시 시 포함
    }); // 검증 종료

    it("기존 스토리를 초안으로 바꾸면 등장인물·태그가 복사된다", () => // 초안 변환 검증
    { // 검증 시작
        const story = state.stories[0]; // 기존 스토리
        const draft = toStoryDraft(story); // 초안 변환
        draft.cast[0].displayName = "바뀜"; // 복사본 수정
        expect(story.cast[0].displayName).toBe("리안"); // 원본 유지 확인
        expect(draft.title).toBe(story.title); // 제목 복사 확인
    }); // 검증 종료
}); // 묶음 종료
