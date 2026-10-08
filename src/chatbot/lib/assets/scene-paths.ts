export const scenePaths = // 장면 그림 경로(사용자가 GPT로 만든 그림, 1200×800 WebP)
{ // 경로 시작
    dawn: "/images/scenes/dawn-letter.webp", // 새벽의 편지
    rain: "/images/scenes/rainy-classroom.webp", // 비 오는 교실
    library: "/images/scenes/moon-library.webp", // 달빛 기록관
    fallback: "/images/scenes/fallback-scene.webp", // 기본 장면
} as const; // 경로 종료

const legacyScenePaths: Record<string, string> = // 예전 임시 그림(SVG) → 새 그림
{ // 대응 시작
    "/images/scenes/dawn-letter.svg": scenePaths.dawn, // 새벽
    "/images/scenes/rainy-classroom.svg": scenePaths.rain, // 비
    "/images/scenes/moon-library.svg": scenePaths.library, // 기록관
    "/images/scenes/fallback-scene.svg": scenePaths.fallback, // 기본
}; // 대응 종료

export function upgradeScenePath(path: string): string // 예전 장면 경로를 새 경로로(그 밖의 경로는 그대로)
{ // 함수 시작
    return legacyScenePaths[path] ?? path; // 대응 경로 반환
} // 함수 종료
