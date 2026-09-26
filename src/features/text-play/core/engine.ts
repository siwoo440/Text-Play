import { applyTextPlayActions, type TextPlayEngineResult } from "@/features/text-play/core/actions"; // 액션 처리기
import { findTextPlayScene, getAvailableChoices } from "@/features/text-play/core/conditions"; // 장면·선택지 조회
import type { TextPlayChoice, TextPlayPackage, TextPlayState } from "@/features/text-play/core/types"; // 도메인 계약

export { applyTextPlayActions, getAvailableChoices }; // 공개 엔진 함수

export function createTextPlayState(packageData: TextPlayPackage, now: string): TextPlayState // 초기 상태 생성
{ // 함수 시작
    const initialScene = findTextPlayScene(packageData, packageData.initialSceneId); // 시작 장면 조회
    if (initialScene === null) // 시작 장면 확인
    { // 조건 시작
        throw new Error("Text-Play 패키지의 시작 장면을 찾을 수 없습니다."); // 패키지 오류 발생
    } // 조건 종료

    return { // 초기 상태 반환
        packageId: packageData.id, // 작품 식별자
        packageVersion: packageData.version, // 작품 버전
        saveSchemaVersion: packageData.saveSchemaVersion, // 저장 스키마 버전
        sceneId: packageData.initialSceneId, // 시작 장면
        locationId: packageData.initialLocationId, // 시작 위치
        stats: { ...packageData.initialStats }, // 초기 능력치
        relations: { ...packageData.initialRelations }, // 초기 관계도
        inventory: {}, // 빈 인벤토리
        activeQuestIds: [], // 빈 진행 퀘스트
        completedQuestIds: [], // 빈 완료 퀘스트
        eventFlags: {}, // 빈 이벤트 상태
        endingId: initialScene.endingId, // 초기 엔딩 상태
        log: // 초기 기록
        [ // 기록 시작
            { // 서술 기록 시작
                id: "log-0", // 기록 식별자
                kind: "narration", // 기록 종류
                speaker: null, // 발화자 없음
                content: initialScene.narration, // 시작 서술
                createdAt: now, // 생성 시각
            }, // 서술 기록 종료
        ], // 기록 종료
        playTimeSeconds: 0, // 초기 플레이 시간
        updatedAt: now, // 초기 갱신 시각
    }; // 상태 종료
} // 함수 종료

export function selectTextPlayChoice(packageData: TextPlayPackage, state: TextPlayState, choiceId: string, now: string): TextPlayEngineResult // 선택지 적용
{ // 함수 시작
    if (state.endingId !== null) // 엔딩 상태 확인
    { // 조건 시작
        return { ok: false, reason: "ending-reached", state }; // 엔딩 입력 거부
    } // 조건 종료

    const choice: TextPlayChoice | undefined = getAvailableChoices(packageData, state).find((candidate) => candidate.id === choiceId); // 선택지 조회
    if (choice === undefined) // 선택지 존재 확인
    { // 조건 시작
        return { ok: false, reason: "unknown-choice", state }; // 선택지 오류 반환
    } // 조건 종료

    const targetScene = findTextPlayScene(packageData, choice.targetSceneId); // 대상 장면 조회
    if (targetScene === null) // 대상 장면 확인
    { // 조건 시작
        return { ok: false, reason: "unknown-scene", state }; // 장면 오류 반환
    } // 조건 종료

    const actionResult = applyTextPlayActions(packageData, state, choice.actions, now); // 선택 액션 적용
    if (!actionResult.ok) // 액션 성공 확인
    { // 조건 시작
        return actionResult; // 액션 실패 반환
    } // 조건 종료

    const nextState: TextPlayState = // 장면 이동 상태
    { // 상태 시작
        ...actionResult.state, // 액션 상태 복사
        sceneId: targetScene.id, // 대상 장면 적용
        locationId: targetScene.locationId, // 대상 위치 적용
        endingId: targetScene.endingId, // 엔딩 상태 적용
        log: // 기록 갱신
        [ // 기록 시작
            ...actionResult.state.log, // 기존 기록 복사
            { // 선택 기록 시작
                id: `log-${actionResult.state.log.length}`, // 기록 식별자
                kind: "system", // 기록 종류
                speaker: null, // 발화자 없음
                content: choice.label, // 선택 내용
                createdAt: now, // 생성 시각
            }, // 선택 기록 종료
            { // 장면 기록 시작
                id: `log-${actionResult.state.log.length + 1}`, // 기록 식별자
                kind: "narration", // 기록 종류
                speaker: null, // 발화자 없음
                content: targetScene.narration, // 장면 서술
                createdAt: now, // 생성 시각
            }, // 장면 기록 종료
        ], // 기록 종료
        updatedAt: now, // 갱신 시각 적용
    }; // 상태 종료
    return { ok: true, state: nextState }; // 성공 상태 반환
} // 함수 종료
