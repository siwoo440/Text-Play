import type { TextPlayPackage, TextPlayState } from "@/features/text-play/core/types"; // 도메인 계약
import type { StructuredLLMInput } from "@/lib/adapters/llm-adapter"; // 구조화 LLM 계약

export function buildTextPlayContext(packageData: TextPlayPackage, state: TextPlayState, userInput: string): StructuredLLMInput // Text-Play 문맥 생성
{ // 함수 시작
    const context = // 최소 문맥
    { // 문맥 시작
        packageId: packageData.id, // 작품 식별자
        sceneId: state.sceneId, // 현재 장면
        locationId: state.locationId, // 현재 위치
        stats: state.stats, // 현재 능력치
        inventory: state.inventory, // 현재 인벤토리
        activeQuestIds: state.activeQuestIds, // 진행 퀘스트
        relations: state.relations, // 현재 관계도
        allowedItemIds: packageData.itemIds, // 허용 아이템
        allowedLocationIds: packageData.locationIds, // 허용 장소
        allowedQuestIds: packageData.questIds, // 허용 퀘스트
        allowedEventIds: packageData.eventIds, // 허용 이벤트
        allowedCharacterIds: packageData.characterIds, // 허용 캐릭터
    }; // 문맥 종료

    return { // 구조화 입력 반환
        system: "서술과 대사를 생성하되 게임 상태 변경은 허용된 proposedActions로만 제안한다.", // 시스템 규칙
        context: JSON.stringify(context), // 직렬화 문맥
        userInput, // 사용자 입력
        responseSchema: "{ narration: string, dialogue: { speaker: string, content: string } | null, proposedActions: TextPlayAction[] }", // 응답 스키마
    }; // 입력 종료
} // 함수 종료
