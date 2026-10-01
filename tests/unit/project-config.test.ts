import { readFileSync } from "node:fs"; // 파일 읽기 도구
import { describe, expect, it } from "vitest"; // 테스트 도구
import webConfig from "../../playwright.config"; // 웹 종단 설정
import desktopConfig from "../../playwright.desktop.config"; // 데스크톱 종단 설정
import { metadata as rootMetadata } from "@/app/layout"; // 루트 문서 정보
import { metadata as textPlayMetadata } from "@/app/text-play/page"; // Text-Play 홈 문서 정보
import { metadata as demoMetadata } from "@/app/text-play/demo/page"; // 샘플 플레이 문서 정보

describe("프로젝트 설정", () => // 설정 검증 묶음
{ // 묶음 시작
    it("웹 종단 테스트는 데스크톱 전용 테스트를 제외하고 다른 앱과 겹치지 않는 전용 포트를 쓴다", () => // 종단 설정 검증
    { // 테스트 시작
        expect(webConfig.testIgnore).toContain("desktop-preview.spec.ts"); // 데스크톱 테스트 제외 확인
        expect(webConfig.use?.baseURL).toBe("http://127.0.0.1:3100"); // 웹 전용 주소 확인
        expect(webConfig.webServer).toMatchObject({ url: "http://127.0.0.1:3100", reuseExistingServer: false }); // 전용 서버 확인
        expect(desktopConfig.testMatch).toBe("desktop-preview.spec.ts"); // 데스크톱 테스트 선택 확인
    }); // 테스트 종료

    it("next-env.d.ts는 저장소에서 제외하고 타입 검사 전에 자동 생성한다", () => // 자동 생성 파일 검증
    { // 테스트 시작
        const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> }; // 패키지 정보 읽기
        const ignoredPaths = readFileSync(".gitignore", "utf8").split(/\r?\n/); // 제외 목록 읽기
        expect(packageJson.scripts.typecheck).toBe("next typegen && tsc --noEmit"); // 타입 생성 선행 확인
        expect(ignoredPaths).toContain("next-env.d.ts"); // 제외 등록 확인
    }); // 테스트 종료

    it("브라우저 탭에 화면별 제목을 표시한다", () => // 문서 제목 검증
    { // 테스트 시작
        expect(rootMetadata.title).toEqual({ default: "Mate Verse", template: "%s · Mate Verse" }); // 기본 제목 확인
        expect(textPlayMetadata.title).toBe("Text-Play"); // 홈 제목 확인
        expect(demoMetadata.title).toBe("달빛 숲의 기록 · Text-Play"); // 플레이 제목 확인
    }); // 테스트 종료
}); // 묶음 종료
