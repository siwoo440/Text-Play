import { render, screen, within } from "@testing-library/react"; // 렌더 도구
import userEvent, { type UserEvent } from "@testing-library/user-event"; // 사용자 동작
import { beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { DesktopApp } from "@/desktop/DesktopApp"; // 데스크톱 앱
import { createTextPlayState } from "@/features/text-play/core/engine"; // 초기 게임 상태 생성기
import type { TextPlaySaveSlot, TextPlaySlotId, TextPlayState } from "@/features/text-play/core/types"; // 저장 도메인 계약
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 메모리 저장소
import type { TextPlaySaveRepository } from "@/features/text-play/storage/save-repository"; // 저장소 계약
import type { OllamaClient } from "@/lib/adapters/ollama-client"; // 올라마 통신 계약

class CorruptLoadRepository implements TextPlaySaveRepository // 손상 저장소
{ // 클래스 시작
    public async list(_packageId: string): Promise<TextPlaySaveSlot[]> // 슬롯 목록
    { // 함수 시작
        void _packageId; // 미사용 값 표시
        return []; // 빈 목록 반환
    } // 함수 종료

    public async load(_packageId: string, _slotId: TextPlaySlotId): Promise<TextPlaySaveSlot | null> // 손상 슬롯 읽기
    { // 함수 시작
        void _packageId; // 미사용 작품 표시
        void _slotId; // 미사용 슬롯 표시
        throw new Error("손상 저장"); // 손상 오류
    } // 함수 종료

    public async save(_slotId: TextPlaySlotId, _state: TextPlayState, _summary: string): Promise<void> // 슬롯 저장
    { // 함수 시작
        void _slotId; // 미사용 슬롯 표시
        void _state; // 미사용 상태 표시
        void _summary; // 미사용 요약 표시
    } // 함수 종료

    public async remove(_packageId: string, _slotId: TextPlaySlotId): Promise<void> // 슬롯 삭제
    { // 함수 시작
        void _packageId; // 미사용 작품 표시
        void _slotId; // 미사용 슬롯 표시
    } // 함수 종료
} // 클래스 종료

async function openTextPlay(user: UserEvent): Promise<void> // Text-Play 열기 도우미
{ // 함수 시작
    await user.click(within(await screen.findByRole("navigation", { name: "주요 메뉴" })).getByRole("link", { name: "Text-Play" })); // 사이드바 Text-Play 선택
} // 함수 종료

describe("데스크톱 앱 틀", () => // 데스크톱 틀 묶음
{ // 묶음 시작
    beforeEach(() => // 테스트 준비
    { // 준비 시작
        window.history.replaceState(null, "", "/"); // 주소 초기화
        window.localStorage.clear(); // ChatBot 저장소 초기화
    }); // 준비 종료

    it("첫 화면에 왼쪽 사이드바와 ChatBot 메인을 표시한다", async () => // 첫 화면 검증
    { // 테스트 시작
        render(<DesktopApp createRepository={() => new MemoryTextPlaySaveRepository()} />); // 데스크톱 앱 렌더
        const navigation = await screen.findByRole("navigation", { name: "주요 메뉴" }); // 주요 메뉴 조회
        expect(within(navigation).getAllByRole("link").map((link) => link.textContent)).toEqual(["메인", "탐색", "내 작품", "Text-Play"]); // 메뉴 순서 확인
        expect(within(navigation).getByRole("link", { name: "메인" })).toHaveAttribute("aria-current", "page"); // 현재 메뉴 확인
        expect(await screen.findByRole("heading", { level: 1, name: /오늘,/u })).toBeInTheDocument(); // ChatBot 메인 확인
        expect(within(screen.getByRole("complementary", { name: "진행 중인 대화방" })).getByText("새벽 도서관의 리안")).toBeInTheDocument(); // 최근 대화 확인
        expect(screen.getByRole("navigation", { name: "프로그램 메뉴" })).toBeInTheDocument(); // 프로그램 메뉴 확인
    }); // 테스트 종료

    it("사이드바로 ChatBot 화면과 Text-Play를 오간다", async () => // 사이드바 이동 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        render(<DesktopApp createRepository={() => new MemoryTextPlaySaveRepository()} />); // 데스크톱 앱 렌더
        const navigation = await screen.findByRole("navigation", { name: "주요 메뉴" }); // 주요 메뉴 조회
        await user.click(within(navigation).getByRole("link", { name: "탐색" })); // 탐색 이동
        expect(await screen.findByRole("heading", { level: 1, name: /새로운 세계/u })).toBeInTheDocument(); // 탐색 화면 확인
        await user.click(within(navigation).getByRole("link", { name: "내 작품" })); // 보관함 이동
        expect(await screen.findByRole("heading", { level: 1, name: "내 작품과 보관함" })).toBeInTheDocument(); // 보관함 확인
        const programMenu = screen.getByRole("navigation", { name: "프로그램 메뉴" }); // 프로그램 메뉴 조회
        await user.click(within(programMenu).getByRole("link", { name: "설정" })); // 설정 이동
        expect(await screen.findByRole("heading", { level: 1, name: "프로필 관리" })).toBeInTheDocument(); // 설정 확인
        await user.click(within(programMenu).getByRole("link", { name: "고객 지원" })); // 지원 이동
        expect(await screen.findByRole("heading", { level: 1, name: "고객 지원" })).toBeInTheDocument(); // 지원 확인
        await openTextPlay(user); // Text-Play 이동
        expect(await screen.findByRole("button", { name: "새 게임" })).toBeInTheDocument(); // Text-Play 홈 확인
        expect(within(navigation).getByRole("link", { name: "Text-Play" })).toHaveAttribute("aria-current", "page"); // 현재 메뉴 확인
    }); // 테스트 종료

    it("상단 바 화살표는 사이드바 메뉴 순서대로 이전·다음 메뉴로 이동한다", async () => // 화살표 이동 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        render(<DesktopApp createRepository={() => new MemoryTextPlaySaveRepository()} />); // 데스크톱 앱 렌더
        expect(await screen.findByRole("button", { name: "이전 메뉴" })).toBeDisabled(); // 메인 이전 비활성 확인
        await user.click(screen.getByRole("button", { name: "다음 메뉴: 탐색" })); // 오른쪽 화살표 선택
        expect(await screen.findByRole("heading", { level: 1, name: /새로운 세계/u })).toBeInTheDocument(); // 탐색 이동 확인
        await user.click(screen.getByRole("button", { name: "다음 메뉴: 내 작품" })); // 오른쪽 화살표 선택
        expect(await screen.findByRole("heading", { level: 1, name: "내 작품과 보관함" })).toBeInTheDocument(); // 보관함 이동 확인
        await user.click(screen.getByRole("button", { name: "이전 메뉴: 탐색" })); // 왼쪽 화살표 선택
        expect(await screen.findByRole("heading", { level: 1, name: /새로운 세계/u })).toBeInTheDocument(); // 탐색 복귀 확인
        await user.click(screen.getByRole("button", { name: "이전 메뉴: 메인" })); // 왼쪽 화살표 선택
        expect(await screen.findByRole("heading", { level: 1, name: /오늘,/u })).toBeInTheDocument(); // 메인 복귀 확인
        expect(screen.getByRole("button", { name: "이전 메뉴" })).toBeDisabled(); // 처음 메뉴 정지 확인
    }); // 테스트 종료

    it("메뉴에 없는 화면은 소속 메뉴를 사이드바에 표시하고 그 기준으로 이동한다", async () => // 소속 메뉴 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        window.history.replaceState(null, "", "/#/characters/harin"); // 하린 상세 주소
        render(<DesktopApp createRepository={() => new MemoryTextPlaySaveRepository()} />); // 데스크톱 앱 렌더
        const navigation = await screen.findByRole("navigation", { name: "주요 메뉴" }); // 주요 메뉴 조회
        expect(within(navigation).getByRole("link", { name: "메인" })).toHaveAttribute("aria-current", "true"); // 소속 메뉴 표시 확인
        expect(screen.getByRole("button", { name: "이전 메뉴" })).toBeDisabled(); // 메인 소속 이전 비활성 확인
        await user.click(screen.getByRole("button", { name: "다음 메뉴: 탐색" })); // 오른쪽 화살표 선택
        expect(await screen.findByRole("heading", { level: 1, name: /새로운 세계/u })).toBeInTheDocument(); // 탐색 이동 확인
    }); // 테스트 종료

    it("마지막 메뉴에서는 다음 메뉴 화살표를 비활성화한다", async () => // 마지막 메뉴 검증
    { // 테스트 시작
        window.history.replaceState(null, "", "/#/support"); // 고객 지원 주소
        render(<DesktopApp createRepository={() => new MemoryTextPlaySaveRepository()} />); // 데스크톱 앱 렌더
        expect(await screen.findByRole("button", { name: "다음 메뉴" })).toBeDisabled(); // 다음 비활성 확인
        expect(screen.getByRole("button", { name: "이전 메뉴: 설정" })).toBeEnabled(); // 이전 활성 확인
    }); // 테스트 종료

    it("ChatBot 대화방 아래에 Text-Play 대화방을 따로 두고 저장 기록을 최신 순으로 보여 준다", async () => // Text-Play 대화방 검증
    { // 테스트 시작
        const repository = new MemoryTextPlaySaveRepository(); // 메모리 저장소
        const base = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-10-01T05:00:00.000Z"); // 기준 게임 상태
        await repository.save("auto", { ...base, sceneId: "moonlit-hall", playTimeSeconds: 125 }, "moonlit-hall"); // 자동 저장 준비
        await repository.save("manual-2", { ...base, sceneId: "sealed-study", playTimeSeconds: 300, updatedAt: "2026-10-01T06:00:00.000Z" }, "sealed-study"); // 수동 저장 준비
        render(<DesktopApp createRepository={() => repository} />); // 데스크톱 앱 렌더
        const chatRooms = await screen.findByRole("complementary", { name: "진행 중인 대화방" }); // ChatBot 대화방
        const playRooms = screen.getByRole("region", { name: "Text-Play 대화방" }); // Text-Play 대화방
        expect(chatRooms.compareDocumentPosition(playRooms) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // 대화방 아래 배치 확인
        const records = await within(playRooms).findAllByRole("link", { name: /이어하기$/u }); // 기록 링크 조회
        expect(records.map((record) => record.getAttribute("aria-label"))).toEqual(["달빛 숲의 기록 수동 저장 2 이어하기", "달빛 숲의 기록 자동 저장 이어하기"]); // 최신 순서 확인
        expect(within(playRooms).getByText("수동 저장 2 · 봉인된 서재 · 5분 0초")).toBeInTheDocument(); // 수동 저장 요약 확인
        expect(within(playRooms).getByText("자동 저장 · 폐허 회랑 · 2분 5초")).toBeInTheDocument(); // 자동 저장 요약 확인
    }); // 테스트 종료

    it("Text-Play 대화방 기록을 누르면 그 저장 슬롯에서 이어한다", async () => // 기록 이어하기 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        const repository = new MemoryTextPlaySaveRepository(); // 메모리 저장소
        const base = createTextPlayState(DEMO_TEXT_PLAY_PACKAGE, "2026-10-01T05:00:00.000Z"); // 기준 게임 상태
        await repository.save("auto", { ...base, sceneId: "moonlit-hall" }, "moonlit-hall"); // 자동 저장 준비
        await repository.save("manual-2", { ...base, sceneId: "sealed-study", updatedAt: "2026-10-01T06:00:00.000Z" }, "sealed-study"); // 수동 저장 준비
        render(<DesktopApp createRepository={() => repository} />); // 데스크톱 앱 렌더
        await user.click(await screen.findByRole("link", { name: "달빛 숲의 기록 수동 저장 2 이어하기" })); // 수동 저장 기록 선택
        expect(await screen.findByRole("heading", { name: "봉인된 서재" })).toBeInTheDocument(); // 수동 저장 장면 확인
        expect(window.location.hash).toBe("#/text-play/play?mode=resume&slot=manual-2"); // 이어하기 주소 확인
    }); // 테스트 종료

    it("Text-Play 기록이 없으면 안내를 보여 주고 플레이 후 돌아오면 기록을 반영한다", async () => // 기록 동기화 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        render(<DesktopApp createRepository={() => new MemoryTextPlaySaveRepository()} />); // 데스크톱 앱 렌더
        const emptyRooms = await screen.findByRole("region", { name: "Text-Play 대화방" }); // Text-Play 대화방
        expect(await within(emptyRooms).findByText("아직 Text-Play 기록이 없습니다.")).toBeInTheDocument(); // 빈 안내 확인
        await user.click(within(emptyRooms).getByRole("link", { name: "＋ Text-Play 작품 고르기" })); // 작품 고르기 이동
        await user.click(await screen.findByRole("button", { name: "새 게임" })); // 새 게임 시작
        await user.click(await screen.findByRole("button", { name: "AI 추천 답안" })); // 추천 펼치기
        await user.click(screen.getByRole("button", { name: "달빛 등불을 든다" })); // 선택지 진행
        expect(await screen.findByRole("heading", { name: "폐허 회랑" })).toBeInTheDocument(); // 진행 장면 확인
        await user.click(screen.getByRole("button", { name: "메인으로 돌아가기: 달빛 숲의 기록" })); // Text-Play 홈 복귀
        const playRooms = await screen.findByRole("region", { name: "Text-Play 대화방" }); // 다시 표시된 대화방
        expect(await within(playRooms).findByRole("link", { name: "달빛 숲의 기록 자동 저장 이어하기" })).toBeInTheDocument(); // 자동 저장 기록 반영 확인
        expect(within(playRooms).getByText(/^자동 저장 · 폐허 회랑 · /u)).toBeInTheDocument(); // 장면 요약 확인
    }); // 테스트 종료

    it("사이드바 ChatBot 대화방은 ChatBot과 같이 보고 있는 대화를 강조하고 검색한다", async () => // ChatBot 대화방 기능 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        window.history.replaceState(null, "", "/#/chat/rian?conversation=conversation-rian&version=conversation-rian-version-1"); // 리안 대화 주소
        render(<DesktopApp createRepository={() => new MemoryTextPlaySaveRepository()} />); // 데스크톱 앱 렌더
        const chatRooms = await screen.findByRole("complementary", { name: "진행 중인 대화방" }); // ChatBot 대화방
        expect(within(chatRooms).getByRole("link", { name: /새벽 도서관의 리안/u })).toHaveAttribute("aria-current", "page"); // 보고 있는 대화 강조 확인
        await user.type(within(chatRooms).getByRole("searchbox", { name: "대화방 검색" }), "세라"); // 대화방 검색
        expect(within(chatRooms).queryByRole("link", { name: /새벽 도서관의 리안/u })).not.toBeInTheDocument(); // 검색 제외 확인
        expect(within(chatRooms).getByRole("link", { name: /비 오는 교실, 세라/u })).toBeInTheDocument(); // 검색 결과 확인
    }); // 테스트 종료

    it("ChatBot 대화방 영역에서 ChatBot 기록 가져오기로 데이터 관리를 연다", async () => // 기록 가져오기 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        render(<DesktopApp createRepository={() => new MemoryTextPlaySaveRepository()} />); // 데스크톱 앱 렌더
        await user.click(await screen.findByRole("link", { name: "ChatBot 기록 가져오기" })); // 가져오기 링크 선택
        expect(await screen.findByRole("heading", { name: "데이터 관리" })).toBeInTheDocument(); // 데이터 관리 확인
        expect(screen.getByLabelText("JSON 파일 선택")).toHaveAttribute("type", "file"); // 가져오기 파일 선택 확인
        expect(window.location.hash).toBe("#/settings/privacy#data"); // 데이터 관리 주소 확인
    }); // 테스트 종료

    it("상단 바에서 사용자 패널을 열고 Esc로 닫는다", async () => // 사용자 패널 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        render(<DesktopApp createRepository={() => new MemoryTextPlaySaveRepository()} />); // 데스크톱 앱 렌더
        const toggle = await screen.findByRole("button", { name: "사용자 패널 열기와 닫기" }); // 패널 버튼 조회
        expect(toggle).toHaveAttribute("aria-expanded", "false"); // 닫힘 확인
        await user.click(toggle); // 패널 열기
        const panel = screen.getByRole("complementary", { name: "사용자 정보와 설정" }); // 사용자 패널 조회
        expect(within(panel).getByText("1,240")).toBeInTheDocument(); // 토큰 잔액 확인
        expect(within(panel).getByRole("navigation", { name: "사용자 메뉴" })).toBeInTheDocument(); // 사용자 메뉴 확인
        await user.keyboard("{Escape}"); // 패널 닫기
        expect(screen.queryByRole("complementary", { name: "사용자 정보와 설정" })).not.toBeInTheDocument(); // 닫힘 확인
        expect(toggle).toHaveFocus(); // 초점 복귀 확인
    }); // 테스트 종료

    it("캐릭터와 새 대화를 시작하고 임시 응답을 받는다", async () => // 대화 흐름 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        window.history.replaceState(null, "", "/#/characters/harin"); // 하린 상세 주소
        render(<DesktopApp createRepository={() => new MemoryTextPlaySaveRepository()} />); // 데스크톱 앱 렌더
        await user.click(await screen.findByRole("button", { name: "히어로 새 대화 시작" })); // 새 대화 시작
        await user.type(await screen.findByLabelText("메시지"), "안녕"); // 메시지 입력
        await user.click(screen.getByRole("button", { name: "전송" })); // 메시지 전송
        expect(await screen.findByText(/네 이야기를 더 듣고 싶어|그 마음을 기억해 둘게|네가 와서 분위기가 달라졌어/u, {}, { timeout: 5_000 })).toBeInTheDocument(); // 임시 응답 확인
        expect(window.location.hash).toMatch(/^#\/chat\/harin\?conversation=/u); // 대화 주소 확인
    }); // 테스트 종료
}); // 묶음 종료

describe("데스크톱 앱", () => // 데스크톱 앱 묶음
{ // 묶음 시작
    beforeEach(() => // 테스트 준비
    { // 준비 시작
        window.history.replaceState(null, "", "/"); // 주소 초기화
        window.localStorage.clear(); // ChatBot 저장소 초기화
    }); // 준비 종료

    it("손상 저장이 있어도 새 게임 진입을 제공한다", async () => // 손상 저장 검증
    { // 테스트 시작
        render(<DesktopApp createRepository={() => new CorruptLoadRepository()} />); // 손상 저장 앱 렌더
        await openTextPlay(userEvent.setup()); // Text-Play 열기
        expect(await screen.findByRole("button", { name: "새 게임" })).toBeInTheDocument(); // 새 게임 표시 확인
        expect(screen.getByText("이어할 저장 없음")).toBeInTheDocument(); // 이어하기 비활성 확인
    }); // 테스트 종료

    it("임시 인공지능으로 네트워크 없이 플레이하고 같은 저장소로 홈에 복귀한다", async () => // 오프라인 흐름 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        const repository = new MemoryTextPlaySaveRepository(); // 메모리 저장소 생성
        const createRepository = vi.fn(() => repository); // 저장소 생성 기록
        const fetchSpy = vi.spyOn(globalThis, "fetch"); // 네트워크 호출 감시
        render(<DesktopApp createRepository={createRepository} />); // 데스크톱 앱 렌더
        await openTextPlay(user); // Text-Play 열기
        await user.click(await screen.findByRole("button", { name: "새 게임" })); // 새 게임 진입
        expect(screen.getByLabelText("AI 연결")).toHaveTextContent("임시 인공지능"); // 임시 인공지능 표시 확인
        await user.type(screen.getByRole("textbox", { name: "행동 직접 입력" }), "문양을 살핀다"); // 자유 행동 입력
        await user.click(screen.getByRole("button", { name: "전송" })); // 자유 행동 전송
        expect(await screen.findByText("그 선택을 기억할게.")).toBeInTheDocument(); // Mock 응답 완료 확인
        expect(fetchSpy).not.toHaveBeenCalled(); // 네트워크 미사용 확인
        await user.click(screen.getByRole("button", { name: "메인으로 돌아가기: 달빛 숲의 기록" })); // 홈 복귀
        expect(await screen.findByRole("button", { name: "새 게임" })).toBeInTheDocument(); // 홈 화면 확인
        expect(createRepository).toHaveBeenCalledOnce(); // 저장소 단일 생성 확인
        fetchSpy.mockRestore(); // 네트워크 감시 복원
    }); // 테스트 종료

    it("설정에서 선택한 올라마 모델을 현재 게임의 다음 응답부터 사용한다", async () => // 실행 중 전환 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        const localAIClient: OllamaClient = { // 로컬 통신기 대역
            listModels: async () => [{ name: "qwen3:8b", size: 5_000_000_000, modifiedAt: "2026-09-29T00:00:00Z" }], // 설치 모델 반환
            listRunningModels: async () => [], // 실행 모델 없음 반환
            streamChat: async function* () // 대화 스트림 반환
            { // 함수 시작
                yield JSON.stringify({ narration: "로컬 모델이 달빛 문을 열었다.", dialogue: null, proposedActions: [] }); // 구조화 응답 반환
            }, // 함수 종료
        }; // 통신기 종료
        render(<DesktopApp createRepository={() => new MemoryTextPlaySaveRepository()} createLocalAIClient={() => localAIClient} />); // 데스크톱 앱 렌더
        await openTextPlay(user); // Text-Play 열기
        await user.click(await screen.findByRole("button", { name: "새 게임" })); // 새 게임 진입
        await user.click(screen.getByRole("button", { name: "게임 설정 열기" })); // 설정 열기
        await user.click(screen.getByRole("button", { name: "설치 모델 검색" })); // 모델 검색 실행
        await user.selectOptions(await screen.findByLabelText("로컬 모델"), "qwen3:8b"); // 로컬 모델 선택
        await user.selectOptions(screen.getByLabelText("사용할 챗봇"), "ollama"); // 올라마 공급자 선택
        expect(screen.getByLabelText("AI 연결")).toHaveTextContent("로컬 · qwen3:8b"); // 실행 공급자 표시 확인
        await user.click(screen.getByRole("button", { name: "닫기" })); // 설정 닫기
        await user.type(screen.getByRole("textbox", { name: "행동 직접 입력" }), "달빛 문을 연다"); // 자유 행동 입력
        await user.click(screen.getByRole("button", { name: "전송" })); // 자유 행동 전송
        expect(await screen.findByText("로컬 모델이 달빛 문을 열었다.")).toBeInTheDocument(); // 로컬 응답 표시 확인
    }); // 테스트 종료
}); // 묶음 종료
