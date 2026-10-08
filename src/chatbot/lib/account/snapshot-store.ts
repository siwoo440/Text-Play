// 서버 저장 계약: 계정의 앱 데이터를 통째로 한 벌(저장본) 보관하고, 번호로 "내가 본 뒤에 다른 기기가 바꿨는지"를 가린다. 지금은 연습용 구현만 있다.
export interface RemoteSnapshot // 서버에 있는 저장본
{ // 구조 시작
    revision: number; // 저장 번호(저장할 때마다 1씩 오름)
    state: string; // 앱 데이터(JSON 글)
    updatedAt: string; // 저장한 시각
    deviceId: string; // 저장한 기기
} // 구조 종료

export type PushResult = // 올리기 결과
    | { ok: true; revision: number; updatedAt: string } // 저장됨(새 번호)
    | { ok: false; reason: "conflict"; remote: RemoteSnapshot | null } // 내가 본 번호와 서버 번호가 다름(다른 기기가 먼저 저장)
    | { ok: false; reason: "unavailable" }; // 서버에 닿지 못함·받지 않음

export interface SnapshotStore // 서버 저장 계약
{ // 구조 시작
    readonly mode: "practice" | "live"; // 연습용인지 실제 서비스인지
    pull(accountId: string): Promise<RemoteSnapshot | null>; // 저장본 받기(없으면 null)
    push(accountId: string, state: string, expectedRevision: number | null, deviceId: string): Promise<PushResult>; // 저장본 올리기(내가 본 번호와 같을 때만 저장)
} // 구조 종료

export const PRACTICE_SERVER_PREFIX = "mateverse:v1:practice-server:"; // 연습용 서버 저장 키의 앞부분

function isRemoteSnapshot(value: unknown): value is RemoteSnapshot // 저장본 모양 판정
{ // 함수 시작
    if (typeof value !== "object" || value === null) // 객체 아님
    { // 조건 시작
        return false; // 저장본 아님
    } // 조건 종료
    const record = value as Record<string, unknown>; // 읽은 값
    return typeof record.revision === "number" && Number.isInteger(record.revision) && record.revision > 0 && typeof record.state === "string" && typeof record.updatedAt === "string" && typeof record.deviceId === "string"; // 모양 확인
} // 함수 종료

export function createPracticeSnapshotStore(storage: Storage, now: () => string = () => new Date().toISOString()): SnapshotStore // 연습용 서버(이 브라우저의 저장공간을 서버처럼 씀. 다른 기기와는 이어지지 않음)
{ // 함수 시작
    const read = (accountId: string): RemoteSnapshot | null => // 저장본 읽기
    { // 함수 시작
        try // 읽기 시도
        { // 시도 시작
            const parsed: unknown = JSON.parse(storage.getItem(`${PRACTICE_SERVER_PREFIX}${accountId}`) ?? "null"); // 해석
            return isRemoteSnapshot(parsed) ? parsed : null; // 저장본 반환
        } // 시도 종료
        catch // 글이 깨짐
        { // 실패 시작
            return null; // 없는 것으로 봄
        } // 실패 종료
    }; // 함수 종료
    return { // 서버 저장 계약 구현
        mode: "practice", // 연습용
        pull: async (accountId) => read(accountId), // 받기
        push: async (accountId, state, expectedRevision, deviceId) => // 올리기
        { // 함수 시작
            const current = read(accountId); // 지금 서버 저장본
            if ((current?.revision ?? null) !== expectedRevision) // 내가 본 번호와 다름
            { // 조건 시작
                return { ok: false, reason: "conflict", remote: current }; // 겹침
            } // 조건 종료
            const next: RemoteSnapshot = { revision: (current?.revision ?? 0) + 1, state, updatedAt: now(), deviceId }; // 새 저장본
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
    }; // 구현 반환
} // 함수 종료
