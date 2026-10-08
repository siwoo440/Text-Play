import { render, screen, waitFor, within } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { useState } from "react"; // 리액트 상태
import { renderToStaticMarkup } from "react-dom/server"; // 정적 렌더
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import ErrorPage from "@chatbot/app/error"; // 화면 오류 경계
import GlobalError from "@chatbot/app/global-error"; // 최상위 오류 경계
import NotFound from "@chatbot/app/not-found"; // 찾을 수 없음 화면
import { AppShell } from "@chatbot/components/app-shell/AppShell"; // 앱 셸
import { CharacterDetail } from "@chatbot/features/character/CharacterDetail"; // 캐릭터 상세
import { ChatScreen } from "@chatbot/features/chat/ChatScreen"; // 채팅 화면
import { AppProvider, useAppStore, type StateRepository } from "@chatbot/features/core/AppProvider"; // 앱 공급자
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { DataManagement } from "@chatbot/features/settings/DataManagement"; // 데이터 관리
import { ImportValidationError, isStorageQuotaError, LocalStorageGateway, StorageWriteError } from "@chatbot/lib/repositories/local-storage-gateway"; // 로컬 저장소
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더

const downloadJsonFile = vi.fn(); // 다운로드 대역

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    useRouter: () => ({ push: () => undefined, replace: () => undefined }), // 이동 함수 제공
    usePathname: () => "/", // 현재 경로 제공
    useSearchParams: () => new URLSearchParams(), // 검색 매개변수 제공
})); // 대체 종료

vi.mock("@chatbot/features/settings/data-download", () => // 다운로드 대체
({ // 대체 시작
    downloadJsonFile: (...args: unknown[]) => downloadJsonFile(...args), // 다운로드 대역 연결
})); // 대체 종료

function quotaError(): StorageWriteError // 용량 초과 오류 생성
{ // 함수 시작
    return new StorageWriteError(new DOMException("저장공간 부족", "QuotaExceededError")); // 브라우저 용량 오류 감싸기
} // 함수 종료

function CommitProbe() // 원자 저장 확인 요소
{ // 함수 시작
    const { state, storageError, commitState } = useAppStore(); // 앱 상태 조회
    const [result, setResult] = useState("대기"); // 저장 결과 상태
    return ( // 요소 반환
        <div> {/* 확인 영역 */}
            <button type="button" onClick={() => setResult(String(commitState({ ...state, profile: { ...state.profile, nickname: "변경 이름" } })))}>저장 실행</button> {/* 저장 버튼 */}
            <output aria-label="저장 결과">{result}</output> {/* 결과 표시 */}
            {storageError === null ? null : <p role="alert">{storageError}</p>} {/* 오류 표시 */}
        </div> // 확인 영역 종료
    ); // 반환 종료
} // 함수 종료

describe("라우트 오류 화면", () => // 라우트 묶음
{ // 묶음 시작
    it("없는 페이지에서 앱 디자인의 404 안내와 이동 링크를 보여 준다", () => // 404 검증
    { // 검증 시작
        render(<NotFound />); // 404 화면 렌더
        expect(screen.getByRole("heading", { level: 1, name: "페이지를 찾을 수 없습니다" })).toBeInTheDocument(); // 제목 확인
        expect(screen.getByRole("link", { name: "메인으로 이동" })).toHaveAttribute("href", "/"); // 탐색 링크 확인
        expect(screen.getByRole("link", { name: "보관함 열기" })).toHaveAttribute("href", "/library"); // 보관함 링크 확인
    }); // 검증 종료

    it("화면 오류에서 경고를 알리고 다시 시도를 실행한다", async () => // 오류 경계 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const retry = vi.fn(); // 재시도 대역
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined); // 오류 기록 숨김
        render(<ErrorPage error={new Error("렌더 실패")} retry={retry} />); // 오류 화면 렌더
        expect(screen.getByRole("alert")).toHaveTextContent("화면을 표시하지 못했습니다"); // 경고 확인
        await user.click(screen.getByRole("button", { name: "다시 시도" })); // 재시도 선택
        expect(retry).toHaveBeenCalledTimes(1); // 재시도 호출 확인
        expect(consoleError).toHaveBeenCalled(); // 오류 기록 확인
        consoleError.mockRestore(); // 기록 복원
    }); // 검증 종료

    it("최상위 오류에서 자체 문서와 전체 새로고침 링크를 제공한다", () => // 전역 오류 검증
    { // 검증 시작
        const markup = renderToStaticMarkup(<GlobalError error={new Error("레이아웃 실패")} retry={() => undefined} />); // 정적 문서 생성
        expect(markup).toContain("<html lang=\"ko\">"); // 자체 문서 확인
        expect(markup).toContain("앱을 불러오지 못했습니다"); // 제목 확인
        expect(markup).toContain("href=\"/\""); // 처음 화면 링크 확인
        expect(markup).toContain("color-scheme:light"); // 서버에서는 밝게
    }); // 검증 종료

    it("최상위 오류 화면도 저장된 다크 모드를 따른다", () => // 전역 오류 다크 검증
    { // 검증 시작
        localStorage.setItem("mateverse:theme", "dark"); // 다크 저장
        const host = document.createElement("div"); // 그릴 자리
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined); // 문서 안 문서 경고와 오류 기록 숨김
        const { unmount } = render(<GlobalError error={new Error("레이아웃 실패")} retry={() => undefined} />, { container: host }); // 브라우저 렌더
        const card = host.querySelector("main"); // 안내 카드
        expect(card).toHaveStyle({ background: "#1b1825" }); // 어두운 카드
        expect(host.querySelector("h1")).toHaveTextContent("앱을 불러오지 못했습니다"); // 제목 유지
        unmount(); // 정리
        consoleError.mockRestore(); // 경고 복원
        localStorage.removeItem("mateverse:theme"); // 저장 지우기
    }); // 검증 종료
}); // 묶음 종료

describe("없는 캐릭터 주소", () => // 부재 주소 묶음
{ // 묶음 시작
    it("대화 화면이 앱을 멈추지 않고 캐릭터 부재 안내를 보여 준다", () => // 대화 부재 검증
    { // 검증 시작
        renderWithApp(<ChatScreen characterId="unknown-character" />); // 없는 캐릭터 대화 렌더
        expect(screen.getByRole("heading", { level: 1, name: "대화할 캐릭터를 찾을 수 없습니다" })).toBeInTheDocument(); // 안내 제목 확인
        expect(screen.getByRole("link", { name: "메인으로 이동" })).toHaveAttribute("href", "/"); // 탐색 링크 확인
    }); // 검증 종료

    it("상세 화면도 같은 안내 화면을 사용한다", () => // 상세 부재 검증
    { // 검증 시작
        renderWithApp(<CharacterDetail characterId="unknown-character" />); // 없는 캐릭터 상세 렌더
        expect(screen.getByRole("heading", { level: 1, name: "캐릭터를 찾을 수 없습니다" })).toBeInTheDocument(); // 안내 제목 확인
        expect(screen.getByRole("link", { name: "보관함 열기" })).toHaveAttribute("href", "/library"); // 보관함 링크 확인
    }); // 검증 종료
}); // 묶음 종료

describe("저장소 상태 안내", () => // 저장소 묶음
{ // 묶음 시작
    beforeEach(() => // 환경 초기화
    { // 초기화 시작
        window.localStorage.clear(); // 저장공간 비우기
    }); // 초기화 종료

    it("손상 데이터를 복구했다는 안내와 데이터 관리 링크를 보여 주고 닫을 수 있다", async () => // 복구 안내 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        window.localStorage.setItem("mateverse:v1:state", "{손상된 JSON"); // 손상 데이터 저장
        render(<AppProvider><AppShell><main>본문</main></AppShell></AppProvider>); // 기본 저장소로 렌더
        const notice = await screen.findByText("손상된 저장 데이터를 백업하고 초기 상태로 복구했습니다."); // 복구 안내 대기
        const container = notice.closest("[role=\"status\"]") as HTMLElement; // 안내 영역 조회
        expect(within(container).getByRole("link", { name: "데이터 관리 열기" })).toHaveAttribute("href", "/settings/privacy#data"); // 관리 링크 확인
        await user.click(within(container).getByRole("button", { name: "닫기" })); // 안내 닫기
        expect(screen.queryByText("손상된 저장 데이터를 백업하고 초기 상태로 복구했습니다.")).not.toBeInTheDocument(); // 닫힘 확인
    }); // 검증 종료

    it("읽기에 실패하면 기본 상태로 시작하고 기존 데이터를 덮어쓰지 않는다", async () => // 읽기 실패 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        const saved: AppState[] = []; // 저장 기록
        const repository: StateRepository = // 실패 저장소
        { // 저장소 시작
            load() // 읽기 실패 함수
            { // 함수 시작
                throw new Error("저장소 접근 거부"); // 읽기 오류 발생
            }, // 함수 종료
            save: (state) => saved.push(state), // 저장 기록
        }; // 저장소 종료
        render(<AppProvider repository={repository}><CommitProbe /></AppProvider>); // 공급자 렌더
        expect(await screen.findByRole("alert")).toHaveTextContent("저장된 데이터를 읽지 못해 기본 상태로 시작했습니다."); // 차단 안내 확인
        await user.click(screen.getByRole("button", { name: "저장 실행" })); // 저장 시도
        expect(screen.getByLabelText("저장 결과")).toHaveTextContent("false"); // 저장 거부 확인
        expect(saved).toHaveLength(0); // 덮어쓰기 부재 확인
    }); // 검증 종료

    it("저장공간이 가득 차면 원인과 정리 방법을 안내한다", async () => // 용량 초과 검증
    { // 검증 시작
        const repository: StateRepository = // 용량 초과 저장소
        { // 저장소 시작
            load: () => createInitialState(), // 초기 상태 반환
            save() // 저장 실패 함수
            { // 함수 시작
                throw quotaError(); // 용량 초과 발생
            }, // 함수 종료
        }; // 저장소 종료
        render(<AppProvider repository={repository}><CommitProbe /></AppProvider>); // 공급자 렌더
        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("브라우저 저장공간이 가득 차 최근 변경 내용을 저장하지 못했습니다.")); // 원인 안내 확인
        expect(screen.getByRole("alert")).toHaveTextContent("JSON으로 내보낸 뒤 오래된 대화를 정리해 주세요."); // 정리 방법 확인
    }); // 검증 종료

    it("브라우저별 용량 초과 오류만 저장공간 부족으로 판정한다", () => // 판정 함수 검증
    { // 검증 시작
        expect(isStorageQuotaError(quotaError())).toBe(true); // 감싼 오류 판정
        expect(isStorageQuotaError(new DOMException("full", "NS_ERROR_DOM_QUOTA_REACHED"))).toBe(true); // 파이어폭스 이름 판정
        expect(isStorageQuotaError({ name: "Error", code: 22 })).toBe(true); // 오래된 코드 판정
        expect(isStorageQuotaError(new StorageWriteError(new Error("권한 없음")))).toBe(false); // 일반 쓰기 오류 제외
        expect(isStorageQuotaError("문자열 오류")).toBe(false); // 비객체 제외
    }); // 검증 종료
}); // 묶음 종료

describe("데이터 관리 실패 안내", () => // 데이터 관리 묶음
{ // 묶음 시작
    beforeEach(() => // 환경 초기화
    { // 초기화 시작
        window.localStorage.clear(); // 저장공간 비우기
        vi.spyOn(window, "confirm").mockReturnValue(true); // 확인 창 승인
    }); // 초기화 종료

    afterEach(() => // 환경 정리
    { // 정리 시작
        vi.restoreAllMocks(); // 대역 복원
        downloadJsonFile.mockReset(); // 다운로드 대역 초기화
    }); // 정리 종료

    it("JSON 내보내기 실패를 경고로 알린다", async () => // 내보내기 실패 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        downloadJsonFile.mockImplementation(() => // 다운로드 실패 설정
        { // 실패 시작
            throw new Error("다운로드 차단"); // 다운로드 오류 발생
        }); // 실패 종료
        renderWithApp(<DataManagement />); // 관리 화면 렌더
        await user.click(screen.getByRole("button", { name: "JSON 내보내기" })); // 내보내기 실행
        expect(screen.getByRole("alert")).toHaveTextContent("JSON 파일을 만들지 못했습니다."); // 실패 안내 확인
    }); // 검증 종료

    it("JSON 내보내기 성공 시 다운로드 시작을 알린다", async () => // 내보내기 성공 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        renderWithApp(<DataManagement />); // 관리 화면 렌더
        await user.click(screen.getByRole("button", { name: "JSON 내보내기" })); // 내보내기 실행
        expect(downloadJsonFile).toHaveBeenCalledWith("mateverse-data.json", expect.any(String)); // 다운로드 호출 확인
        expect(screen.getByRole("status")).toHaveTextContent("JSON 파일 다운로드를 시작했습니다."); // 성공 안내 확인
    }); // 검증 종료

    it("백업 데이터 검증 실패를 백업 실패와 구분해 알린다", async () => // 복구 실패 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        vi.spyOn(LocalStorageGateway.prototype, "listBackups").mockReturnValue([{ id: "backup-1", createdAt: null, reason: "manual", summary: null }]); // 백업 목록 대역
        vi.spyOn(LocalStorageGateway.prototype, "restoreBackup").mockImplementation(() => // 복구 실패 대역
        { // 실패 시작
            throw new ImportValidationError("MATE:VERSE 상태 파일 형식이 아닙니다."); // 검증 오류 발생
        }); // 실패 종료
        renderWithApp(<DataManagement />); // 관리 화면 렌더
        await user.click(await screen.findByRole("button", { name: "복구" })); // 복구 실행
        expect(screen.getByRole("alert")).toHaveTextContent("선택한 백업을 복구할 수 없습니다. MATE:VERSE 상태 파일 형식이 아닙니다."); // 원인 안내 확인
    }); // 검증 종료

    it("저장공간 부족으로 백업하지 못하면 정리 방법을 안내한다", async () => // 백업 용량 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        vi.spyOn(LocalStorageGateway.prototype, "createBackup").mockImplementation(() => // 백업 실패 대역
        { // 실패 시작
            throw quotaError(); // 용량 초과 발생
        }); // 실패 종료
        renderWithApp(<DataManagement />); // 관리 화면 렌더
        await user.click(screen.getByRole("button", { name: "로컬 백업 만들기" })); // 백업 실행
        expect(screen.getByRole("alert")).toHaveTextContent("브라우저 저장공간이 가득 차 작업을 완료하지 못했습니다."); // 용량 안내 확인
    }); // 검증 종료
}); // 묶음 종료
