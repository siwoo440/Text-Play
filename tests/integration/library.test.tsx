import { screen } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 도구
import { describe, expect, it } from "vitest"; // 테스트 도구
import { CharacterDetail } from "@/features/character/CharacterDetail"; // 캐릭터 상세
import { useAppStore } from "@/features/core/AppProvider"; // 앱 상태 훅
import { LibraryScreen } from "@/features/library/LibraryScreen"; // 보관함 대상
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태
import { renderWithApp } from "@/test/render-with-app"; // 앱 렌더

function ConversationProbe() // 대화 확인 요소
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    return <span aria-label="대화 개수">{state.conversations.length}:{state.messages.length}</span>; // 개수 출력
} // 함수 종료

describe("로컬 보관함", () => // 보관함 묶음
{ // 묶음 시작
    it("상세 화면에서 보관한 캐릭터를 보관함에 표시한다", async () => // 보관 흐름 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<><CharacterDetail characterId="rian" /><LibraryScreen /></>); // 화면 렌더
        await user.click(screen.getByRole("button", { name: "보관함에 추가" })); // 보관 추가
        await user.click(screen.getByRole("tab", { name: "보관 캐릭터" })); // 보관 탭 이동
        expect(screen.getByRole("link", { name: /새벽 도서관의 리안/ })).toBeVisible(); // 보관 카드 확인
        expect(screen.getByRole("button", { name: "새벽 도서관의 리안 보관 해제" })).toBeVisible(); // 해제 버튼 확인
    }); // 검증 종료

    it("제작 캐릭터를 공개와 임시 저장 탭으로 구분한다", async () => // 탭 분류 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const state = createInitialState(); // 초기 상태 준비
        state.characters[0] = { ...state.characters[0], creatorId: state.profile.id }; // 공개 제작 캐릭터
        state.characters[1] = { ...state.characters[1], creatorId: state.profile.id, publicationStatus: "draft" }; // 임시 제작 캐릭터
        renderWithApp(<LibraryScreen />, state); // 보관함 렌더
        expect(screen.getByRole("link", { name: /새벽 도서관의 리안/ })).toBeVisible(); // 공개 카드 확인
        await user.click(screen.getByRole("tab", { name: "임시 저장" })); // 임시 탭 이동
        expect(screen.getByRole("link", { name: /퇴근길 카페의 하린/ })).toBeVisible(); // 임시 카드 확인
    }); // 검증 종료

    it("삭제 확인 뒤 제작 캐릭터와 연결 대화를 제거한다", async () => // 삭제 흐름 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const state = createInitialState(); // 초기 상태 준비
        state.characters[0] = { ...state.characters[0], creatorId: state.profile.id }; // 내 캐릭터 적용
        renderWithApp(<LibraryScreen />, state); // 보관함 렌더
        await user.click(screen.getByRole("button", { name: "새벽 도서관의 리안 삭제" })); // 삭제 시작
        expect(screen.getByRole("dialog", { name: "캐릭터 삭제" })).toHaveTextContent("연결된 대화와 메시지도 함께 삭제됩니다."); // 삭제 안내 확인
        await user.click(screen.getByRole("button", { name: "삭제 확인" })); // 삭제 승인
        expect(screen.queryByText("새벽 도서관의 리안")).toBeNull(); // 카드 제거 확인
    }); // 검증 종료

    it("대화 이름을 변경하고 보관한 뒤 복구한다", async () => // 대화 관리 흐름 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        renderWithApp(<LibraryScreen />); // 보관함 렌더
        await user.click(screen.getByRole("tab", { name: "진행 중인 대화" })); // 대화 탭 이동
        await user.click(screen.getByRole("button", { name: "새벽 도서관의 리안 이름 변경" })); // 이름 변경 시작
        const title = screen.getByLabelText("대화 이름"); // 이름 입력 조회
        await user.clear(title); // 기존 이름 제거
        await user.type(title, "새 이름"); // 새 이름 입력
        await user.click(screen.getByRole("button", { name: "이름 저장" })); // 이름 저장
        expect(screen.getByText("새 이름")).toBeVisible(); // 변경 이름 확인
        await user.click(screen.getByRole("button", { name: "새 이름 보관" })); // 대화 보관
        expect(screen.getByText("보관한 대화")).toBeVisible(); // 보관 구역 확인
        await user.click(screen.getByRole("button", { name: "새 이름 복구" })); // 대화 복구
        expect(screen.queryByText("보관한 대화")).toBeNull(); // 보관 구역 제거 확인
    }); // 검증 종료

    it("대화 삭제 확인에서 메시지 수를 표시하고 연결 데이터를 제거한다", async () => // 대화 삭제 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const state = createInitialState(); // 초기 상태 준비
        const expectedMessages = state.messages.filter((message) => message.conversationId === state.conversations[0].id).length; // 연결 메시지 수 계산
        renderWithApp(<><LibraryScreen /><ConversationProbe /></>, state); // 보관함 렌더
        await user.click(screen.getByRole("tab", { name: "진행 중인 대화" })); // 대화 탭 이동
        await user.click(screen.getByRole("button", { name: "새벽 도서관의 리안 삭제" })); // 삭제 시작
        expect(screen.getByRole("dialog", { name: "대화 삭제" })).toHaveTextContent(`메시지 ${expectedMessages}개`); // 삭제 안내 확인
        await user.click(screen.getByRole("button", { name: "대화 삭제 확인" })); // 삭제 승인
        expect(screen.getByLabelText("대화 개수")).toHaveTextContent(`${state.conversations.length - 1}:${state.messages.length - expectedMessages}`); // 연결 데이터 제거 확인
    }); // 검증 종료
}); // 묶음 종료
