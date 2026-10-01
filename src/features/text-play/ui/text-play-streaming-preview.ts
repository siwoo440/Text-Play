const NARRATION_KEY_PATTERN = /"narration"\s*:\s*"/; // 서술 값 시작 패턴

const SIMPLE_ESCAPES: Record<string, string> = { "\"": "\"", "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" }; // 단순 이스케이프 표

export function extractStreamingNarration(raw: string): string // 스트리밍 서술 추출기
{ // 함수 시작
    if (!raw.trimStart().startsWith("{")) // 구조화 응답 여부 확인
    { // 조건 시작
        return raw; // 평문 응답 반환
    } // 조건 종료
    const keyMatch = NARRATION_KEY_PATTERN.exec(raw); // 서술 키 위치 조회
    if (keyMatch === null) // 서술 키 도착 확인
    { // 조건 시작
        return ""; // 빈 서술 반환
    } // 조건 종료
    let narration = ""; // 추출 서술
    let index = keyMatch.index + keyMatch[0].length; // 서술 값 시작 위치
    while (index < raw.length) // 받은 문자 순회
    { // 순회 시작
        const character = raw[index]; // 현재 문자
        if (character === "\"") // 서술 종료 확인
        { // 조건 시작
            return narration; // 완성 서술 반환
        } // 조건 종료
        if (character !== "\\") // 일반 문자 확인
        { // 조건 시작
            narration += character; // 문자 추가
            index += 1; // 다음 문자 이동
            continue; // 다음 순회
        } // 조건 종료
        const escaped = raw[index + 1]; // 이스케이프 대상 문자
        if (escaped === undefined) // 끊긴 이스케이프 확인
        { // 조건 시작
            return narration; // 받은 서술까지 반환
        } // 조건 종료
        if (escaped === "u") // 유니코드 이스케이프 확인
        { // 조건 시작
            const hex = raw.slice(index + 2, index + 6); // 유니코드 값
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) // 완성 여부 확인
            { // 조건 시작
                return narration; // 받은 서술까지 반환
            } // 조건 종료
            narration += String.fromCharCode(Number.parseInt(hex, 16)); // 유니코드 문자 추가
            index += 6; // 유니코드 건너뛰기
            continue; // 다음 순회
        } // 조건 종료
        narration += SIMPLE_ESCAPES[escaped] ?? escaped; // 단순 이스케이프 추가
        index += 2; // 이스케이프 건너뛰기
    } // 순회 종료
    return narration; // 받은 서술 반환
} // 함수 종료
