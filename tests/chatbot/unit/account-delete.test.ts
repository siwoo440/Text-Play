import { beforeEach, describe, expect, it } from "vitest"; // 테스트 도구
import { ACCOUNT_SESSION_KEY } from "@chatbot/lib/account/account-session"; // 계정 세션
import { createPracticeAuthAdapter } from "@chatbot/lib/account/practice-auth-adapter"; // 연습용 로그인
import { clearAccountData, createScopedStorage } from "@chatbot/lib/account/scoped-storage"; // 계정별 저장 칸
import { createPracticeSnapshotStore } from "@chatbot/lib/account/snapshot-store"; // 연습용 서버

describe("이 기기의 계정 데이터 지우기", () => // 기기 데이터 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 저장소 비움

    it("그 계정의 칸에 있는 것만 모두 지우고, 손님·다른 계정·기기 공용 값·서버 저장본은 그대로 둔다", () => // 지우는 범위 검증
    { // 검증 시작
        const mine = createScopedStorage(localStorage, "practice-aaa"); // 지울 계정의 저장소
        mine.setItem("mateverse:v1:state", "state"); // 앱 데이터
        mine.setItem("mateverse:v1:backup-history", "backups"); // 백업
        mine.setItem("mateverse:v1:sync", "sync"); // 맞춤 기록
        mine.setItem("mateverse:draft:character:new", "draft"); // 작성 중 임시 저장
        createScopedStorage(localStorage, "practice-aaab").setItem("mateverse:v1:state", "other"); // 이름이 비슷한 다른 계정
        localStorage.setItem("mateverse:v1:state", "guest"); // 손님 데이터
        localStorage.setItem("mateverse:draft:character:new", "guest-draft"); // 손님의 임시 저장
        localStorage.setItem("mateverse:theme", "dark"); // 테마(기기 설정)
        localStorage.setItem(ACCOUNT_SESSION_KEY, "session"); // 세션
        localStorage.setItem("mateverse:v1:practice-server:practice-aaa", "remote"); // 연습용 서버의 저장본
        expect(clearAccountData(localStorage, "practice-aaa")).toBe(4); // 지운 항목 수
        expect(Object.keys(localStorage).filter((key) => key.startsWith("mateverse:v1:u:practice-aaa:"))).toEqual([]); // 그 계정의 칸은 비어 있음
        expect([localStorage.getItem("mateverse:v1:u:practice-aaab:state"), localStorage.getItem("mateverse:v1:state"), localStorage.getItem("mateverse:draft:character:new"), localStorage.getItem("mateverse:theme"), localStorage.getItem(ACCOUNT_SESSION_KEY), localStorage.getItem("mateverse:v1:practice-server:practice-aaa")]).toEqual(["other", "guest", "guest-draft", "dark", "session", "remote"]); // 나머지는 그대로
        expect(clearAccountData(localStorage, "practice-aaa")).toBe(0); // 다시 지워도 지울 것이 없음
    }); // 검증 종료
}); // 묶음 종료

describe("연습용 계정 지우기", () => // 연습용 탈퇴 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 저장소 비움

    it("계정을 지우면 쓴 계정 목록과 연습용 서버의 저장본에서 그 계정만 사라진다", async () => // 연습용 탈퇴 검증
    { // 검증 시작
        const adapter = createPracticeAuthAdapter(localStorage, () => "2026-10-07T00:00:00.000Z"); // 연습용 로그인
        const server = createPracticeSnapshotStore(localStorage, () => "2026-10-07T00:00:00.000Z"); // 연습용 서버
        const soha = await adapter.signIn({ name: "소하" }); // 지울 계정
        const rian = await adapter.signIn({ name: "리안" }); // 남길 계정
        if (!soha.ok || !rian.ok) // 로그인 실패(일어나지 않음)
        { // 조건 시작
            throw new Error("sign in failed"); // 테스트 중단
        } // 조건 종료
        await server.push(soha.session.accountId, "{\"a\":1}", null, "device-a"); // 지울 계정의 저장본
        await server.push(rian.session.accountId, "{\"b\":1}", null, "device-a"); // 남길 계정의 저장본
        expect(await adapter.deleteAccount(soha.session)).toEqual({ ok: true }); // 지움
        expect(adapter.listAccounts().map((account) => account.name)).toEqual(["리안"]); // 목록에서 빠짐
        expect(await server.pull(soha.session.accountId)).toBeNull(); // 서버 저장본도 사라짐
        expect((await server.pull(rian.session.accountId))?.state).toBe("{\"b\":1}"); // 다른 계정의 저장본은 그대로
        expect(await adapter.deleteAccount(soha.session)).toEqual({ ok: true }); // 이미 없는 계정을 지워도 문제없음
    }); // 검증 종료
}); // 묶음 종료
