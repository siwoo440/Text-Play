import { describe, expect, it } from "vitest"; // 테스트 도구
import { buildTextPlayStoryPages } from "@/features/text-play/ui/text-play-story-pages"; // 페이지 생성기
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import type { TextPlayLogEntry } from "@/features/text-play/core/types"; // 기록 계약

describe("Text-Play 이야기 페이지", () => // 페이지 검증 묶음
{ // 묶음 시작
    it("사용자 행동부터 다음 행동 전까지를 한 턴으로 묶는다", () => // 턴 묶음 검증
    { // 테스트 시작
        const entries: TextPlayLogEntry[] = // 기록 목록
        [ // 목록 시작
            { id: "log-0", kind: "narration", speaker: null, content: DEMO_TEXT_PLAY_PACKAGE.scenes[0].narration, createdAt: "2026-09-29T00:00:00.000Z" }, // 첫 장면 기록
            { id: "log-1", kind: "system", speaker: null, content: "문을 연다", createdAt: "2026-09-29T00:01:00.000Z" }, // 두 번째 턴 행동
            { id: "log-2", kind: "narration", speaker: null, content: DEMO_TEXT_PLAY_PACKAGE.scenes[1].narration, createdAt: "2026-09-29T00:01:00.000Z" }, // 두 번째 턴 서술
            { id: "log-3", kind: "dialogue", speaker: "리라", content: "조심해.", createdAt: "2026-09-29T00:01:00.000Z" }, // 두 번째 턴 대사
            { id: "log-4", kind: "system", speaker: null, content: "주변을 살핀다", createdAt: "2026-09-29T00:02:00.000Z" }, // 세 번째 턴 행동
            { id: "log-5", kind: "narration", speaker: null, content: "새 이미지가 없는 응답", createdAt: "2026-09-29T00:02:00.000Z" }, // 세 번째 턴 서술
        ]; // 목록 종료
        const pages = buildTextPlayStoryPages(entries, DEMO_TEXT_PLAY_PACKAGE); // 페이지 생성
        expect(pages).toHaveLength(3); // 턴 개수 확인
        expect(pages[1].entries).toHaveLength(3); // 혼합 기록 묶음 확인
        expect(pages[1].sceneId).toBe("moonlit-hall"); // 연결 장면 확인
        expect(pages[2].sceneId).toBe("moonlit-hall"); // 직전 이미지 유지 확인
    }); // 테스트 종료
}); // 묶음 종료
