import { screen, within } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { Story } from "@chatbot/features/core/types"; // 스토리 타입
import { createGeneratedImage } from "@chatbot/features/images/image-model"; // 생성 이미지 만들기
import { StoryEditor } from "@chatbot/features/story/StoryEditor"; // 스토리 편집기
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    usePathname: () => "/stories/new", // 현재 경로
    useRouter: () => ({ push: () => undefined, replace: () => undefined }), // 이동 함수
})); // 대체 종료

function StoryProbe() // 저장된 스토리 표시
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    const mine = state.stories.filter((story) => story.creatorId === state.profile.id); // 내 스토리
    return <output aria-label="내 스토리">{mine.map((story) => `${story.title}|${story.publicationStatus}|${story.contentRating}|${story.cast.map((member) => `${member.characterId}:${member.displayName}:${member.role}:${member.firstLine}`).join(",")}`).join(" / ")}</output>; // 요약 출력
} // 함수 종료

function createMyStory(): Story // 내가 만든 스토리
{ // 함수 시작
    const base = createInitialState().stories[1]; // 기존 스토리 복사
    return { ...base, id: "story-mine", creatorId: "user-demo", title: "내 카페 이야기", publicationStatus: "draft", visibility: "private" }; // 내 스토리 반환
} // 함수 종료

describe("스토리 편집기", { timeout: 20_000 }, () => // 편집기 묶음(입력이 많아 전체 실행 때 시간 여유)
{ // 묶음 시작
    it("등장인물을 고르고 역할·첫 대사를 적어 공개 저장하면 미리보기와 상태에 반영된다", async () => // 제작 흐름 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<><StoryEditor /><StoryProbe /></>); // 편집기 렌더
        await user.type(screen.getByLabelText("스토리 제목"), "새벽 기록 조사"); // 제목 입력
        await user.type(screen.getByLabelText("한 줄 소개"), "사라진 문장을 찾는다."); // 소개 입력
        await user.type(screen.getByLabelText("시작 장면"), "기록관 문이 천천히 열린다."); // 시작 장면 입력
        await user.type(screen.getByLabelText("내 역할"), "새로 온 조수"); // 내 역할 입력
        const picker = screen.getByRole("group", { name: "등장인물 고르기" }); // 인물 고르기
        await user.click(within(picker).getByRole("checkbox", { name: /새벽 도서관의 리안/ })); // 리안 선택
        await user.click(within(picker).getByRole("checkbox", { name: /비 오는 교실, 세라/ })); // 세라 선택
        expect(screen.getByLabelText("새벽 도서관의 리안 이야기 속 이름")).toHaveValue("리안"); // 기본 이름 확인
        await user.type(screen.getByLabelText("새벽 도서관의 리안 역할"), "기록관 사서"); // 역할 입력
        await user.type(screen.getByLabelText("새벽 도서관의 리안 첫 대사"), "늦었네."); // 첫 대사 입력
        const rating = screen.getByLabelText("이용 등급"); // 등급 선택
        expect(rating).toHaveValue("teen"); // 15세 인물에 맞춰 등급 상향 확인
        expect(within(rating).getByRole("option", { name: "전체 이용가" })).toBeDisabled(); // 낮은 등급 막힘 확인
        const preview = screen.getByTestId("story-preview"); // 미리보기
        expect(within(preview).getByRole("heading", { name: "새벽 기록 조사" })).toBeVisible(); // 제목 미리보기
        expect(preview).toHaveTextContent("기록관 문이 천천히 열린다."); // 시작 장면 미리보기
        expect(preview).toHaveTextContent("리안늦었네."); // 첫 대사 미리보기
        await user.click(screen.getByRole("button", { name: "공개 저장" })); // 공개 저장
        expect(screen.getByRole("status", { name: "저장 상태" })).toHaveTextContent("공개 저장했습니다."); // 저장 안내
        expect(screen.getByLabelText("내 스토리")).toHaveTextContent("새벽 기록 조사|published|teen|rian:리안:기록관 사서:늦었네.,sera:세라::"); // 상태 저장 확인
        expect(screen.getByRole("link", { name: "스토리 보기" }).getAttribute("href")).toMatch(/^\/stories\/story-/); // 상세 링크 확인
    }); // 검증 종료

    it("등장인물 후보를 이름·초성으로 찾을 수 있고 고른 인물은 검색 중에도 남는다", async () => // 후보 검색 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<StoryEditor />); // 편집기 렌더
        const picker = screen.getByRole("group", { name: "등장인물 고르기" }); // 인물 고르기
        await user.click(within(picker).getByRole("checkbox", { name: /새벽 도서관의 리안/ })); // 리안 선택
        await user.type(within(picker).getByRole("searchbox", { name: "등장인물 검색" }), "ㅅㄹ"); // 초성 검색
        const names = within(picker).getAllByRole("checkbox").map((box) => box.closest("label")?.textContent ?? ""); // 남은 후보
        expect(names.some((name) => name.includes("세라"))).toBe(true); // 세라 검색 확인
        expect(names.some((name) => name.includes("리안"))).toBe(true); // 고른 인물 유지 확인
        expect(names.some((name) => name.includes("카일"))).toBe(false); // 다른 인물 제외 확인
        await user.clear(within(picker).getByRole("searchbox", { name: "등장인물 검색" })); // 검색 지우기
        await user.type(within(picker).getByRole("searchbox", { name: "등장인물 검색" }), "없는이름"); // 없는 검색
        expect(picker).toHaveTextContent("‘없는이름’에 맞는 캐릭터가 없습니다."); // 빈 결과 확인
    }); // 검증 종료

    it("필수값이 비면 오류를 한 번에 알리고 저장하지 않는다", async () => // 오류 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<><StoryEditor /><StoryProbe /></>); // 편집기 렌더
        await user.click(screen.getByRole("button", { name: "임시 저장" })); // 저장 시도
        expect(screen.getAllByRole("alert")).toHaveLength(4); // 제목·소개·시작 장면·등장인물 오류
        expect(screen.getByText("등장인물을 1명 이상 골라 주세요.")).toBeVisible(); // 인물 오류 확인
        expect(screen.getByLabelText("내 스토리")).toBeEmptyDOMElement(); // 저장 안 됨 확인
    }); // 검증 종료

    it("등장인물은 4명까지 고를 수 있고 순서를 바꿔 대표 인물을 정할 수 있다", async () => // 인원·순서 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<StoryEditor />); // 편집기 렌더
        const picker = screen.getByRole("group", { name: "등장인물 고르기" }); // 인물 고르기
        const boxes = within(picker).getAllByRole("checkbox"); // 후보 목록
        for (const box of boxes.slice(0, 4)) // 4명 선택
        { // 순회 시작
            await user.click(box); // 선택
        } // 순회 종료
        expect(boxes[4]).toBeDisabled(); // 5번째 막힘 확인
        expect(picker).toHaveTextContent("4/4명"); // 인원 표시 확인
        const castList = screen.getByRole("list", { name: "고른 등장인물" }); // 고른 인물 목록
        const firstName = within(castList).getAllByRole("listitem")[1].querySelector("strong")?.textContent ?? ""; // 두 번째 인물
        await user.click(within(castList).getByRole("button", { name: `${firstName} 앞으로` })); // 앞으로 이동
        expect(within(castList).getAllByRole("listitem")[0]).toHaveTextContent(firstName); // 순서 변경 확인
        expect(within(castList).getAllByRole("listitem")[0]).toHaveTextContent("대표 인물"); // 대표 표시 확인
        await user.click(within(castList).getByRole("button", { name: `${firstName} 빼기` })); // 인물 빼기
        expect(within(castList).getAllByRole("listitem")).toHaveLength(3); // 빼기 확인
        expect(boxes[4]).toBeEnabled(); // 다시 고를 수 있음 확인
    }); // 검증 종료

    it("내가 만든 스토리를 불러와 고치면 같은 스토리가 바뀐다", async () => // 수정 흐름 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const state = createInitialState(); // 초기 상태
        state.stories = [...state.stories, createMyStory()]; // 내 스토리 추가
        renderWithApp(<><StoryEditor storyId="story-mine" /><StoryProbe /></>, state); // 수정 화면 렌더
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("내 카페 이야기 수정"); // 제목 확인
        const title = screen.getByLabelText("스토리 제목"); // 제목 입력
        expect(title).toHaveValue("내 카페 이야기"); // 기존 값 확인
        await user.clear(title); // 제목 지우기
        await user.type(title, "비 오는 밤의 카페"); // 새 제목
        await user.click(screen.getByRole("button", { name: "임시 저장" })); // 임시 저장
        expect(screen.getByLabelText("내 스토리")).toHaveTextContent(/^비 오는 밤의 카페\|draft\|all\|harin:하린:/); // 같은 스토리 수정 확인
    }); // 검증 종료

    it("없는 스토리나 남의 스토리는 고칠 수 없다고 안내한다", () => // 권한 검증
    { // 검증 시작
        const { unmount } = renderWithApp(<StoryEditor storyId="missing" />); // 없는 스토리
        expect(screen.getByRole("heading", { name: "수정할 스토리를 찾을 수 없습니다" })).toBeVisible(); // 부재 안내
        unmount(); // 정리
        renderWithApp(<StoryEditor storyId="story-moonlit-archive" />); // 남의 스토리
        expect(screen.getByRole("heading", { name: "이 스토리를 수정할 권한이 없습니다." })).toBeVisible(); // 권한 안내
    }); // 검증 종료

    it("이미지 스튜디오에서 넘어온 이미지를 표지로 고르고 내 이미지도 표지 선택지에 보인다", () => // 내 이미지 표지 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태
        const plain = createGeneratedImage({ prompt: "옥상 공연 무대", style: "illustration", aspect: "landscape", referenceCharacterId: null, contentRating: "all" }, "kr", "2026-10-01T00:00:00.000Z", "image-plain"); // 일반 이미지
        state.images = [plain]; // 갤러리 준비
        renderWithApp(<StoryEditor initialImageId="image-plain" />, state); // 넘어온 이미지로 시작
        expect(screen.getByRole("radio", { name: /^옥상 공연 무대 표지/ })).toBeChecked(); // 표지 선택 확인
        expect(within(screen.getByTestId("story-preview")).getByRole("img", { name: "제목 없는 스토리 표지" })).toHaveAttribute("src", plain.src); // 미리보기 반영
    }); // 검증 종료
}); // 묶음 종료
