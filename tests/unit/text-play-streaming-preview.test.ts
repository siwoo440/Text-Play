import { describe, expect, it } from "vitest"; // 테스트 도구
import { extractStreamingNarration } from "@/features/text-play/ui/text-play-streaming-preview"; // 스트리밍 서술 추출기

describe("스트리밍 서술 추출", () => // 추출 검증 묶음
{ // 묶음 시작
    it("구조화 응답 원문에서 지금까지 받은 서술만 꺼낸다", () => // 부분 서술 검증
    { // 테스트 시작
        expect(extractStreamingNarration("{\"narration\":\"낡은 기록")).toBe("낡은 기록"); // 미완성 서술 확인
        expect(extractStreamingNarration("{\"narration\":\"끝난 서술\",\"dialogue\":null}")).toBe("끝난 서술"); // 완성 서술 확인
    }); // 테스트 종료

    it("이스케이프 문자를 풀고 끊긴 이스케이프는 숨긴다", () => // 이스케이프 검증
    { // 테스트 시작
        expect(extractStreamingNarration("{\"narration\":\"첫 줄\\n둘째 \\\"인용\\\"")).toBe("첫 줄\n둘째 \"인용\""); // 이스케이프 해제 확인
        expect(extractStreamingNarration("{\"narration\":\"달빛\\")).toBe("달빛"); // 끊긴 이스케이프 확인
        expect(extractStreamingNarration("{\"narration\":\"\\uC548\\uAC1C")).toBe("안개"); // 유니코드 해제 확인
        expect(extractStreamingNarration("{\"narration\":\"달\\uC5")).toBe("달"); // 끊긴 유니코드 확인
    }); // 테스트 종료

    it("서술 키가 아직 없으면 빈 문자열을, 구조화 응답이 아니면 원문을 돌려준다", () => // 예외 입력 검증
    { // 테스트 시작
        expect(extractStreamingNarration("{\"narr")).toBe(""); // 키 도착 전 확인
        expect(extractStreamingNarration("")).toBe(""); // 빈 입력 확인
        expect(extractStreamingNarration("평문 응답")).toBe("평문 응답"); // 평문 확인
    }); // 테스트 종료
}); // 묶음 종료
