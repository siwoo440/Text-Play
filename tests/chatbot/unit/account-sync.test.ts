import { beforeEach, describe, expect, it } from "vitest"; // 테스트 도구
import { AccountSyncRunner, decideSync, hashText, readSyncMeta, SYNC_META_KEY, writeSyncMeta, type SyncLocal, type SyncMeta, type SyncStatus } from "@chatbot/lib/account/account-sync"; // 계정 맞추기
import { createPracticeSnapshotStore, PRACTICE_SERVER_PREFIX, type RemoteSnapshot, type SnapshotStore } from "@chatbot/lib/account/snapshot-store"; // 서버 저장 계약

const remote = (revision: number, state: string): RemoteSnapshot => ({ revision, state, updatedAt: "2026-10-06T00:00:00.000Z", deviceId: "device-other" }); // 서버에 있는 저장본
const meta = (revision: number | null, syncedText: string | null): SyncMeta => ({ revision, syncedHash: syncedText === null ? null : hashText(syncedText), syncedAt: null, deviceId: "device-me" }); // 이 기기의 맞춤 기록

class Device implements SyncLocal // 기기 하나(앱 데이터와 맞춤 기록을 가짐)
{ // 클래스 시작
    public readonly storage: Storage; // 맞춤 기록을 두는 저장소
    public readonly statuses: SyncStatus[] = []; // 받은 상태 알림
    public applied: string[] = []; // 서버에서 받아 적용한 저장본
    public protectedApplies: boolean[] = []; // 적용할 때마다 이 기기 데이터를 백업하라고 했는지
    public rejectApply = false; // 받은 저장본을 적용하지 못하는 경우

    public constructor(public data: string, name: string) // 생성자
    { // 생성자 시작
        const values = new Map<string, string>(); // 기기별 저장소
        this.storage = { get length() { return values.size; }, clear: () => values.clear(), key: (index) => [...values.keys()][index] ?? null, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: (key) => { values.delete(key); } }; // 메모리 저장소
        writeSyncMeta(this.storage, { revision: null, syncedHash: null, syncedAt: null, deviceId: name }); // 기기 이름
    } // 생성자 종료

    public read(): string // 지금 앱 데이터
    { // 함수 시작
        return this.data; // 데이터 반환
    } // 함수 종료

    public apply(state: string, protect: boolean): boolean // 서버 저장본 적용
    { // 함수 시작
        if (this.rejectApply) // 적용 실패
        { // 조건 시작
            return false; // 실패
        } // 조건 종료
        this.applied.push(state); // 기록
        this.protectedApplies.push(protect); // 백업 요청 기록
        this.data = state; // 데이터 교체
        return true; // 성공
    } // 함수 종료

    public runner(store: SnapshotStore): AccountSyncRunner // 이 기기의 맞추기 도구
    { // 함수 시작
        return new AccountSyncRunner(store, "practice-soha", this, (status) => this.statuses.push(status), () => "2026-10-06T01:00:00.000Z"); // 도구 반환
    } // 함수 종료
} // 클래스 종료

describe("맞춤 기록과 판단", () => // 판단 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 저장소 비움

    it("맞춤 기록을 저장하고 읽으며, 없거나 깨졌으면 기기 이름을 새로 지어 시작한다", () => // 맞춤 기록 검증
    { // 검증 시작
        const first = readSyncMeta(localStorage, () => "device-new"); // 처음 읽기
        expect(first).toEqual({ revision: null, syncedHash: null, syncedAt: null, deviceId: "device-new" }); // 새 기록
        expect(readSyncMeta(localStorage, () => "device-again").deviceId).toBe("device-new"); // 지은 이름은 그대로 씀
        writeSyncMeta(localStorage, { ...first, revision: 3, syncedHash: "abc", syncedAt: "2026-10-06T00:00:00.000Z" }); // 저장
        expect(readSyncMeta(localStorage).revision).toBe(3); // 읽기
        localStorage.setItem(SYNC_META_KEY, "{broken"); // 깨진 기록
        expect(readSyncMeta(localStorage, () => "device-fresh")).toMatchObject({ revision: null, deviceId: "device-fresh" }); // 새로 시작
        expect(hashText("가나다")).toBe(hashText("가나다")); // 같은 글은 같은 값
        expect(hashText("가나다")).not.toBe(hashText("가나라")); // 다른 글은 다른 값
    }); // 검증 종료

    it("서버 저장본과 이 기기의 기록을 견주어 올릴지, 받을지, 겹쳤는지 정한다", () => // 판단 검증
    { // 검증 시작
        expect(decideSync(meta(null, null), null, hashText("A"))).toBe("upload"); // 서버가 비어 있으면 올림
        expect(decideSync(meta(null, null), remote(4, "S"), hashText("A"))).toBe("download"); // 이 기기에서 처음 맞추면 서버 것을 받음
        expect(decideSync(meta(4, "A"), remote(4, "A"), hashText("A"))).toBe("none"); // 양쪽이 그대로
        expect(decideSync(meta(4, "A"), remote(4, "A"), hashText("B"))).toBe("upload"); // 이 기기만 바뀜
        expect(decideSync(meta(4, "A"), remote(5, "S"), hashText("A"))).toBe("download"); // 서버만 바뀜
        expect(decideSync(meta(4, "A"), remote(5, "S"), hashText("B"))).toBe("conflict"); // 양쪽이 바뀜
        expect(decideSync(meta(4, "A"), remote(2, "S"), hashText("A"))).toBe("upload"); // 서버가 예전으로 돌아갔으면 다시 올림
    }); // 검증 종료
}); // 묶음 종료

describe("연습용 서버", () => // 연습용 서버 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 저장소 비움

    it("저장본을 번호와 함께 보관하고, 번호가 맞지 않으면 덮어쓰지 않는다", async () => // 연습용 서버 검증
    { // 검증 시작
        const store = createPracticeSnapshotStore(localStorage, () => "2026-10-06T02:00:00.000Z"); // 연습용 서버
        expect(store.mode).toBe("practice"); // 연습용
        expect(await store.pull("practice-soha")).toBeNull(); // 처음에는 없음
        expect(await store.push("practice-soha", "첫 저장", null, "device-a")).toEqual({ ok: true, revision: 1, updatedAt: "2026-10-06T02:00:00.000Z" }); // 첫 저장
        expect(await store.push("practice-soha", "둘째 저장", 1, "device-a")).toMatchObject({ ok: true, revision: 2 }); // 번호가 맞으면 저장
        expect(await store.push("practice-soha", "늦은 저장", 1, "device-b")).toEqual({ ok: false, reason: "conflict", remote: { revision: 2, state: "둘째 저장", updatedAt: "2026-10-06T02:00:00.000Z", deviceId: "device-a" } }); // 번호가 다르면 거절하고 서버 것을 알려 줌
        expect((await store.pull("practice-soha"))?.state).toBe("둘째 저장"); // 서버 것은 그대로
        expect(await store.pull("practice-rian")).toBeNull(); // 계정마다 따로
        expect(localStorage.getItem(`${PRACTICE_SERVER_PREFIX}practice-soha`)).toContain("둘째 저장"); // 저장 위치
    }); // 검증 종료
}); // 묶음 종료

describe("계정 데이터 맞추기", () => // 맞추기 묶음
{ // 묶음 시작
    beforeEach(() => localStorage.clear()); // 저장소 비움

    it("처음에는 올리고, 바뀌면 다시 올리고, 다른 기기는 받아서 같은 데이터가 된다", async () => // 올리기·받기 검증
    { // 검증 시작
        const store = createPracticeSnapshotStore(localStorage); // 두 기기가 함께 쓰는 서버
        const phone = new Device("휴대폰 1", "device-phone"); // 휴대폰
        expect(await phone.runner(store).sync()).toMatchObject({ phase: "saved", created: true }); // 첫 저장(새 계정)
        expect(readSyncMeta(phone.storage)).toMatchObject({ revision: 1, syncedHash: hashText("휴대폰 1"), syncedAt: "2026-10-06T01:00:00.000Z" }); // 맞춤 기록
        expect(phone.statuses.map((status) => status.phase)).toEqual(["syncing", "saved"]); // 진행 알림
        phone.data = "휴대폰 2"; // 휴대폰에서 바뀜
        await phone.runner(store).sync(); // 다시 맞춤
        expect((await store.pull("practice-soha"))?.revision).toBe(2); // 서버 번호 오름
        const laptop = new Device("노트북의 빈 데이터", "device-laptop"); // 노트북(이 계정을 처음 씀)
        expect((await laptop.runner(store).sync()).phase).toBe("saved"); // 받음
        expect(laptop.data).toBe("휴대폰 2"); // 휴대폰 데이터와 같아짐
        expect(readSyncMeta(laptop.storage).revision).toBe(2); // 받은 번호 기록
        expect((await laptop.runner(store).sync()).phase).toBe("saved"); // 바뀐 것이 없으면 그대로
        expect((await store.pull("practice-soha"))?.revision).toBe(2); // 서버 번호 그대로
        laptop.data = "노트북 3"; // 노트북에서 바뀜
        await laptop.runner(store).sync(); // 올림
        await phone.runner(store).sync(); // 휴대폰은 받음
        expect(phone.data).toBe("노트북 3"); // 노트북 데이터와 같아짐
        expect([laptop.protectedApplies, phone.protectedApplies]).toEqual([[true], [false]]); // 이 기기에서 처음 받을 때만 있던 데이터를 백업하고, 그 뒤의 받기는 백업하지 않음
    }); // 검증 종료

    it("두 기기가 따로 바꾸면 겹침을 알리고, 고른 쪽으로 맞춘다", async () => // 겹침 검증
    { // 검증 시작
        const store = createPracticeSnapshotStore(localStorage); // 서버
        const phone = new Device("처음", "device-phone"); // 휴대폰
        await phone.runner(store).sync(); // 첫 저장
        const laptop = new Device("빈 데이터", "device-laptop"); // 노트북
        await laptop.runner(store).sync(); // 받음
        phone.data = "휴대폰에서 바꿈"; // 휴대폰 변경
        await phone.runner(store).sync(); // 휴대폰이 먼저 올림
        laptop.data = "노트북에서 바꿈"; // 노트북 변경(휴대폰 것을 받기 전)
        const runner = laptop.runner(store); // 노트북의 맞추기 도구
        const conflict = await runner.sync(); // 맞추기
        expect(conflict.phase).toBe("conflict"); // 겹침
        expect(conflict.remote?.state).toBe("휴대폰에서 바꿈"); // 서버 것을 알려 줌
        expect(laptop.data).toBe("노트북에서 바꿈"); // 고르기 전에는 아무것도 바꾸지 않음
        expect(runner.hasConflict()).toBe(true); // 풀지 않은 겹침이 있음
        expect((await runner.resolve("keep-local")).phase).toBe("saved"); // 이 기기 것을 남김
        expect((await store.pull("practice-soha"))?.state).toBe("노트북에서 바꿈"); // 서버가 노트북 것으로 바뀜
        expect(runner.hasConflict()).toBe(false); // 겹침이 풀림
        expect(laptop.statuses.at(-2)).toMatchObject({ phase: "syncing", remote: { state: "휴대폰에서 바꿈" } }); // 고른 쪽으로 맞추는 동안에도 겹친 서버 저장본을 함께 알림(선택 창 유지)
        phone.data = "휴대폰에서 또 바꿈"; // 휴대폰 변경(노트북 것을 받기 전)
        const phoneRunner = phone.runner(store); // 휴대폰의 맞추기 도구
        expect((await phoneRunner.sync()).phase).toBe("conflict"); // 겹침
        expect((await phoneRunner.resolve("take-remote")).phase).toBe("saved"); // 서버 것을 받음
        expect(phone.data).toBe("노트북에서 바꿈"); // 휴대폰이 서버 것으로 바뀜
        expect(phone.protectedApplies.at(-1)).toBe(true); // 이 기기 데이터를 버릴 때는 백업
        phone.data = "휴대폰에서 세 번째로 바꿈"; // 휴대폰 변경
        laptop.data = "노트북에서 또 바꿈"; // 노트북 변경
        await laptop.runner(store).sync(); // 노트북이 먼저 올림
        const stuck = phone.runner(store); // 휴대폰의 맞추기 도구
        await stuck.sync(); // 겹침
        phone.rejectApply = true; // 받은 저장본을 쓸 수 없는 경우
        expect(await stuck.resolve("take-remote")).toMatchObject({ phase: "conflict", remote: { state: "노트북에서 또 바꿈" } }); // 풀지 못하면 겹침을 그대로 알려 다시 고르게 함
        expect(stuck.hasConflict()).toBe(true); // 겹침이 남음
    }); // 검증 종료

    it("서버에 닿지 못하거나 받은 저장본을 쓸 수 없으면 이 기기의 데이터를 그대로 둔다", async () => // 실패 검증
    { // 검증 시작
        const broken: SnapshotStore = { mode: "practice", pull: async () => { throw new Error("offline"); }, push: async () => ({ ok: false, reason: "unavailable" }) }; // 닿지 않는 서버
        const phone = new Device("휴대폰", "device-phone"); // 휴대폰
        expect((await phone.runner(broken).sync()).phase).toBe("offline"); // 연결 실패
        expect(readSyncMeta(phone.storage).revision).toBeNull(); // 기록하지 않음
        const store = createPracticeSnapshotStore(localStorage); // 서버
        await new Device("서버에 있던 것", "device-other").runner(store).sync(); // 다른 기기가 저장
        phone.rejectApply = true; // 받은 저장본을 쓸 수 없음
        expect((await phone.runner(store).sync()).phase).toBe("offline"); // 맞추지 못함
        expect(phone.data).toBe("휴대폰"); // 이 기기 데이터 그대로
        const refusing: SnapshotStore = { mode: "practice", pull: async () => null, push: async () => ({ ok: false, reason: "unavailable" }) }; // 올리기를 받지 않는 서버
        expect((await phone.runner(refusing).sync()).phase).toBe("offline"); // 올리지 못함
    }); // 검증 종료
}); // 묶음 종료
