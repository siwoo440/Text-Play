import type { TextPlayLogEntry, TextPlayPackage } from "@/features/text-play/core/types"; // 이야기 계약

export interface TextPlayStoryPage // 이야기 페이지 계약
{ // 계약 시작
    entries: TextPlayLogEntry[]; // 페이지 기록
    sceneId: string; // 연결 장면
} // 계약 종료

export function buildTextPlayStoryPages(entries: TextPlayLogEntry[], packageData: TextPlayPackage, currentSceneId?: string): TextPlayStoryPage[] // 이야기 페이지 생성기
{ // 함수 시작
    const groupedEntries: TextPlayLogEntry[][] = []; // 묶음 목록
    for (const entry of entries) // 기록 순회
    { // 순회 시작
        if (entry.kind === "system" || groupedEntries.length === 0) // 새 턴 확인
        { // 조건 시작
            groupedEntries.push([entry]); // 새 묶음 추가
            continue; // 다음 기록 이동
        } // 조건 종료
        groupedEntries[groupedEntries.length - 1].push(entry); // 현재 묶음 추가
    } // 순회 종료
    if (groupedEntries.length === 0) // 빈 기록 확인
    { // 조건 시작
        groupedEntries.push([]); // 기본 턴 추가
    } // 조건 종료
    let activeSceneId = packageData.initialSceneId; // 시작 장면 설정
    const pages = groupedEntries.map((pageEntries) => // 페이지 변환
    { // 변환 시작
        const matchedScene = packageData.scenes.find((scene) => pageEntries.some((entry) => entry.kind === "narration" && entry.content === scene.narration)); // 장면 서술 연결
        if (matchedScene !== undefined) // 연결 장면 확인
        { // 조건 시작
            activeSceneId = matchedScene.id; // 연결 장면 갱신
        } // 조건 종료
        return { entries: pageEntries, sceneId: activeSceneId }; // 페이지 반환
    }); // 변환 종료
    if (currentSceneId !== undefined && packageData.scenes.some((scene) => scene.id === currentSceneId)) // 현재 장면 확인
    { // 조건 시작
        pages[pages.length - 1] = { ...pages[pages.length - 1], sceneId: currentSceneId }; // 최신 장면 보정
    } // 조건 종료
    return pages; // 페이지 목록 반환
} // 함수 종료
