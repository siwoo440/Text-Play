import type { TextPlayChoice, TextPlayPackage, TextPlayScene, TextPlayState } from "@/features/text-play/core/types"; // 도메인 계약

export function findTextPlayScene(packageData: TextPlayPackage, sceneId: string): TextPlayScene | null // 장면 조회
{ // 함수 시작
    return packageData.scenes.find((scene) => scene.id === sceneId) ?? null; // 일치 장면 반환
} // 함수 종료

export function getAvailableChoices(packageData: TextPlayPackage, state: TextPlayState): TextPlayChoice[] // 선택지 조회
{ // 함수 시작
    if (state.endingId !== null) // 엔딩 여부 확인
    { // 조건 시작
        return []; // 엔딩 선택지 차단
    } // 조건 종료

    return (findTextPlayScene(packageData, state.sceneId)?.choices ?? []).filter((choice) => choice.requiredItemId === undefined || (state.inventory[choice.requiredItemId] ?? 0) > 0); // 보유 조건을 만족하는 선택지 반환
} // 함수 종료
