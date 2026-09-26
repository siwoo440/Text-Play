import type { ImageGenerationAdapter, SceneAsset, SceneInput } from "@/lib/adapters/image-generation-adapter"; // 이미지 계약

const scenePaths: Record<string, string> = // 장면 경로
{ // 경로 시작
    dawn: "/images/scenes/dawn-letter.svg", // 새벽 장면
    rain: "/images/scenes/rainy-classroom.svg", // 비 장면
    library: "/images/scenes/moon-library.svg", // 기록관 장면
    fallback: "/images/scenes/fallback-scene.svg", // 대체 장면
}; // 경로 종료

export class MockImageAdapter implements ImageGenerationAdapter // Mock 이미지 어댑터
{ // 클래스 시작
    private cancelled = false; // 취소 상태

    public async generateScene(input: SceneInput): Promise<SceneAsset> // 장면 생성
    { // 함수 시작
        this.cancelled = false; // 취소 초기화
        const path = scenePaths[input.sceneId] ?? scenePaths.fallback; // 경로 선택
        await Promise.resolve(); // 비동기 경계
        if (this.cancelled) // 취소 판정
        { // 조건 시작
            throw new Error("장면 생성을 취소했습니다."); // 취소 오류
        } // 조건 종료
        return { sceneId: input.sceneId, path, fallback: path === scenePaths.fallback }; // 장면 반환
    } // 함수 종료

    public regenerateScene(input: SceneInput): Promise<SceneAsset> // 장면 재생성
    { // 함수 시작
        return this.generateScene(input); // 동일 Mock 생성
    } // 함수 종료

    public cancelGeneration(): void // 생성 취소
    { // 함수 시작
        this.cancelled = true; // 취소 표시
    } // 함수 종료
} // 클래스 종료
