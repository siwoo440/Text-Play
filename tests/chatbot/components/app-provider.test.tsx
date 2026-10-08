import { render, screen, waitFor } from "@testing-library/react"; // 렌더 도구
import { afterEach, describe, expect, it } from "vitest"; // 테스트 도구
import { AppProvider, closePanelsOnNarrowFirstVisit, useAppStore, type StateRepository } from "@chatbot/features/core/AppProvider"; // 앱 공급자
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { LocalStorageGateway, StorageWriteError } from "@chatbot/lib/repositories/local-storage-gateway"; // 저장소·저장 오류

function WalletProbe() // 지갑 표시
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    return <output aria-label="지갑 잔액">{state.wallet.balance}</output>; // 잔액 반환
} // 함수 종료

function StorageErrorProbe() // 저장 오류 표시
{ // 함수 시작
    const { storageError } = useAppStore(); // 저장 오류 조회
    return storageError === null ? <span>정상</span> : <p role="alert">{storageError}</p>; // 오류 상태 반환
} // 함수 종료

function NoticeProbe() // 저장소 안내 표시
{ // 함수 시작
    const { storageNotice } = useAppStore(); // 저장소 안내 조회
    return storageNotice === null ? <span>안내 없음</span> : <p>{storageNotice.message}</p>; // 안내 반환
} // 함수 종료

function BackupProbe() // 백업 동작 표시
{ // 함수 시작
    const { createBackup } = useAppStore(); // 백업 함수 조회
    return <button type="button" onClick={() => createBackup("version-delete")}>백업 실행</button>; // 백업 버튼 반환
} // 함수 종료

describe("앱 상태 복원", () => // 복원 묶음
{ // 묶음 시작
    it("복원 상태를 적용하기 전에 초기 상태를 저장하지 않는다", async () => // 덮어쓰기 방지 검증
    { // 검증 시작
        const restored = createInitialState(); // 복원 상태
        restored.wallet.balance = 77; // 복원 잔액
        const saved: AppState[] = []; // 저장 기록
        const repository: StateRepository = { load: () => restored, save: (state) => saved.push(structuredClone(state)) }; // 테스트 저장소
        render(<AppProvider repository={repository}><WalletProbe /></AppProvider>); // 공급자 렌더
        await waitFor(() => expect(screen.getByLabelText("지갑 잔액")).toHaveTextContent("77")); // 복원 대기
        await waitFor(() => expect(saved[0]?.wallet.balance).toBe(77)); // 첫 저장 확인
    }); // 검증 종료

    it("저장 실패를 앱 중단 없이 라이브 오류로 전달한다", async () => // 저장 실패 검증
    { // 검증 시작
        const restored = createInitialState(); // 복원 상태
        const repository: StateRepository = // 실패 저장소
        { // 저장소 시작
            load: () => restored, // 복원 상태 반환
            save() // 저장 실패 함수
            { // 함수 시작
                throw new StorageWriteError(new Error("용량 부족")); // 저장 오류 발생
            }, // 함수 종료
        }; // 저장소 종료
        render(<AppProvider repository={repository}><StorageErrorProbe /></AppProvider>); // 공급자 렌더
        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("저장하지 못했습니다.")); // 오류 안내 확인
    }); // 검증 종료

    it("현재 상태 백업 성공 여부를 화면 동작에 제공한다", async () => // 백업 계약 검증
    { // 검증 시작
        const restored = createInitialState(); // 복원 상태 생성
        const events: string[] = []; // 호출 기록 생성
        const repository: StateRepository = { load: () => restored, save: () => events.push("save"), createBackup: (_state, reason) => events.push(`backup:${reason}`) }; // 백업 저장소 생성
        render(<AppProvider repository={repository}><BackupProbe /></AppProvider>); // 공급자 렌더
        await waitFor(() => expect(events).toContain("save")); // 복원 완료 대기
        screen.getByRole("button", { name: "백업 실행" }).click(); // 백업 실행
        expect(events).toContain("backup:version-delete"); // 백업 호출 확인
    }); // 검증 종료
}); // 묶음 종료

function PanelProbe() // 패널 열림 표시
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태(저장 데이터를 다 읽은 뒤에만 그려짐)
    return <output aria-label="패널">{`${state.settings.leftPanelOpen}/${state.settings.rightPanelOpen}`}</output>; // 왼쪽/오른쪽 열림
} // 함수 종료

describe("처음 방문했을 때의 패널", () => // 첫 방문 묶음
{ // 묶음 시작
    const originalWidth = window.innerWidth; // 원래 화면 너비
    const setWidth = (width: number) => Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width }); // 화면 너비 바꾸기

    afterEach(() => // 테스트 정리
    { // 정리 시작
        setWidth(originalWidth); // 너비 복원
        window.localStorage.removeItem("mateverse:v1:state"); // 저장 상태 지움
    }); // 정리 종료

    it("저장 데이터가 올바르지 않으면 처음 상태로 시작한다고 알리고, 원본은 백업 이력에 남긴다", async () => // 잘못된 저장 데이터 검증
    { // 검증 시작
        const invalid = createInitialState() as unknown as Record<string, unknown>; // 잘못된 상태 준비
        invalid.wallet = { balance: "많음" }; // 잘못된 지갑
        const raw = JSON.stringify(invalid); // 잘못된 원본
        localStorage.setItem("mateverse:v1:state", raw); // 잘못된 원본 저장
        render(<AppProvider><NoticeProbe /></AppProvider>); // 공급자 렌더
        expect(await screen.findByText("저장 데이터가 올바르지 않아 처음 상태로 시작합니다. 원본은 백업으로 보관했으니 개인정보 및 보안의 데이터 관리에서 복구 백업 내보내기로 확인해 주세요.")).toBeInTheDocument(); // 실제 동작과 같은 안내
        await waitFor(() => expect(JSON.parse(localStorage.getItem("mateverse:v1:state") ?? "{}").wallet.balance).toBe(1240)); // 앱은 처음 상태를 저장함
        expect(new LocalStorageGateway(localStorage).exportBackupJson()).toContain("많음"); // 원본은 백업에 남음
    }); // 검증 종료

    it("좁은 화면으로 처음 들어오면 양쪽 패널을 닫고, 넓은 화면이거나 첫 방문이 아니면 그대로 둔다", () => // 규칙 검증
    { // 검증 시작
        const state = createInitialState(); // 처음 상태(왼쪽 열림)
        expect(closePanelsOnNarrowFirstVisit(state, true, 390).settings).toMatchObject({ leftPanelOpen: false, rightPanelOpen: false }); // 휴대폰 첫 방문
        expect(closePanelsOnNarrowFirstVisit(state, true, 760).settings.leftPanelOpen).toBe(false); // 경계 너비
        expect(closePanelsOnNarrowFirstVisit(state, true, 761)).toBe(state); // 넓은 화면
        expect(closePanelsOnNarrowFirstVisit(state, false, 390)).toBe(state); // 다시 방문
    }); // 검증 종료

    it("휴대폰 너비에서 저장된 데이터 없이 열면 대화 목록이 닫힌 채 시작하고 그대로 저장된다", async () => // 휴대폰 첫 방문 검증
    { // 검증 시작
        window.localStorage.removeItem("mateverse:v1:state"); // 저장된 것 없음
        setWidth(390); // 휴대폰 너비
        render(<AppProvider><PanelProbe /></AppProvider>); // 실제 저장소로 렌더
        await waitFor(() => expect(screen.getByLabelText("패널")).toHaveTextContent("false/false")); // 닫힌 채 시작
        await waitFor(() => expect(JSON.parse(window.localStorage.getItem("mateverse:v1:state") ?? "{}").settings?.leftPanelOpen).toBe(false)); // 닫힌 상태로 저장
    }); // 검증 종료

    it("넓은 화면의 첫 방문은 전처럼 열린 채 시작하고, 휴대폰이어도 저장해 둔 설정은 바꾸지 않는다", async () => // 그대로 두는 경우 검증
    { // 검증 시작
        window.localStorage.removeItem("mateverse:v1:state"); // 저장된 것 없음
        setWidth(1440); // 데스크톱 너비
        const first = render(<AppProvider><PanelProbe /></AppProvider>); // 렌더
        await waitFor(() => expect(screen.getByLabelText("패널")).toHaveTextContent("true/false")); // 왼쪽 열림
        await waitFor(() => expect(window.localStorage.getItem("mateverse:v1:state")).not.toBeNull()); // 저장됨
        first.unmount(); // 화면 닫기
        setWidth(390); // 같은 브라우저를 좁게
        render(<AppProvider><PanelProbe /></AppProvider>); // 다시 렌더(저장된 데이터 있음)
        await waitFor(() => expect(screen.getByLabelText("패널")).toHaveTextContent("true/false")); // 저장해 둔 설정 유지
    }); // 검증 종료
}); // 묶음 종료
