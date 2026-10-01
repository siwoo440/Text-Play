import { describe, expect, it } from "vitest"; // 테스트 도구
import { getGenreKey, getGenreKeyByLabel, getGenreLabel } from "@chatbot/lib/theme/genre-theme"; // 장르 색 도구

describe("장르 색 판정", () => // 장르 묶음
{ // 묶음 시작
    it("태그 순서에서 처음 나오는 장르를 대표 장르로 고른다", () => // 대표 장르 검증
    { // 검증 시작
        expect(getGenreKey(["현대", "음악", "힐링"])).toBe("modern"); // 첫 장르 우선
        expect(getGenreKey(["감정 교류", "판타지", "도서관"])).toBe("fantasy"); // 비장르 태그 건너뛰기
        expect(getGenreKey(["SF", "우주"])).toBe("sf"); // SF 판정
    }); // 검증 종료

    it("장르 태그가 없으면 기타로 판정하고 첫 태그를 이름으로 쓴다", () => // 기타 장르 검증
    { // 검증 시작
        expect(getGenreKey(["스팀펑크", "장인"])).toBe("other"); // 기타 판정
        expect(getGenreLabel(["스팀펑크", "장인"])).toBe("스팀펑크"); // 첫 태그 이름
        expect(getGenreLabel([])).toBe("이야기"); // 빈 태그 이름
        expect(getGenreLabel(["로맨스", "일상"])).toBe("로맨스"); // 장르 이름
    }); // 검증 종료

    it("필터 이름을 장르 색으로 변환한다", () => // 필터 변환 검증
    { // 검증 시작
        expect(getGenreKeyByLabel("전체")).toBe("all"); // 전체 변환
        expect(getGenreKeyByLabel("미스터리")).toBe("mystery"); // 장르 변환
        expect(getGenreKeyByLabel("없는 장르")).toBe("other"); // 기타 변환
    }); // 검증 종료
}); // 묶음 종료
