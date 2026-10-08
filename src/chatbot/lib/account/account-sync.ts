// 계정 데이터 맞추기: 이 기기의 앱 데이터와 서버의 저장본을 견주어 올리거나 받는다. 양쪽이 따로 바뀌었으면 겹침을 알리고 사람이 고르게 한다.
import { SignedOutError, type RemoteSnapshot, type SnapshotStore } from "@chatbot/lib/account/snapshot-store"; // 서버 저장 계약·로그인이 끝났다는 표시

export interface SyncMeta // 이 기기의 맞춤 기록(계정마다 따로)
{ // 구조 시작
    revision: number | null; // 마지막으로 맞춘 서버 저장 번호(맞춘 적 없으면 null)
    syncedHash: string | null; // 마지막으로 맞춘 데이터의 지문(이 기기에서 그 뒤로 바뀌었는지 가림)
    syncedAt: string | null; // 마지막으로 맞춘 시각
    deviceId: string; // 이 기기의 이름(누가 저장했는지 표시)
} // 구조 종료

export interface SyncLocal // 이 기기 쪽 연결(앱이 채움)
{ // 구조 시작
    storage: Storage; // 맞춤 기록을 두는 저장소(계정 칸)
    read(): string; // 지금 앱 데이터(JSON 글)
    apply(state: string, protect: boolean): boolean; // 서버 저장본을 앱에 적용(검사 포함. protect면 이 기기 데이터를 먼저 백업. 쓸 수 없으면 false)
} // 구조 종료

export type SyncPhase = "idle" | "syncing" | "saved" | "offline" | "conflict" | "signed-out"; // 맞추기 상태(signed-out: 로그인이 끝나 다시 로그인해야 함)
export type SyncDecision = "upload" | "download" | "conflict" | "none"; // 할 일

export interface SyncStatus // 화면에 알리는 상태
{ // 구조 시작
    phase: SyncPhase; // 상태
    syncedAt: string | null; // 마지막으로 맞춘 시각
    remote?: RemoteSnapshot; // 겹쳤을 때의 서버 저장본
    created?: boolean; // 이번에 이 계정의 서버 저장본을 처음 만들었는지(새 계정)
} // 구조 종료

export const SYNC_META_KEY = "mateverse:v1:sync"; // 맞춤 기록 저장 키(계정 칸에 저장됨)

export function hashText(text: string): string // 글의 지문(같은 글이면 같은 값. 바뀌었는지 가리는 용도)
{ // 함수 시작
    let hash = 5381; // 시작 값
    for (let index = 0; index < text.length; index += 1) // 글자 순회
    { // 순회 시작
        hash = ((hash * 33) ^ text.charCodeAt(index)) >>> 0; // 섞기
    } // 순회 종료
    return `${text.length.toString(36)}-${hash.toString(36)}`; // 길이와 섞은 값
} // 함수 종료

function createDeviceId(): string // 기기 이름 짓기
{ // 함수 시작
    return `device-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`; // 시각과 난수
} // 함수 종료

export function readSyncMeta(storage: Storage, createId: () => string = createDeviceId): SyncMeta // 맞춤 기록 읽기(없거나 깨졌으면 새로 시작하고 기기 이름을 저장)
{ // 함수 시작
    try // 읽기 시도
    { // 시도 시작
        const parsed = JSON.parse(storage.getItem(SYNC_META_KEY) ?? "null") as Partial<SyncMeta> | null; // 해석
        if (parsed !== null && typeof parsed === "object" && typeof parsed.deviceId === "string" && parsed.deviceId.length > 0) // 쓸 수 있는 기록
        { // 조건 시작
            return { revision: typeof parsed.revision === "number" ? parsed.revision : null, syncedHash: typeof parsed.syncedHash === "string" ? parsed.syncedHash : null, syncedAt: typeof parsed.syncedAt === "string" ? parsed.syncedAt : null, deviceId: parsed.deviceId }; // 기록 반환
        } // 조건 종료
    } // 시도 종료
    catch // 글이 깨짐
    { // 실패 시작
        // 새로 시작
    } // 실패 종료
    const fresh: SyncMeta = { revision: null, syncedHash: null, syncedAt: null, deviceId: createId() }; // 새 기록
    writeSyncMeta(storage, fresh); // 기기 이름을 기억해 둠
    return fresh; // 새 기록 반환
} // 함수 종료

export function writeSyncMeta(storage: Storage, meta: SyncMeta): void // 맞춤 기록 저장(저장하지 못해도 앱은 계속 씀)
{ // 함수 시작
    try // 저장 시도
    { // 시도 시작
        storage.setItem(SYNC_META_KEY, JSON.stringify(meta)); // 저장
    } // 시도 종료
    catch // 저장공간 부족 등
    { // 실패 시작
        // 다음에 다시 맞출 때 한 번 더 올리거나 받게 될 뿐이라 넘어감
    } // 실패 종료
} // 함수 종료

export function decideSync(meta: SyncMeta, remote: RemoteSnapshot | null, localHash: string): SyncDecision // 할 일 정하기
{ // 함수 시작
    if (remote === null) // 서버가 비어 있음
    { // 조건 시작
        return "upload"; // 이 기기 것을 올림
    } // 조건 종료
    if (meta.revision === null) // 이 기기에서 이 계정을 처음 맞춤
    { // 조건 시작
        return "download"; // 서버 것을 받음(이 기기에 있던 것은 적용할 때 백업함)
    } // 조건 종료
    const changedHere = localHash !== meta.syncedHash; // 이 기기에서 바뀌었는지
    if (remote.revision > meta.revision) // 다른 기기가 서버를 바꿈
    { // 조건 시작
        return changedHere ? "conflict" : "download"; // 양쪽이 바뀌었으면 겹침, 아니면 받음
    } // 조건 종료
    return changedHere || remote.revision < meta.revision ? "upload" : "none"; // 이 기기만 바뀌었거나 서버가 예전으로 돌아갔으면 올림
} // 함수 종료

export class AccountSyncRunner // 맞추기 도구(계정 하나, 기기 하나)
{ // 클래스 시작
    private conflict: RemoteSnapshot | null = null; // 겹쳤을 때 본 서버 저장본
    private signedOut = false; // 로그인이 끝난 것을 알았는지

    public constructor(private readonly store: SnapshotStore, private readonly accountId: string, private readonly local: SyncLocal, private readonly onStatus: (status: SyncStatus) => void = () => undefined, private readonly now: () => string = () => new Date().toISOString()) // 서버·계정·기기 연결·상태 알림·시각
    { // 생성자 시작
    } // 생성자 종료

    public hasConflict(): boolean // 풀지 않은 겹침이 있는지(있으면 사람이 고를 때까지 자동으로 맞추지 않음)
    { // 함수 시작
        return this.conflict !== null; // 겹침 여부
    } // 함수 종료

    public needsLogin(): boolean // 로그인이 끝났는지(끝났으면 다시 로그인할 때까지 자동으로 맞추지 않음)
    { // 함수 시작
        return this.signedOut; // 로그인 끝남 여부
    } // 함수 종료

    private expired(meta: SyncMeta): SyncStatus // 로그인이 끝났을 때의 상태(이 기기 데이터는 그대로 두고 다시 로그인하라고 알림)
    { // 함수 시작
        this.signedOut = true; // 기억
        return this.report({ phase: "signed-out", syncedAt: meta.syncedAt }); // 로그인 끝남
    } // 함수 종료

    private failed(meta: SyncMeta): SyncStatus // 맞추지 못했을 때의 상태(겹침을 풀던 중이었으면 겹침을 그대로 알려 다시 고르게 함)
    { // 함수 시작
        return this.report(this.conflict === null ? { phase: "offline", syncedAt: meta.syncedAt } : { phase: "conflict", syncedAt: meta.syncedAt, remote: this.conflict }); // 실패 상태
    } // 함수 종료

    private report(status: SyncStatus): SyncStatus // 상태 알리기
    { // 함수 시작
        this.onStatus(status); // 화면에 알림
        return status; // 상태 반환
    } // 함수 종료

    private async upload(json: string, expectedRevision: number | null, meta: SyncMeta): Promise<SyncStatus> // 이 기기 것을 올리기
    { // 함수 시작
        const result = await this.store.push(this.accountId, json, expectedRevision, meta.deviceId).catch((error: unknown) => ({ ok: false, reason: error instanceof SignedOutError ? "signed-out" : "unavailable" } as const)); // 올리기(닿지 못하면 실패로, 로그인이 끝났으면 그렇게)
        if (!result.ok && result.reason === "signed-out") // 로그인이 끝남
        { // 조건 시작
            return this.expired(meta); // 다시 로그인하라고 알림
        } // 조건 종료
        if (result.ok) // 저장됨
        { // 조건 시작
            const syncedAt = this.now(); // 맞춘 시각
            writeSyncMeta(this.local.storage, { ...meta, revision: result.revision, syncedHash: hashText(json), syncedAt }); // 맞춤 기록
            this.conflict = null; // 겹침 해소
            return this.report({ phase: "saved", syncedAt, created: expectedRevision === null }); // 저장됨(서버가 비어 있었으면 새 계정)
        } // 조건 종료
        if (result.reason === "conflict" && result.remote !== null) // 그 사이 다른 기기가 저장함
        { // 조건 시작
            this.conflict = result.remote; // 서버 것 기억
            return this.report({ phase: "conflict", syncedAt: meta.syncedAt, remote: result.remote }); // 겹침
        } // 조건 종료
        return this.failed(meta); // 올리지 못함
    } // 함수 종료

    private download(remote: RemoteSnapshot, meta: SyncMeta, protect: boolean): SyncStatus // 서버 것을 받기(protect면 이 기기 데이터를 먼저 백업)
    { // 함수 시작
        if (!this.local.apply(remote.state, protect)) // 받은 저장본을 쓸 수 없음
        { // 조건 시작
            return this.failed(meta); // 이 기기 것을 그대로 둠
        } // 조건 종료
        const syncedAt = this.now(); // 맞춘 시각
        writeSyncMeta(this.local.storage, { ...meta, revision: remote.revision, syncedHash: hashText(remote.state), syncedAt }); // 맞춤 기록
        this.conflict = null; // 겹침 해소
        return this.report({ phase: "saved", syncedAt }); // 받음
    } // 함수 종료

    public async sync(): Promise<SyncStatus> // 맞추기(서버를 보고 올리거나 받음)
    { // 함수 시작
        const meta = readSyncMeta(this.local.storage); // 맞춤 기록
        this.report({ phase: "syncing", syncedAt: meta.syncedAt }); // 맞추는 중
        let remote: RemoteSnapshot | null = null; // 서버 저장본
        try // 받기 시도
        { // 시도 시작
            remote = await this.store.pull(this.accountId); // 서버 저장본 읽기
        } // 시도 종료
        catch (error) // 서버에 닿지 못했거나 로그인이 끝남
        { // 실패 시작
            return error instanceof SignedOutError ? this.expired(meta) : this.report({ phase: "offline", syncedAt: meta.syncedAt }); // 로그인이 끝났으면 그렇게 알리고, 아니면 다음에 다시
        } // 실패 종료
        const json = this.local.read(); // 지금 앱 데이터
        const decision = decideSync(meta, remote, hashText(json)); // 할 일
        if (decision === "upload") // 올리기
        { // 조건 시작
            return this.upload(json, remote?.revision ?? null, meta); // 이 기기 것을 올림
        } // 조건 종료
        if (decision === "download" && remote !== null) // 받기
        { // 조건 시작
            return this.download(remote, meta, meta.revision === null); // 서버 것을 받음(이 기기에서 처음 맞출 때는 있던 데이터를 백업)
        } // 조건 종료
        if (decision === "conflict" && remote !== null) // 겹침
        { // 조건 시작
            this.conflict = remote; // 서버 것 기억
            return this.report({ phase: "conflict", syncedAt: meta.syncedAt, remote }); // 사람이 고르게 함
        } // 조건 종료
        return this.report({ phase: "saved", syncedAt: meta.syncedAt }); // 바뀐 것이 없음
    } // 함수 종료

    public async resolve(choice: "keep-local" | "take-remote"): Promise<SyncStatus> // 겹침 풀기(이 기기 것을 남기거나 서버 것을 받음)
    { // 함수 시작
        const remote = this.conflict; // 겹쳤을 때 본 서버 저장본
        const meta = readSyncMeta(this.local.storage); // 맞춤 기록
        if (remote === null) // 겹친 적 없음
        { // 조건 시작
            return this.sync(); // 그냥 맞춤
        } // 조건 종료
        this.report({ phase: "syncing", syncedAt: meta.syncedAt, remote }); // 맞추는 중(선택 창은 끝날 때까지 그대로 둠)
        return choice === "keep-local" ? this.upload(this.local.read(), remote.revision, meta) : this.download(remote, meta, true); // 고른 쪽으로 맞춤(서버 것을 받으면 이 기기 데이터를 백업)
    } // 함수 종료
} // 클래스 종료
