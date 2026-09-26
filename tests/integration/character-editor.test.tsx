import { screen, within } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { CharacterEditor } from "@/features/character/CharacterEditor"; // 편집기 대상
import { useAppStore } from "@/features/core/AppProvider"; // 앱 상태
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태
import { renderWithApp } from "@/test/render-with-app"; // 앱 렌더

function CharacterStateProbe() // 상태 확인기
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    return <output aria-label="저장 캐릭터">{state.characters.map((character) => `${character.id}:${character.name}:${character.publicationStatus}`).join("|")}</output>; // 상태 출력
} // 함수 종료

describe("캐릭터 편집기", () => // 편집기 묶음
{ // 묶음 시작
    it("입력한 캐릭터를 임시 저장하고 미리보기에 반영한다", async () => // 제작 흐름 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<><CharacterEditor /><CharacterStateProbe /></>); // 편집기 렌더
        await user.type(screen.getByLabelText("캐릭터 이름"), "밤 기차의 루미"); // 이름 입력
        await user.type(screen.getByLabelText("한 줄 소개"), "자정 열차의 안내자"); // 소개 입력
        await user.type(screen.getByLabelText("성격"), "차분하고 다정함"); // 성격 입력
        await user.type(screen.getByLabelText("첫 인사"), "어디까지 가고 싶어?"); // 인사 입력
        const preview = screen.getByTestId("character-preview"); // 미리보기 조회
        expect(within(preview).getByRole("heading", { name: "밤 기차의 루미" })).toBeVisible(); // 미리보기 확인
        await user.click(screen.getByRole("button", { name: "임시 저장" })); // 임시 저장
        expect(screen.getByRole("status", { name: "저장 상태" })).toHaveTextContent("임시 저장했습니다."); // 저장 안내 확인
        expect(screen.getByLabelText("저장 캐릭터")).toHaveTextContent("밤 기차의 루미:draft"); // 상태 저장 확인
    }, 15_000); // 전체 스위트 입력 시간 허용

    it("필수값 누락을 한 번에 안내하고 저장하지 않는다", async () => // 오류 흐름 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<CharacterEditor />); // 편집기 렌더
        await user.click(screen.getByRole("button", { name: "공개 저장" })); // 저장 시도
        expect(screen.getAllByRole("alert")).toHaveLength(4); // 필수 오류 확인
        expect(screen.getByText("캐릭터 이름을 입력해 주세요.")).toBeVisible(); // 이름 오류 확인
    }); // 검증 종료

    it("기존 캐릭터를 수정해 같은 식별자로 저장한다", async () => // 수정 흐름 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const state = createInitialState(); // 초기 상태 준비
        state.characters[0] = { ...state.characters[0], creatorId: state.profile.id }; // 소유 캐릭터 적용
        renderWithApp(<><CharacterEditor characterId="rian" /><CharacterStateProbe /></>, state); // 수정 편집기 렌더
        const name = screen.getByLabelText("캐릭터 이름"); // 이름 입력 조회
        await user.clear(name); // 기존 이름 제거
        await user.type(name, "수정된 리안"); // 새 이름 입력
        await user.click(screen.getByRole("button", { name: "공개 저장" })); // 공개 저장
        expect(screen.getByRole("status", { name: "저장 상태" })).toHaveTextContent("공개 저장했습니다."); // 저장 안내 확인
        expect(screen.getByLabelText("저장 캐릭터")).toHaveTextContent("rian:수정된 리안:published"); // 같은 식별자 확인
    }); // 검증 종료

    it("다른 제작자의 캐릭터와 비공개 프롬프트를 편집하지 못한다", () => // 소유권 검증
    { // 검증 시작
        renderWithApp(<CharacterEditor characterId="rian" />); // 타인 캐릭터 편집 시도
        expect(screen.getByRole("heading", { name: "이 캐릭터를 수정할 권한이 없습니다." })).toBeVisible(); // 권한 안내 확인
        expect(screen.queryByLabelText("제작자용 비공개 프롬프트")).toBeNull(); // 프롬프트 비노출 확인
    }); // 검증 종료

    it("저장하지 않은 변경이 있으면 내부 링크 이동을 확인한다", async () => // 이탈 확인 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(false); // 이동 취소 설정
        renderWithApp(<CharacterEditor />); // 편집기 렌더
        await user.type(screen.getByLabelText("캐릭터 이름"), "작성 중"); // 변경 입력
        await user.click(screen.getByRole("link", { name: "보관함 보기" })); // 내부 이동 시도
        expect(confirm).toHaveBeenCalledWith("저장하지 않은 변경 사항이 있습니다. 페이지를 이동하시겠습니까?"); // 확인 호출 검증
        confirm.mockRestore(); // 확인 복원
    }); // 검증 종료
}); // 묶음 종료
