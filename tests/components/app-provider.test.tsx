import { render, screen, waitFor } from "@testing-library/react"; // 렌더 도구
import { describe, expect, it } from "vitest"; // 테스트 도구
import { AppProvider, useAppStore, type StateRepository } from "@/features/core/AppProvider"; // 앱 공급자
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태
import type { AppState } from "@/features/core/types"; // 상태 타입
import { StorageWriteError } from "@/lib/repositories/local-storage-gateway"; // 저장 오류

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
}); // 묶음 종료
