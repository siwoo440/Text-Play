import { beforeEach, describe, expect, it } from "vitest"; // 테스트 도구
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { ACCOUNT_SESSION_KEY, readAccountSession, writeAccountSession, type AccountSession } from "@chatbot/lib/account/account-session"; // 계정 세션
import { createPracticeAuthAdapter, PRACTICE_ACCOUNTS_KEY } from "@chatbot/lib/account/practice-auth-adapter"; // 연습용 로그인
import { createScopedStorage, scopeKey } from "@chatbot/lib/account/scoped-storage"; // 계정별 저장 칸
import { LocalStorageGateway } from "@chatbot/lib/repositories/local-storage-gateway"; // 로컬 저장소

const session: AccountSession = { accountId: "practice-1a2b3c", name: "소하", email: null, provider: "practice", signedInAt: "2026-10-06T00:00:00.000Z" }; // 연습용 계정 세션

describe("계정 세션", () => // 세션 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 저장소 비움

    it("세션을 저장하고 읽으며, 모양이 다르거나 없으면 로그인하지 않은 것으로 본다", () => // 세션 저장 검증
    { // 검증 시작
        expect(readAccountSession(localStorage)).toBeNull(); // 처음에는 없음
        writeAccountSession(localStorage, session); // 저장
        expect(readAccountSession(localStorage)).toEqual(session); // 그대로 읽음
        writeAccountSession(localStorage, null); // 로그아웃
        expect(localStorage.getItem(ACCOUNT_SESSION_KEY)).toBeNull(); // 지워짐
        for (const broken of ["{not-json", JSON.stringify({ ...session, accountId: "" }), JSON.stringify({ ...session, accountId: "../state" }), JSON.stringify({ ...session, provider: "unknown" }), JSON.stringify({ ...session, name: "" })]) // 어긋난 값들
        { // 순회 시작
            localStorage.setItem(ACCOUNT_SESSION_KEY, broken); // 어긋난 값 저장
            expect(readAccountSession(localStorage)).toBeNull(); // 로그인하지 않은 것으로 봄
        } // 순회 종료
        expect(readAccountSession(undefined)).toBeNull(); // 저장소가 없으면(서버) 없음
    }); // 검증 종료
}); // 묶음 종료

describe("계정별 저장 칸", () => // 저장 칸 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 저장소 비움

    it("로그인하지 않았으면 지금까지 쓰던 칸을 그대로 쓰고, 계정마다 다른 칸을 쓴다", () => // 칸 분리 검증
    { // 검증 시작
        expect(createScopedStorage(localStorage, null)).toBe(localStorage); // 손님은 그대로
        const guest = createInitialState(); // 손님 데이터
        guest.wallet.balance = 913; // 식별 잔액
        new LocalStorageGateway(localStorage).save(guest); // 손님 칸에 저장
        const first = new LocalStorageGateway(createScopedStorage(localStorage, "practice-aaa")); // 첫 계정의 저장소
        const second = new LocalStorageGateway(createScopedStorage(localStorage, "practice-bbb")); // 둘째 계정의 저장소
        expect(first.load().state.wallet.balance).toBe(1240); // 새 계정은 처음 상태
        const mine = createInitialState(); // 첫 계정 데이터
        mine.wallet.balance = 500; // 식별 잔액
        first.save(mine); // 첫 계정 칸에 저장
        first.createBackup("manual", "2026-10-06T01:00:00.000Z"); // 첫 계정의 백업
        expect(first.load().state.wallet.balance).toBe(500); // 첫 계정 데이터
        expect(second.load().state.wallet.balance).toBe(1240); // 둘째 계정은 영향 없음
        expect(second.listBackups()).toHaveLength(0); // 백업도 계정마다 따로
        expect(new LocalStorageGateway(localStorage).load().state.wallet.balance).toBe(913); // 손님 데이터도 그대로
        expect(localStorage.getItem("mateverse:v1:u:practice-aaa:state")).toContain("\"balance\":500"); // 계정 칸의 열쇠 이름
    }); // 검증 종료

    it("앱 데이터가 아닌 값(테마 등)은 계정과 상관없이 같은 칸을 쓴다", () => // 공용 값 검증
    { // 검증 시작
        const scoped = createScopedStorage(localStorage, "practice-aaa"); // 계정 저장소
        scoped.setItem("mateverse:theme", "dark"); // 테마(기기 설정)
        scoped.setItem(ACCOUNT_SESSION_KEY, "x"); // 세션 자체
        scoped.setItem("mateverse:v1:usage-time", "1"); // 오늘 이용 시간(기기 기준)
        expect([localStorage.getItem("mateverse:theme"), localStorage.getItem(ACCOUNT_SESSION_KEY), localStorage.getItem("mateverse:v1:usage-time")]).toEqual(["dark", "x", "1"]); // 그대로 저장
        scoped.removeItem("mateverse:v1:state"); // 계정 칸의 값 지우기
        expect(scoped.getItem("mateverse:v1:state")).toBeNull(); // 없음
    }); // 검증 종료

    it("작성 중 임시 저장도 계정마다 다른 칸에 두고, 손님은 지금까지 쓰던 칸을 그대로 쓴다", () => // 임시 저장 칸 검증
    { // 검증 시작
        const draftKey = "mateverse:draft:character:new"; // 새 캐릭터 임시 저장 열쇠
        createScopedStorage(localStorage, null).setItem(draftKey, "guest"); // 손님의 임시 저장
        createScopedStorage(localStorage, "practice-aaa").setItem(draftKey, "mine"); // 첫 계정의 임시 저장
        expect(localStorage.getItem(draftKey)).toBe("guest"); // 손님 것은 그대로
        expect(localStorage.getItem("mateverse:v1:u:practice-aaa:draft:character:new")).toBe("mine"); // 계정 칸의 열쇠 이름
        expect(createScopedStorage(localStorage, "practice-aaa").getItem(draftKey)).toBe("mine"); // 첫 계정은 자기 것을 읽음
        expect(createScopedStorage(localStorage, "practice-bbb").getItem(draftKey)).toBeNull(); // 둘째 계정에는 없음
        createScopedStorage(localStorage, "practice-aaa").removeItem(draftKey); // 첫 계정의 것만 지움
        expect([localStorage.getItem("mateverse:v1:u:practice-aaa:draft:character:new"), localStorage.getItem(draftKey)]).toEqual([null, "guest"]); // 손님 것은 남음
        expect(scopeKey("mateverse:draft:story:story-1", "practice-aaa")).toBe("mateverse:v1:u:practice-aaa:draft:story:story-1"); // 스토리 임시 저장도 같은 규칙
    }); // 검증 종료
}); // 묶음 종료

describe("연습용 로그인", () => // 연습용 로그인 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 저장소 비움

    it("이름만으로 계정을 만들고, 같은 이름이면 같은 계정으로 들어간다", async () => // 연습용 계정 검증
    { // 검증 시작
        const adapter = createPracticeAuthAdapter(localStorage, () => "2026-10-06T00:00:00.000Z"); // 연습용 로그인
        expect(adapter.mode).toBe("practice"); // 연습용
        const first = await adapter.signIn({ name: "  소하  " }); // 로그인
        expect(first.ok && first.session).toMatchObject({ name: "소하", email: null, provider: "practice", signedInAt: "2026-10-06T00:00:00.000Z" }); // 이름을 다듬어 만든 세션
        const again = await adapter.signIn({ name: "소하" }); // 같은 이름으로 다시
        const other = await adapter.signIn({ name: "리안" }); // 다른 이름
        expect(first.ok && again.ok && other.ok ? [again.session.accountId === first.session.accountId, other.session.accountId === first.session.accountId, /^practice-[a-z0-9]+$/.test(first.session.accountId)] : null).toEqual([true, false, true]); // 같은 이름은 같은 계정, 다른 이름은 다른 계정
        expect(adapter.listAccounts().map((account) => account.name)).toEqual(["리안", "소하"]); // 최근에 쓴 계정이 앞
        expect(JSON.parse(localStorage.getItem(PRACTICE_ACCOUNTS_KEY) ?? "[]")).toHaveLength(2); // 계정 목록 저장
    }); // 검증 종료

    it("이름이 비었거나 너무 길면 받지 않는다", async () => // 이름 검사 검증
    { // 검증 시작
        const adapter = createPracticeAuthAdapter(localStorage); // 연습용 로그인
        expect(await adapter.signIn({ name: " " })).toEqual({ ok: false, reason: "invalid-name" }); // 빈 이름
        expect(await adapter.signIn({ name: "가".repeat(21) })).toEqual({ ok: false, reason: "invalid-name" }); // 긴 이름
        expect(await adapter.signIn({})).toEqual({ ok: false, reason: "invalid-name" }); // 이름 없음
        expect(adapter.listAccounts()).toEqual([]); // 계정이 생기지 않음
    }); // 검증 종료
}); // 묶음 종료
