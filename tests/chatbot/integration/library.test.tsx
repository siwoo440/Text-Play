import { screen } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 도구
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { CharacterDetail } from "@chatbot/features/character/CharacterDetail"; // 캐릭터 상세
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { LibraryScreen } from "@chatbot/features/library/LibraryScreen"; // 보관함 대상
import { createConversationExport } from "@chatbot/features/conversation/conversation-export"; // 대화 내보내기
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    useRouter: () => ({ push: () => undefined }), // 이동 함수 제공
})); // 대체 종료

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
        await user.click(screen.getByRole("button", { name: "새벽 도서관의 리안 보관함에 추가" })); // 보관 추가
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

    it("대화 카드가 마지막 선택 버전 주소와 요약을 사용한다", async () => // 버전 카드 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const state = createInitialState(); // 초기 상태 생성
        const conversation = state.conversations[0]; // 기준 대화 조회
        const original = state.conversationVersions[0]; // 원본 버전 조회
        const versionId = `${conversation.id}-version-2`; // 수정 버전 식별자
        state.conversationVersions.push({ ...original, id: versionId, parentVersionId: original.id, forkRootVersionId: original.id, ordinal: 2, lastMessage: "수정 버전의 최근 대화", updatedAt: "2026-09-29T12:00:00.000Z" }); // 수정 버전 추가
        conversation.currentVersionId = versionId; // 현재 버전 변경
        renderWithApp(<LibraryScreen />, state); // 보관함 렌더
        await user.click(screen.getByRole("tab", { name: "진행 중인 대화" })); // 대화 탭 이동
        const link = screen.getByRole("link", { name: /새벽 도서관의 리안/ }); // 대화 링크 조회
        expect(link).toHaveAttribute("href", `/chat/rian?conversation=${conversation.id}&version=${versionId}`); // 버전 주소 확인
        expect(link).toHaveTextContent("수정 버전의 최근 대화"); // 버전 요약 확인
    }); // 검증 종료

    it("JSON 대화 파일을 안전하게 가져오고 잘못된 파일은 상태를 유지한다", async () => // 파일 가져오기 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const state = createInitialState(); // 초기 상태 생성
        const exported = createConversationExport(state, state.conversations[0].id); // 정상 파일 생성
        renderWithApp(<><LibraryScreen /><ConversationProbe /></>, state); // 보관함 렌더
        await user.click(screen.getByRole("tab", { name: "진행 중인 대화" })); // 대화 탭 이동
        const input = screen.getByLabelText("대화 가져오기"); // 파일 입력 조회
        await user.upload(input, new File([JSON.stringify(exported)], "conversation.json", { type: "application/json" })); // 정상 파일 선택
        expect(await screen.findByRole("status")).toHaveTextContent("가져왔습니다"); // 성공 안내 확인
        expect(screen.getByLabelText("대화 개수")).toHaveTextContent(`${state.conversations.length + 1}:`); // 대화 추가 확인
        await user.upload(input, new File(["{not-json"], "broken.json", { type: "application/json" })); // 오류 파일 선택
        expect(await screen.findByRole("status")).toHaveTextContent("가져오지 못했습니다"); // 실패 안내 확인
        expect(screen.getByLabelText("대화 개수")).toHaveTextContent(`${state.conversations.length + 1}:`); // 기존 상태 유지 확인
    }); // 검증 종료

    it("같은 캐릭터의 여러 대화에 제목과 시작 설정과 최근 시각을 구분해 표시한다", async () => // 다중 대화 표시 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const state = createInitialState(); // 초기 상태 준비
        const base = state.conversations[0]; // 기준 대화 조회
        const baseVersion = state.conversationVersions.find((version) => version.id === base.currentVersionId)!; // 기준 버전 조회
        state.conversations.push({ ...base, id: "conversation-harin-first", characterId: "harin", title: "하린과 비 오는 저녁", currentVersionId: "conversation-harin-first-version-1", startSettings: { ...base.startSettings, presetId: "after-work-comfort" }, updatedAt: "2026-09-28T09:00:00.000Z" }); // 첫 대화 추가
        state.conversationVersions.push({ ...baseVersion, id: "conversation-harin-first-version-1", conversationId: "conversation-harin-first", updatedAt: "2026-09-28T09:00:00.000Z" }); // 첫 버전 추가
        state.conversations.push({ ...base, id: "conversation-harin-second", characterId: "harin", title: "하린과 마감 뒤", currentVersionId: "conversation-harin-second-version-1", startSettings: { ...base.startSettings, presetId: "closing-time" }, updatedAt: "2026-09-29T10:30:00.000Z" }); // 둘째 대화 추가
        state.conversationVersions.push({ ...baseVersion, id: "conversation-harin-second-version-1", conversationId: "conversation-harin-second", updatedAt: "2026-09-29T10:30:00.000Z" }); // 둘째 버전 추가
        renderWithApp(<LibraryScreen />, state); // 보관함 렌더
        await user.click(screen.getByRole("tab", { name: "진행 중인 대화" })); // 대화 탭 이동
        expect(screen.getByText("하린과 비 오는 저녁")).toBeVisible(); // 첫 제목 확인
        expect(screen.getByText("하린과 마감 뒤")).toBeVisible(); // 둘째 제목 확인
        expect(screen.getByText(/시작: 퇴근 후의 위로/)).toBeVisible(); // 첫 프리셋 확인
        expect(screen.getByText(/시작: 마감 뒤의 한 잔/)).toBeVisible(); // 둘째 프리셋 확인
        expect(screen.getByText(/2026\. 9\. 29/)).toBeVisible(); // 최근 시각 확인
    }); // 검증 종료
}); // 묶음 종료
