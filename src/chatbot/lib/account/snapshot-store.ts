// 서버 저장 계약: 계정의 앱 데이터를 서버에 한 벌(저장본) 보관하고, 번호로 "내가 본 뒤에 다른 기기가 바꿨는지"를 가린다. 저장본은 조각으로 나눠 두고(state-parts.ts), 조각 목록 한 줄을 바꾸는 것으로 저장을 확정한다. 그래서 바뀐 조각만 오간다.
import { hashBody, mergeParts, parseManifest, splitState, stringifyManifest } from "@chatbot/lib/account/state-parts"; // 앱 데이터를 조각으로 나누기

export interface SnapshotHead // 서버 저장본의 머리(내용 없이 번호만)
{ // 구조 시작
    revision: number; // 저장 번호(저장할 때마다 1씩 오름)
    updatedAt: string; // 저장한 시각
    deviceId: string; // 저장한 기기
} // 구조 종료

export interface RemoteSnapshot extends SnapshotHead // 서버에 있는 저장본
{ // 구조 시작
    state: string; // 앱 데이터(JSON 글)
} // 구조 종료

export type PushResult = // 올리기 결과
    | { ok: true; revision: number; updatedAt: string } // 저장됨(새 번호)
    | { ok: false; reason: "conflict"; remote: SnapshotHead | null } // 내가 본 번호와 서버 번호가 다름(다른 기기가 먼저 저장. 서버 것의 머리를 함께 알림)
    | { ok: false; reason: "signed-out" } // 로그인이 끝남(다시 로그인해야 올릴 수 있음)
    | { ok: false; reason: "unavailable" }; // 서버에 닿지 못함·받지 않음

export class SignedOutError extends Error // 로그인이 끝났다는 표시(출입증이 없거나 새로 받지 못함. 잠시 닿지 못한 것과 구별)
{ // 클래스 시작
    public constructor() // 생성자
    { // 생성자 시작
        super("signed out"); // 오류 글
        this.name = "SignedOutError"; // 오류 이름
    } // 생성자 종료
} // 클래스 종료

export interface SnapshotStore // 서버 저장 계약
{ // 구조 시작
    readonly mode: "practice" | "live"; // 연습용인지 실제 서비스인지
    head(accountId: string): Promise<SnapshotHead | null>; // 저장본의 번호만 묻기(없으면 null. 로그인이 끝났으면 SignedOutError를 던짐). 맞출 때마다 부르므로 가볍다
    pull(accountId: string, localState?: string): Promise<RemoteSnapshot | null>; // 저장본 받기(없으면 null). 이 기기의 앱 데이터를 함께 주면 내용이 같은 조각은 받지 않는다
    push(accountId: string, state: string, expectedRevision: number | null, deviceId: string): Promise<PushResult>; // 저장본 올리기(내가 본 번호와 같을 때만 저장. 바뀐 조각만 보냄)
} // 구조 종료

export interface ManifestRow extends SnapshotHead // 서버의 조각 목록 줄
{ // 구조 시작
    body: string; // 조각 목록(예전에 통째로 올린 저장본이면 앱 데이터 그대로)
} // 구조 종료

export type ManifestWrite = { ok: true; revision: number; updatedAt: string } | { ok: false; reason: "conflict" | "signed-out" | "unavailable" }; // 조각 목록 쓰기 결과

export interface SnapshotBackend // 조각을 실제로 두는 곳(연습용은 이 브라우저, 실제 서비스는 Supabase). 읽기와 조각 쓰기는 실패하면 오류를 던진다
{ // 구조 시작
    readonly mode: "practice" | "live"; // 연습용인지 실제 서비스인지
    readHead(accountId: string): Promise<SnapshotHead | null>; // 목록 줄의 번호만 읽기
    readManifest(accountId: string): Promise<ManifestRow | null>; // 목록 줄 읽기
    writeManifest(accountId: string, body: string, expectedRevision: number | null, deviceId: string): Promise<ManifestWrite>; // 목록 줄 쓰기(내가 본 번호와 같을 때만. 이 한 번으로 저장이 확정됨)
    readBlobs(accountId: string, hashes: string[]): Promise<Record<string, string>>; // 조각 읽기(지문 → 내용. 없는 것은 빠짐)
    writeBlobs(accountId: string, blobs: Record<string, string>): Promise<void>; // 조각 쓰기(지문 → 내용. 이미 있으면 그대로 둠)
    deleteBlobs(accountId: string, hashes: string[]): Promise<void>; // 조각 지우기(더는 목록에 없는 것)
    sweepBlobs?(accountId: string): Promise<void>; // 버려진 조각 청소(올리다 그만둔 조각 등. 없어도 됨)
} // 구조 종료

interface Known // 이 화면이 마지막으로 본 서버 목록
{ // 구조 시작
    revision: number; // 그때의 번호
    parts: Record<string, string>; // 조각 이름 → 지문
} // 구조 종료

async function hashParts(state: string): Promise<{ names: Record<string, string>; bodies: Record<string, string> }> // 앱 데이터를 나누고 지문을 붙이기(조각 이름 → 지문, 지문 → 내용)
{ // 함수 시작
    const names: Record<string, string> = {}; // 조각 이름 → 지문
    const bodies: Record<string, string> = {}; // 지문 → 내용
    for (const [name, body] of Object.entries(splitState(state))) // 조각 순회
    { // 순회 시작
        const hash = await hashBody(body); // 지문
        names[name] = hash; // 이름에 지문
        bodies[hash] = body; // 지문에 내용
    } // 순회 종료
    return { names, bodies }; // 결과 반환
} // 함수 종료

export function createPartedSnapshotStore(backend: SnapshotBackend): SnapshotStore // 조각으로 나눠 두는 서버 저장 구현(어디에 두는지는 backend가 정함)
{ // 함수 시작
    const known = new Map<string, Known>(); // 계정별로 마지막에 본 서버 목록
    const cache = new Map<string, string>(); // 이 화면에서 올리거나 받은 조각(지문 → 내용. 서버 목록에 있는 것만 남김)
    let swept = false; // 버려진 조각 청소를 이 화면에서 했는지
    const remember = (accountId: string, revision: number, parts: Record<string, string>, bodies: Record<string, string>): void => // 서버 목록과 그 조각을 기억하기
    { // 함수 시작
        known.set(accountId, { revision, parts }); // 목록 기억
        cache.clear(); // 예전 조각은 잊음
        Object.values(parts).forEach((hash) => { if (bodies[hash] !== undefined) { cache.set(hash, bodies[hash]); } }); // 지금 목록의 조각만 기억
    }; // 함수 종료
    const pull = async (accountId: string, localState?: string): Promise<RemoteSnapshot | null> => // 저장본 받기
    { // 함수 시작
        const local = localState === undefined ? {} : (await hashParts(localState)).bodies; // 이 기기의 조각(내용이 같으면 받지 않으려고)
        for (let attempt = 0; attempt < 2; attempt += 1) // 조각이 그 사이 지워졌으면 목록부터 한 번 더
        { // 반복 시작
            const row = await backend.readManifest(accountId); // 목록 줄
            if (row === null) // 서버가 비어 있음
            { // 조건 시작
                return null; // 없음
            } // 조건 종료
            const head: SnapshotHead = { revision: row.revision, updatedAt: row.updatedAt, deviceId: row.deviceId }; // 머리
            const parts = parseManifest(row.body); // 조각 목록
            if (parts === null) // 예전에 통째로 올린 저장본
            { // 조건 시작
                known.set(accountId, { revision: row.revision, parts: {} }); // 서버에 조각이 없다고 기억(다음에 올릴 때 조각으로 바꿈)
                return { ...head, state: row.body }; // 그대로 돌려줌
            } // 조건 종료
            const hashes = [...new Set(Object.values(parts))]; // 필요한 지문
            const bodies: Record<string, string> = {}; // 지문 → 내용
            hashes.forEach((hash) => { const body = cache.get(hash) ?? local[hash]; if (body !== undefined) { bodies[hash] = body; } }); // 이미 가진 것
            const missing = hashes.filter((hash) => bodies[hash] === undefined); // 받아야 할 것
            Object.assign(bodies, missing.length === 0 ? {} : await backend.readBlobs(accountId, missing)); // 없는 조각만 받음
            if (hashes.every((hash) => bodies[hash] !== undefined)) // 모두 모임
            { // 조건 시작
                remember(accountId, row.revision, parts, bodies); // 기억
                return { ...head, state: mergeParts(Object.fromEntries(Object.entries(parts).map(([name, hash]) => [name, bodies[hash]]))) }; // 합쳐서 돌려줌
            } // 조건 종료
        } // 반복 종료
        throw new Error("snapshot parts missing"); // 조각을 다 받지 못함(다음에 다시)
    }; // 함수 종료
    return { // 서버 저장 계약 구현
        mode: backend.mode, // 연습용·실제 서비스
        head: (accountId) => backend.readHead(accountId), // 번호만
        pull, // 받기
        push: async (accountId, state, expectedRevision, deviceId) => // 올리기
        { // 함수 시작
            try // 올리기 시도
            { // 시도 시작
                const next = await hashParts(state); // 올릴 조각
                let base = expectedRevision === null ? { revision: 0, parts: {} } : known.get(accountId); // 서버에 지금 있는 조각(처음이면 없음)
                if (base === undefined || (expectedRevision !== null && base.revision !== expectedRevision)) // 서버 목록을 모르거나 번호가 다름
                { // 조건 시작
                    const row = await backend.readManifest(accountId); // 목록 줄
                    if (row === null || row.revision !== expectedRevision) // 내가 본 번호가 아님
                    { // 조건 시작
                        return { ok: false, reason: "conflict", remote: row === null ? null : { revision: row.revision, updatedAt: row.updatedAt, deviceId: row.deviceId } }; // 겹침
                    } // 조건 종료
                    base = { revision: row.revision, parts: parseManifest(row.body) ?? {} }; // 서버 목록(예전 저장본이면 조각 없음)
                } // 조건 종료
                const onServer = new Set(Object.values(base.parts)); // 서버에 있는 지문
                const fresh = Object.fromEntries(Object.entries(next.bodies).filter(([hash]) => !onServer.has(hash))); // 서버에 없는 조각
                if (Object.keys(fresh).length > 0) // 올릴 조각 있음
                { // 조건 시작
                    await backend.writeBlobs(accountId, fresh); // 바뀐 조각만 올림(목록을 바꾸기 전이라 아직 아무도 보지 않음)
                } // 조건 종료
                const written = await backend.writeManifest(accountId, stringifyManifest(next.names), expectedRevision, deviceId); // 목록 줄을 바꿔 확정
                if (!written.ok) // 확정하지 못함
                { // 조건 시작
                    return written.reason === "conflict" ? { ok: false, reason: "conflict", remote: await backend.readHead(accountId).catch(() => null) } : { ok: false, reason: written.reason }; // 겹침이면 서버 것의 머리를 알림
                } // 조건 종료
                remember(accountId, written.revision, next.names, next.bodies); // 새 목록 기억
                const obsolete = [...onServer].filter((hash) => next.bodies[hash] === undefined); // 새 목록에 없는 예전 조각
                if (obsolete.length > 0) // 지울 조각 있음
                { // 조건 시작
                    await backend.deleteBlobs(accountId, obsolete).catch(() => undefined); // 지움(실패해도 저장은 끝났음)
                } // 조건 종료
                if (!swept && backend.sweepBlobs !== undefined) // 이 화면에서 아직 청소하지 않음
                { // 조건 시작
                    swept = true; // 한 번만
                    void backend.sweepBlobs(accountId).catch(() => undefined); // 버려진 조각 청소(기다리지 않음)
                } // 조건 종료
                return { ok: true, revision: written.revision, updatedAt: written.updatedAt }; // 저장됨
            } // 시도 종료
            catch (error) // 로그인이 끝났거나 서버에 닿지 못함
            { // 실패 시작
                return { ok: false, reason: error instanceof SignedOutError ? "signed-out" : "unavailable" }; // 올리지 못함
            } // 실패 종료
        }, // 함수 종료
    }; // 구현 반환
} // 함수 종료

export const PRACTICE_SERVER_PREFIX = "mateverse:v1:practice-server:"; // 연습용 서버의 목록 줄을 두는 키의 앞부분
export const PRACTICE_BLOB_PREFIX = "mateverse:v1:practice-blob:"; // 연습용 서버의 조각을 두는 키의 앞부분

export function createPracticeBackend(storage: Storage, now: () => string = () => new Date().toISOString()): SnapshotBackend // 연습용 서버(이 브라우저의 저장공간을 서버처럼 씀. 다른 기기와는 이어지지 않음)
{ // 함수 시작
    const read = (accountId: string): ManifestRow | null => // 목록 줄 읽기
    { // 함수 시작
        try // 읽기 시도
        { // 시도 시작
            const parsed = JSON.parse(storage.getItem(`${PRACTICE_SERVER_PREFIX}${accountId}`) ?? "null") as Record<string, unknown> | null; // 해석
            return parsed !== null && typeof parsed === "object" && typeof parsed.revision === "number" && Number.isInteger(parsed.revision) && parsed.revision > 0 && typeof parsed.state === "string" && typeof parsed.updatedAt === "string" && typeof parsed.deviceId === "string" ? { revision: parsed.revision, body: parsed.state, updatedAt: parsed.updatedAt, deviceId: parsed.deviceId } : null; // 목록 줄(모양이 다르면 없음)
        } // 시도 종료
        catch // 글이 깨짐
        { // 실패 시작
            return null; // 없는 것으로 봄
        } // 실패 종료
    }; // 함수 종료
    const blobKey = (accountId: string, hash: string): string => `${PRACTICE_BLOB_PREFIX}${accountId}:${hash}`; // 조각을 두는 키
    return { // 조각을 두는 곳 구현
        mode: "practice", // 연습용
        readHead: async (accountId) => { const row = read(accountId); return row === null ? null : { revision: row.revision, updatedAt: row.updatedAt, deviceId: row.deviceId }; }, // 번호만
        readManifest: async (accountId) => read(accountId), // 목록 줄
        writeManifest: async (accountId, body, expectedRevision, deviceId) => // 목록 줄 쓰기
        { // 함수 시작
            const current = read(accountId); // 지금 줄
            if ((current?.revision ?? null) !== expectedRevision) // 내가 본 번호와 다름
            { // 조건 시작
                return { ok: false, reason: "conflict" }; // 겹침
            } // 조건 종료
            const next = { revision: (current?.revision ?? 0) + 1, state: body, updatedAt: now(), deviceId }; // 새 줄
            try // 저장 시도
            { // 시도 시작
                storage.setItem(`${PRACTICE_SERVER_PREFIX}${accountId}`, JSON.stringify(next)); // 저장
            } // 시도 종료
            catch // 저장공간 부족 등
            { // 실패 시작
                return { ok: false, reason: "unavailable" }; // 저장하지 못함
            } // 실패 종료
            return { ok: true, revision: next.revision, updatedAt: next.updatedAt }; // 저장됨
        }, // 함수 종료
        readBlobs: async (accountId, hashes) => Object.fromEntries(hashes.flatMap((hash) => { const body = storage.getItem(blobKey(accountId, hash)); return body === null ? [] : [[hash, body]]; })), // 조각 읽기
        writeBlobs: async (accountId, blobs) => { Object.entries(blobs).forEach(([hash, body]) => storage.setItem(blobKey(accountId, hash), body)); }, // 조각 쓰기(저장공간이 모자라면 오류)
        deleteBlobs: async (accountId, hashes) => { hashes.forEach((hash) => storage.removeItem(blobKey(accountId, hash))); }, // 조각 지우기
    }; // 구현 반환
} // 함수 종료

export function createPracticeSnapshotStore(storage: Storage, now: () => string = () => new Date().toISOString()): SnapshotStore // 연습용 서버 저장(조각으로 나눠 둠)
{ // 함수 시작
    return createPartedSnapshotStore(createPracticeBackend(storage, now)); // 연습용 서버에 붙인 저장 구현
} // 함수 종료

export function removePracticeServerData(storage: Storage, accountId: string): void // 연습용 서버에서 한 계정의 목록 줄과 조각을 모두 지우기(탈퇴)
{ // 함수 시작
    const blobPrefix = `${PRACTICE_BLOB_PREFIX}${accountId}:`; // 그 계정 조각의 앞부분
    const keys = Array.from({ length: storage.length }, (_item, index) => storage.key(index) ?? "").filter((key) => key === `${PRACTICE_SERVER_PREFIX}${accountId}` || key.startsWith(blobPrefix)); // 지울 키(지우는 동안 순서가 바뀌므로 먼저 모음)
    keys.forEach((key) => storage.removeItem(key)); // 지움
} // 함수 종료
