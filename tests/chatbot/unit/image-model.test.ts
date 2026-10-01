import { describe, expect, it } from "vitest"; // 테스트 도구
import { canUseImageForRating, checkImageRequest, createGeneratedImage, createMockImageSource, isGeneratedImageSource, IMAGE_PROMPT_LIMIT } from "@chatbot/features/images/image-model"; // 이미지 모델
import { getRegionPolicy, resolveServiceRegion } from "@chatbot/lib/config/service-region"; // 지역 정책

describe("이미지 생성 모델", () => // 모델 묶음
{ // 묶음 시작
    it("같은 설명·그림체·비율이면 같은 Mock 이미지를 만들고 비율에 맞는 크기를 쓴다", () => // Mock 결정성 검증
    { // 검증 시작
        const first = createMockImageSource({ prompt: "비 오는 밤의 옥상", style: "anime", aspect: "portrait" }); // 첫 생성
        const second = createMockImageSource({ prompt: "비 오는 밤의 옥상", style: "anime", aspect: "portrait" }); // 같은 입력
        const landscape = createMockImageSource({ prompt: "비 오는 밤의 옥상", style: "anime", aspect: "landscape" }); // 가로 비율
        expect(first).toBe(second); // 같은 결과
        expect(isGeneratedImageSource(first)).toBe(true); // 생성 이미지 형식
        expect(decodeURIComponent(first)).toContain('viewBox="0 0 600 800"'); // 세로 크기
        expect(decodeURIComponent(landscape)).toContain('viewBox="0 0 800 500"'); // 가로 크기
        expect(decodeURIComponent(first)).toContain("<line"); // 비 키워드 장식
    }); // 검증 종료

    it("생성 이미지 형식만 허용하고 스크립트·외부 주소는 거부한다", () => // 형식 검증
    { // 검증 시작
        expect(isGeneratedImageSource("data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C%2Fsvg%3E")).toBe(true); // 허용
        expect(isGeneratedImageSource("https://example.com/a.png")).toBe(false); // 외부 주소 거부
        expect(isGeneratedImageSource("data:text/html,<script>alert(1)</script>")).toBe(false); // 다른 형식 거부
        expect(isGeneratedImageSource(`data:image/svg+xml;charset=utf-8,${"a".repeat(70_000)}`)).toBe(false); // 너무 큰 이미지 거부
    }); // 검증 종료

    it("실존 인물을 그리거나 합성하는 요청은 등급과 관계없이 막는다", () => // 실존 인물 검증
    { // 검증 시작
        for (const prompt of ["유명 연예인 얼굴로 그려 줘", "실존 인물 사진 합성", "아이돌 멤버 딥페이크"]) // 금지 문장 순회
        { // 순회 시작
            const result = checkImageRequest({ prompt, contentRating: "all" }); // 검사
            expect(result, prompt).toEqual({ ok: false, category: "real-person", message: "실존 인물을 그리거나 합성하는 이미지는 만들 수 없어요." }); // 거부 확인
        } // 순회 종료
    }); // 검증 종료

    it("미성년자로 보이는 인물은 19세 이미지로 만들 수 없고 전체·15세 이미지는 허용한다", () => // 미성년자 검증
    { // 검증 시작
        expect(checkImageRequest({ prompt: "교복 입은 고등학생", contentRating: "mature" })).toEqual({ ok: false, category: "minor", message: "미성년자로 보이는 인물은 19세 이미지로 만들 수 없어요." }); // 19세 거부
        expect(checkImageRequest({ prompt: "열다섯 살 소년", contentRating: "mature" })).toMatchObject({ ok: false, category: "minor" }); // 나이 표현 거부
        expect(checkImageRequest({ prompt: "16살 주인공", contentRating: "mature" })).toMatchObject({ ok: false, category: "minor" }); // 숫자 나이 거부
        expect(checkImageRequest({ prompt: "교복 입은 고등학생이 운동장을 달린다", contentRating: "all" })).toEqual({ ok: true }); // 전체 이용가 허용
        expect(checkImageRequest({ prompt: "성인 바텐더가 웃는다", contentRating: "mature" })).toEqual({ ok: true }); // 성인 19세 허용
    }); // 검증 종료

    it("빈 설명과 너무 긴 설명은 막는다", () => // 길이 검증
    { // 검증 시작
        expect(checkImageRequest({ prompt: "  ", contentRating: "all" })).toMatchObject({ ok: false, category: "invalid" }); // 빈 설명
        expect(checkImageRequest({ prompt: "가".repeat(IMAGE_PROMPT_LIMIT + 1), contentRating: "all" })).toMatchObject({ ok: false, category: "invalid" }); // 긴 설명
    }); // 검증 종료

    it("19세 이미지는 지역 정책에 따라 가림 처리 여부를 기록하고 나머지는 해당 없음으로 둔다", () => // 노출 정책 검증
    { // 검증 시작
        const base = { prompt: "달빛 아래 기사", style: "anime" as const, aspect: "square" as const, referenceCharacterId: null }; // 공통 입력
        expect(createGeneratedImage({ ...base, contentRating: "mature" }, "kr", "2026-10-01T00:00:00.000Z", "image-1").exposure).toBe("covered"); // 한국 가림
        expect(createGeneratedImage({ ...base, contentRating: "mature" }, "global", "2026-10-01T00:00:00.000Z", "image-2").exposure).toBe("uncovered"); // 해외 가림 없음
        expect(createGeneratedImage({ ...base, contentRating: "teen" }, "global", "2026-10-01T00:00:00.000Z", "image-3").exposure).toBe("none"); // 19세 아님
    }); // 검증 종료

    it("서비스 지역은 설정값이 global일 때만 해외 정책을 쓰고 기본은 한국이다", () => // 지역 결정 검증
    { // 검증 시작
        expect(resolveServiceRegion(undefined)).toBe("kr"); // 기본 한국
        expect(resolveServiceRegion("global")).toBe("global"); // 해외
        expect(resolveServiceRegion("us")).toBe("kr"); // 모르는 값은 한국
        expect(getRegionPolicy("kr")).toMatchObject({ exposure: "covered" }); // 한국 정책
        expect(getRegionPolicy("global")).toMatchObject({ exposure: "uncovered" }); // 해외 정책
    }); // 검증 종료

    it("작품 등급보다 높은 등급의 이미지는 표지·장면으로 쓸 수 없다", () => // 등급 사용 검증
    { // 검증 시작
        expect(canUseImageForRating("mature", "teen")).toBe(false); // 19세 이미지를 15세 작품에
        expect(canUseImageForRating("teen", "mature")).toBe(true); // 15세 이미지를 19세 작품에
        expect(canUseImageForRating("all", "all")).toBe(true); // 같은 등급
    }); // 검증 종료
}); // 묶음 종료
