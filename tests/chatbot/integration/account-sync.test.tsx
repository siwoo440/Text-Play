import { render, screen, waitFor, within } from "@testing-library/react"; // 화면 검증 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { beforeEach, describe, expect, it } from "vitest"; // 테스트 도구
import { AccountSync } from "@chatbot/features/account/AccountSync"; // 계정 데이터 맞추기
import { describeSyncStatus, useSyncStatus } from "@chatbot/features/account/sync-status"; // 맞추기 상태
import { AppProvider, useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 공급자
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { writeAccountSession, type AccountSession } from "@chatbot/lib/account/account-session"; // 계정 세션
import { createScopedStorage } from "@chatbot/lib/account/scoped-storage"; // 계정별 저장 칸
import { createPracticeSnapshotStore, type RemoteSnapshot } from "@chatbot/lib/account/snapshot-store"; // 연습용 서버
import { LocalStorageGateway } from "@chatbot/lib/repositories/local-storage-gateway"; // 로컬 저장소

const session: AccountSession = { accountId: "practice-soha", name: "소하", email: null, provider: "practice", signedInAt: "2026-10-06T00:00:00.000Z" }; // 연습용 계정 세션
const server = () => createPracticeSnapshotStore(localStorage); // 연습용 서버
const pull = async (): Promise<RemoteSnapshot | null> => server().pull(session.accountId); // 서버 저장본 읽기
const serverBalance = async (): Promise<number | null> => { const remote = await pull(); return remote === null ? null : (JSON.parse(remote.state) as AppState).wallet.balance; }; // 서버 저장본의 잔액

function withBalance(balance: number): AppState // 잔액으로 구별하는 앱 데이터
{ // 함수 시작
    const state = createInitialState(); // 초기 상태
    state.wallet.balance = balance; // 식별 잔액
    return state; // 상태 반환
} // 함수 종료

function Probe() // 잔액·맞추기 상태 표시와 잔액 바꾸기
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const status = useSyncStatus(); // 맞추기 상태
    return <><output aria-label="잔액 확인">{state.wallet.balance}</output><output aria-label="저장 상태">{status.phase}|{describeSyncStatus(status)}</output><button type="button" onClick={() => dispatch({ type: "update-settings", settings: { showSceneImages: !state.settings.showSceneImages } })}>설정 바꾸기</button></>; // 표시와 버튼
} // 함수 종료

function renderApp() // 로그인한 앱 렌더(맞추기는 바로 실행)
{ // 함수 시작
    return render(<AppProvider><AccountSync store={server()} delayMs={20} /><Probe /></AppProvider>); // 앱 렌더
} // 함수 종료

describe("계정 데이터를 서버와 맞추기", () => // 맞추기 묶음
{ // 묶음 시작
    beforeEach(() => // 준비
    { // 준비 시작
        localStorage.clear(); // 저장소 비움
        writeAccountSession(localStorage, session); // 로그인해 둠
    }); // 준비 종료

    it("로그인하면 계정 데이터를 서버에 올리고, 바뀌면 잠시 뒤 다시 올린다", async () => // 올리기 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        new LocalStorageGateway(createScopedStorage(localStorage, session.accountId)).save(withBalance(500)); // 계정 데이터
        renderApp(); // 렌더
        await waitFor(async () => expect(await serverBalance()).toBe(500)); // 서버에 올라감
        await waitFor(() => expect(screen.getByLabelText("저장 상태")).toHaveTextContent("saved|연습용 서버에 저장됨(이 브라우저 안)")); // 저장 상태 표시
        const first = (await pull())?.revision ?? 0; // 첫 저장 번호
        await user.click(screen.getByRole("button", { name: "설정 바꾸기" })); // 데이터 변경
        await waitFor(async () => expect((await pull())?.revision).toBe(first + 1)); // 다시 올림
        expect((JSON.parse((await pull())?.state ?? "{}") as AppState).settings.showSceneImages).toBe(!createInitialState().settings.showSceneImages); // 바뀐 내용이 서버에 있음
    }); // 검증 종료

    it("이 기기에서 계정을 처음 쓰면 서버에 있던 데이터를 받고, 창으로 돌아오면 다른 기기의 변경을 받는다", async () => // 받기 검증
    { // 검증 시작
        await server().push(session.accountId, JSON.stringify(withBalance(777)), null, "device-other"); // 다른 기기가 올려 둔 데이터
        renderApp(); // 이 기기에서 처음 로그인
        await waitFor(() => expect(screen.getByLabelText("잔액 확인")).toHaveTextContent("777")); // 서버 데이터를 받음
        const scoped = new LocalStorageGateway(createScopedStorage(localStorage, session.accountId)); // 계정 칸
        await waitFor(() => expect(scoped.load().state.wallet.balance).toBe(777)); // 이 기기에도 저장됨
        expect(scoped.listBackups().map((backup) => backup.reason)).toEqual(["sync"]); // 받기 전에 있던 데이터는 백업
        await waitFor(() => expect(screen.getByLabelText("저장 상태")).toHaveTextContent("saved")); // 맞춤 완료
        const remote = await pull(); // 지금 서버 저장본
        await server().push(session.accountId, JSON.stringify(withBalance(888)), remote?.revision ?? null, "device-other"); // 다른 기기가 또 바꿈
        window.dispatchEvent(new Event("focus")); // 창으로 돌아옴
        await waitFor(() => expect(screen.getByLabelText("잔액 확인")).toHaveTextContent("888")); // 다른 기기의 변경을 받음
        expect(scoped.listBackups()).toHaveLength(1); // 바꾼 것이 없던 받기는 백업하지 않음
    }); // 검증 종료

    it("양쪽이 따로 바뀌면 어느 쪽을 남길지 묻고, 고른 대로 맞춘다", async () => // 겹침 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        new LocalStorageGateway(createScopedStorage(localStorage, session.accountId)).save(withBalance(500)); // 계정 데이터
        const { unmount } = renderApp(); // 렌더
        await waitFor(async () => expect(await serverBalance()).toBe(500)); // 첫 저장
        await waitFor(() => expect(screen.getByLabelText("저장 상태")).toHaveTextContent("saved")); // 맞춤 완료
        unmount(); // 앱을 닫음
        const remote = await pull(); // 지금 서버 저장본
        await server().push(session.accountId, JSON.stringify(withBalance(900)), remote?.revision ?? null, "device-other"); // 다른 기기가 바꿈
        const mine = withBalance(600); // 이 기기에서도 바꿈(서버 것을 받기 전)
        new LocalStorageGateway(createScopedStorage(localStorage, session.accountId)).save(mine); // 이 기기에 저장
        renderApp(); // 다시 엶
        const dialog = await screen.findByRole("dialog", { name: "어느 쪽 데이터를 남길까요?" }); // 겹침 선택 창
        expect(screen.getByLabelText("잔액 확인")).toHaveTextContent("600"); // 고르기 전에는 이 기기 데이터 그대로
        expect(await serverBalance()).toBe(900); // 서버도 그대로
        await user.click(within(dialog).getByRole("button", { name: "서버 데이터 받기" })); // 서버 것을 고름
        await waitFor(() => expect(screen.getByLabelText("잔액 확인")).toHaveTextContent("900")); // 서버 데이터로 바뀜
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull()); // 창 닫힘
        const backups = new LocalStorageGateway(createScopedStorage(localStorage, session.accountId)).listBackups(); // 이 기기의 백업
        expect(backups[0]?.reason).toBe("sync"); // 버린 쪽(이 기기 데이터)은 백업해 둠
    }); // 검증 종료

    it("겹쳤을 때 이 기기 데이터를 남기면 서버가 이 기기 데이터로 바뀐다", async () => // 이 기기 남기기 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        new LocalStorageGateway(createScopedStorage(localStorage, session.accountId)).save(withBalance(500)); // 계정 데이터
        const { unmount } = renderApp(); // 렌더
        await waitFor(() => expect(screen.getByLabelText("저장 상태")).toHaveTextContent("saved")); // 첫 저장
        unmount(); // 앱을 닫음
        await server().push(session.accountId, JSON.stringify(withBalance(900)), (await pull())?.revision ?? null, "device-other"); // 다른 기기가 바꿈
        new LocalStorageGateway(createScopedStorage(localStorage, session.accountId)).save(withBalance(600)); // 이 기기에서도 바꿈
        renderApp(); // 다시 엶
        await user.click(within(await screen.findByRole("dialog", { name: "어느 쪽 데이터를 남길까요?" })).getByRole("button", { name: "이 기기 데이터 남기기" })); // 이 기기 것을 고름
        await waitFor(async () => expect(await serverBalance()).toBe(600)); // 서버가 이 기기 데이터로 바뀜
        expect(screen.getByLabelText("잔액 확인")).toHaveTextContent("600"); // 이 기기 데이터 그대로
    }); // 검증 종료

    it("새 계정으로 처음 로그인하면 이 브라우저에서 쓰던 손님 데이터를 가져올지 묻는다", async () => // 손님 데이터 가져오기 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구
        new LocalStorageGateway(localStorage).save(withBalance(913)); // 손님으로 쓰던 데이터
        const { unmount } = renderApp(); // 새 계정으로 로그인
        const offer = await screen.findByRole("status", { name: "손님 데이터 가져오기" }); // 가져오기 물음
        expect(screen.getByLabelText("잔액 확인")).toHaveTextContent("1240"); // 아직은 새 계정의 처음 상태
        await user.click(within(offer).getByRole("button", { name: "가져오기" })); // 가져오기
        await waitFor(() => expect(screen.getByLabelText("잔액 확인")).toHaveTextContent("913")); // 손님 데이터가 계정으로 들어옴
        expect(screen.getByText("이 브라우저에서 쓰던 데이터를 이 계정으로 가져왔어요.")).toBeVisible(); // 결과 안내
        await waitFor(async () => expect(await serverBalance()).toBe(913)); // 서버에도 올라감
        expect(new LocalStorageGateway(localStorage).load().state.wallet.balance).toBe(913); // 손님 데이터는 그대로 남음
        unmount(); // 닫고
        renderApp(); // 다시 열어도
        await waitFor(() => expect(screen.getByLabelText("저장 상태")).toHaveTextContent("saved")); // 맞춤 완료
        expect(screen.queryByRole("status", { name: "손님 데이터 가져오기" })).toBeNull(); // 다시 묻지 않음
    }); // 검증 종료

    it("손님에게는 아무것도 하지 않는다", async () => // 손님 검증
    { // 검증 시작
        writeAccountSession(localStorage, null); // 로그아웃
        new LocalStorageGateway(localStorage).save(withBalance(913)); // 손님 데이터
        renderApp(); // 렌더
        await waitFor(() => expect(screen.getByLabelText("잔액 확인")).toHaveTextContent("913")); // 손님 데이터
        expect(screen.getByLabelText("저장 상태")).toHaveTextContent("idle|"); // 맞추지 않음
        expect(Object.keys(localStorage).some((key) => key.includes("practice-server"))).toBe(false); // 서버에 올리지 않음
    }); // 검증 종료
}); // 묶음 종료
