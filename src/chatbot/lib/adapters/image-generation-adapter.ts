export interface SceneInput // 장면 입력
{ // 구조 시작
    sceneId: string; // 장면 식별자
} // 구조 종료

export interface SceneAsset // 장면 결과
{ // 구조 시작
    sceneId: string; // 장면 식별자
    path: string; // 이미지 경로
    fallback: boolean; // 대체 이미지 여부
} // 구조 종료

export interface ImageGenerationAdapter // 이미지 어댑터
{ // 구조 시작
    generateScene(input: SceneInput): Promise<SceneAsset>; // 장면 생성
    regenerateScene(input: SceneInput): Promise<SceneAsset>; // 장면 재생성
    cancelGeneration(): void; // 생성 취소
} // 구조 종료
