import { fireEvent, screen, within } from "@testing-library/react"; // 화면 테스트 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { beforeEach, describe, expect, it, vi } from "vitest"; // 테스트 도구
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import { CharacterDetail } from "@chatbot/features/character/CharacterDetail"; // 캐릭터 상세
import { resolveConversationRoute } from "@chatbot/features/character/character-detail-model"; // 대화 주소 선택
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더 도구

const routerPush = vi.hoisted(() => vi.fn()); // 경로 이동 기록

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    useRouter: () => ({ push: routerPush }), // 이동 함수 제공
})); // 대체 종료

function CharacterConversationProbe({ characterId }: { characterId: string }) // 대화 확인 요소
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    const conversations = state.conversations.filter((conversation) => conversation.characterId === characterId); // 캐릭터 대화 조회
    return <output aria-label={`${characterId} 대화 식별자`}>{conversations.map((conversation) => conversation.id).join("|")}</output>; // 식별자 출력
} // 함수 종료

function CharacterReportProbe({ characterId }: { characterId: string }) // 신고 확인 요소
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    return <output aria-label={`${characterId} 신고 개수`}>{state.localReports.filter((report) => report.characterId === characterId).length}</output>; // 신고 개수 출력
} // 함수 종료

describe("캐릭터 상세 대화 시작", () => // 상세 묶음
{ // 묶음 시작
    beforeEach(() => // 테스트 초기화
    { // 초기화 시작
        routerPush.mockReset(); // 이동 기록 초기화
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined }); // 클립보드 초기화
    }); // 초기화 종료

    it("다른 캐릭터 버전 주소를 요청하면 대상 캐릭터의 원본 버전으로 복구한다", () => // 교차 주소 복구 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const selection = resolveConversationRoute(state, "rian", "conversation-sera", "conversation-sera-version-1"); // 잘못된 주소 선택
        expect(selection.conversation.id).toBe("conversation-rian"); // 대상 대화 확인
        expect(selection.version.id).toBe("conversation-rian-version-1"); // 원본 버전 확인
        expect(selection.canonicalHref).toBe("/chat/rian?conversation=conversation-rian&version=conversation-rian-version-1"); // 정규 주소 확인
        expect(selection.recovered).toBe(true); // 복구 여부 확인
    }); // 검증 종료

    it("하린의 히어로 정보와 샘플 지표를 표시한다", () => // 히어로 표시 검증
    { // 검증 시작
        renderWithApp(<CharacterDetail characterId="harin" />); // 상세 화면 렌더
        expect(screen.getByRole("heading", { level: 1, name: "퇴근길 카페의 하린" })).toBeVisible(); // 캐릭터 이름 확인
        expect(screen.getAllByText("저녁다섯시")[0]).toBeVisible(); // 제작자 확인
        expect(screen.getByText("매일 같은 시간 당신의 표정을 먼저 알아보는 바리스타")).toBeVisible(); // 소개 확인
        expect(screen.getByText("따뜻한 위로")).toBeVisible(); // 배지 확인
        expect(screen.getByText("전체 이용가")).toBeVisible(); // 등급 확인
        expect(screen.getByText("#일상")).toBeVisible(); // 태그 확인
        expect(screen.getByText("샘플 데이터")).toBeVisible(); // 샘플 표시 확인
        expect(screen.getByRole("button", { name: "퇴근길 카페의 하린 좋아요" })).toBeVisible(); // 좋아요 동작 확인
        expect(screen.getByRole("button", { name: "퇴근길 카페의 하린 공유" })).toBeVisible(); // 공유 동작 확인
        expect(screen.getByRole("button", { name: "히어로 새 대화 시작" })).toBeVisible(); // 히어로 대화 동작 확인
        expect(screen.getByText("로컬 전용 · 서버 동기화 없음")).toBeVisible(); // 팔로우 범위 확인
    }); // 검증 종료

    it("태그를 탐색 페이지 태그 결과로 연결하고 대표 장르색을 적용한다", () => // 태그 연결 검증
    { // 검증 시작
        renderWithApp(<CharacterDetail characterId="harin" />); // 상세 화면 렌더
        const tags = within(screen.getByRole("list", { name: "캐릭터 태그" })).getAllByRole("link"); // 태그 링크 조회
        expect(tags.map((tag) => tag.textContent)).toEqual(["#일상", "#힐링", "#로맨스"]); // 태그 순서 확인
        expect(tags[1]).toHaveAttribute("href", "/explore?tag=%ED%9E%90%EB%A7%81"); // 탐색 주소 확인
        expect(screen.getByRole("main")).toHaveAttribute("data-genre", "healing"); // 대표 장르 확인
        const related = within(screen.getByRole("list", { name: "연관 캐릭터" })).getAllByRole("link"); // 연관 카드 조회
        expect(related.every((link) => link.hasAttribute("data-genre"))).toBe(true); // 연관 장르색 확인
    }); // 검증 종료

    it("성격과 세계관을 포함한 스토리 정보를 표시한다", () => // 스토리 정보 검증
    { // 검증 시작
        renderWithApp(<CharacterDetail characterId="harin" />); // 상세 화면 렌더
        expect(screen.getByRole("heading", { name: "캐릭터 소개" })).toBeVisible(); // 소개 제목 확인
        expect(screen.getByRole("heading", { name: "성격" })).toBeVisible(); // 성격 제목 확인
        expect(screen.getByRole("heading", { name: "세계관" })).toBeVisible(); // 세계관 제목 확인
        expect(screen.getByRole("heading", { name: "관계 설정" })).toBeVisible(); // 관계 제목 확인
        expect(screen.getByRole("heading", { name: "대화 스타일" })).toBeVisible(); // 대화 제목 확인
        expect(screen.getByRole("heading", { name: "콘텐츠 주의 사항" })).toBeVisible(); // 주의 제목 확인
        expect(screen.getByText("직장 피로 언급")).toBeVisible(); // 주의 내용 확인
    }); // 검증 종료

    it("긴 상세 설명을 전체 보기와 접기로 전환한다", async () => // 설명 확장 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const state = createInitialState(); // 초기 상태 생성
        const index = state.characters.findIndex((character) => character.id === "harin"); // 하린 위치 조회
        state.characters[index] = { ...state.characters[index], description: "아주 긴 하루의 이야기를 천천히 들어 주는 장면. ".repeat(24) }; // 긴 설명 적용
        renderWithApp(<CharacterDetail characterId="harin" />, state); // 상세 화면 렌더
        const expand = screen.getByRole("button", { name: "캐릭터 상세 전체 보기" }); // 확장 버튼 조회
        expect(expand).toHaveAttribute("aria-expanded", "false"); // 접힌 상태 확인
        await user.click(expand); // 전체 보기 실행
        expect(screen.getByRole("button", { name: "캐릭터 상세 접기" })).toHaveAttribute("aria-expanded", "true"); // 펼친 상태 확인
    }); // 검증 종료

    it("상세 프로필이 없는 캐릭터도 기본 상세 화면을 표시한다", () => // 기본 화면 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const character = state.characters.find((item) => item.id === "rank-008")!; // 랭킹 캐릭터 조회
        renderWithApp(<CharacterDetail characterId={character.id} />, state); // 상세 화면 렌더
        expect(screen.getByRole("heading", { level: 1, name: character.name })).toBeVisible(); // 이름 확인
        expect(screen.getAllByText(character.summary)[0]).toBeVisible(); // 기존 소개 확인
        expect(screen.getAllByText("확인되지 않음")).toHaveLength(2); // 미확인 지표 확인
    }); // 검증 종료

    it("대표 이미지 오류 시 캐릭터 색상의 대체 화면을 표시한다", () => // 이미지 오류 검증
    { // 검증 시작
        renderWithApp(<CharacterDetail characterId="harin" />); // 상세 화면 렌더
        fireEvent.error(screen.getByRole("img", { name: "퇴근길 카페의 하린 대표 이미지" })); // 이미지 오류 발생
        expect(screen.getByRole("img", { name: "퇴근길 카페의 하린 이미지 대체 화면" })).toBeVisible(); // 대체 화면 확인
        expect(screen.getByText("장면 이미지를 불러오지 못했습니다.")).toBeVisible(); // 오류 안내 확인
    }); // 검증 종료

    it("시작 설정을 바꾸면 연결된 프롤로그와 첫 대사를 함께 갱신한다", async () => // 프리셋 전환 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<CharacterDetail characterId="harin" />); // 상세 화면 렌더
        expect(screen.getByRole("heading", { name: "비가 머무는 저녁" })).toBeVisible(); // 기본 프롤로그 확인
        expect(screen.getByText("시작 설정 · 퇴근 후의 위로")).toBeVisible(); // 기본 프리셋 이름 확인
        await user.click(screen.getByRole("radio", { name: /마감 뒤의 한 잔/ })); // 둘째 프리셋 선택
        expect(screen.getByRole("heading", { name: "마지막 손님" })).toBeVisible(); // 변경 제목 확인
        expect(screen.getByText("시작 설정 · 마감 뒤의 한 잔")).toBeVisible(); // 변경 프리셋 이름 확인
        expect(screen.getByText("마감 표지판이 뒤집힌 뒤 하린이 조용히 맞은편 자리를 권한다.")).toBeVisible(); // 변경 설명 확인
        expect(screen.getByText("오늘 마지막 잔은 네 거야. 천천히 마시면서 이야기해 줘.")).toBeVisible(); // 변경 대사 확인
    }); // 검증 종료

    it("프롤로그 이미지 오류 시 대표 이미지 기반 대체 장면을 표시한다", () => // 프롤로그 오류 검증
    { // 검증 시작
        renderWithApp(<CharacterDetail characterId="harin" />); // 상세 화면 렌더
        fireEvent.error(screen.getByRole("img", { name: "비 오는 저녁 카페에서 따뜻한 잔을 건네는 하린" })); // 프롤로그 오류 발생
        const fallback = screen.getByRole("img", { name: "퇴근길 카페의 하린 대표 이미지 기반 프롤로그 대체 화면" }); // 대체 장면 조회
        expect(fallback).toBeVisible(); // 대체 장면 표시 확인
        expect(fallback).toHaveStyle({ "--prologue-fallback-image": "url(\"/images/characters/harin.webp\")" }); // 대표 이미지 연결 확인
    }); // 검증 종료

    it("최근 활성 대화를 선택해 이어하기로 이동한다", async () => // 이어하기 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const state = createInitialState(); // 초기 상태 생성
        const base = state.conversations[0]; // 기준 대화 조회
        const baseVersion = state.conversationVersions[0]; // 기준 버전 조회
        state.conversations.push({ ...base, id: "conversation-harin-older", characterId: "harin", title: "오래된 하린 대화", currentVersionId: "conversation-harin-older-version-1", updatedAt: "2026-09-28T09:00:00.000Z" }); // 이전 대화 추가
        state.conversationVersions.push({ ...baseVersion, id: "conversation-harin-older-version-1", conversationId: "conversation-harin-older" }); // 이전 버전 추가
        state.conversations.push({ ...base, id: "conversation-harin-latest", characterId: "harin", title: "최근 하린 대화", currentVersionId: "conversation-harin-latest-version-1", updatedAt: "2026-09-29T09:00:00.000Z" }); // 최신 대화 추가
        state.conversationVersions.push({ ...baseVersion, id: "conversation-harin-latest-version-1", conversationId: "conversation-harin-latest" }); // 최신 버전 추가
        renderWithApp(<><CharacterDetail characterId="harin" /><CharacterConversationProbe characterId="harin" /></>, state); // 상세 화면 렌더
        expect(screen.getByText("최근 하린 대화")).toBeVisible(); // 최근 대화 표시 확인
        await user.click(screen.getByRole("button", { name: "최근 대화 이어하기" })); // 이어하기 실행
        expect(routerPush).toHaveBeenCalledWith("/chat/harin?conversation=conversation-harin-latest&version=conversation-harin-latest-version-1"); // 대화 경로 확인
    }); // 검증 종료

    it("새 대화 시작을 빠르게 두 번 눌러도 대화를 하나만 만든다", async () => // 중복 생성 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<><CharacterDetail characterId="harin" /><CharacterConversationProbe characterId="harin" /></>); // 상세 화면 렌더
        await user.dblClick(screen.getByRole("button", { name: "새 대화 시작" })); // 빠른 두 번 클릭
        const identifiers = screen.getByLabelText("harin 대화 식별자").textContent?.split("|").filter(Boolean) ?? []; // 생성 식별자 조회
        expect(identifiers).toHaveLength(1); // 단일 생성 확인
        expect(routerPush).toHaveBeenCalledTimes(1); // 단일 이동 확인
    }); // 검증 종료

    it("업데이트 정보와 샘플 랭킹 탭을 표시하고 전환한다", async () => // 보조 정보 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<CharacterDetail characterId="harin" />); // 상세 화면 렌더
        expect(screen.getByRole("heading", { name: "업데이트 정보" })).toBeVisible(); // 업데이트 제목 확인
        expect(screen.getByText("v1.2.0")).toBeVisible(); // 업데이트 버전 확인
        expect(screen.getByText("2026. 9. 20.")).toBeVisible(); // 업데이트 날짜 확인
        expect(screen.getByRole("heading", { name: "사용자 랭킹" })).toBeVisible(); // 랭킹 제목 확인
        expect(screen.getByText("샘플 랭킹")).toBeVisible(); // 샘플 표기 확인
        expect(screen.getByLabelText("내 샘플 순위")).toHaveTextContent("태평양12"); // 로컬 사용자 순위 확인
        const dailyTab = screen.getByRole("tab", { name: "일간" }); // 일간 탭 조회
        await user.click(dailyTab); // 일간 탭 전환
        expect(dailyTab).toHaveAttribute("aria-selected", "true"); // 일간 선택 확인
        expect(screen.getByLabelText("일간 샘플 랭킹")).toBeVisible(); // 일간 목록 확인
    }); // 검증 종료

    it("연관 캐릭터를 최대 여덟 명까지 자신을 제외해 표시한다", () => // 연관 캐릭터 검증
    { // 검증 시작
        renderWithApp(<CharacterDetail characterId="harin" />); // 상세 화면 렌더
        const rail = screen.getByRole("list", { name: "연관 캐릭터" }); // 연관 목록 조회
        const links = Array.from(rail.querySelectorAll("a")); // 연관 링크 조회
        expect(links.length).toBeGreaterThan(0); // 연관 항목 확인
        expect(links.length).toBeLessThanOrEqual(8); // 최대 개수 확인
        expect(links.some((link) => link.getAttribute("href") === "/characters/harin")).toBe(false); // 자기 자신 제외 확인
    }); // 검증 종료

    it("좋아요와 제작자 팔로우 상태를 로컬 상태에 반영한다", async () => // 로컬 반응 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<CharacterDetail characterId="harin" />); // 상세 화면 렌더
        const like = screen.getByRole("button", { name: "퇴근길 카페의 하린 좋아요" }); // 좋아요 버튼 조회
        const follow = screen.getByRole("button", { name: "저녁다섯시 제작자 팔로우" }); // 팔로우 버튼 조회
        await user.click(like); // 좋아요 실행
        await user.click(follow); // 팔로우 실행
        expect(screen.getByRole("button", { name: "퇴근길 카페의 하린 좋아요" })).toHaveAttribute("aria-pressed", "true"); // 좋아요 상태 확인
        expect(screen.getByRole("button", { name: "저녁다섯시 제작자 팔로우 해제" })).toHaveAttribute("aria-pressed", "true"); // 팔로우 상태 확인
    }); // 검증 종료

    it("공유 링크 복사 성공과 클립보드 부재 오류를 안내한다", async () => // 공유 상태 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const writeText = vi.fn().mockResolvedValue(undefined); // 클립보드 쓰기 대체
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } }); // 클립보드 제공
        const view = renderWithApp(<CharacterDetail characterId="harin" />); // 상세 화면 렌더
        await user.click(screen.getByRole("button", { name: "퇴근길 카페의 하린 공유" })); // 공유 실행
        expect(writeText).toHaveBeenCalledTimes(1); // 복사 실행 확인
        expect(screen.getByRole("status")).toHaveTextContent("공유 링크를 복사했습니다."); // 성공 안내 확인
        view.unmount(); // 성공 화면 정리
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined }); // 클립보드 제거
        renderWithApp(<CharacterDetail characterId="harin" />); // 오류 화면 렌더
        await user.click(screen.getByRole("button", { name: "퇴근길 카페의 하린 공유" })); // 공유 재실행
        expect(screen.getByRole("status")).toHaveTextContent("공유 링크를 복사하지 못했습니다."); // 오류 안내 확인
    }); // 검증 종료

    it("클립보드 거부 오류를 안전하게 안내한다", async () => // 공유 거부 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        const writeText = vi.fn().mockRejectedValue(new Error("denied")); // 거부 클립보드 대체
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } }); // 클립보드 제공
        renderWithApp(<CharacterDetail characterId="harin" />); // 상세 화면 렌더
        await user.click(screen.getByRole("button", { name: "퇴근길 카페의 하린 공유" })); // 공유 실행
        expect(screen.getByRole("status")).toHaveTextContent("공유 링크를 복사하지 못했습니다."); // 거부 안내 확인
    }); // 검증 종료

    it("신고 사유를 선택해 저장하고 닫은 뒤 원래 버튼으로 초점을 돌린다", async () => // 신고 흐름 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        renderWithApp(<><CharacterDetail characterId="harin" /><CharacterReportProbe characterId="harin" /></>); // 상세 화면 렌더
        const more = screen.getByRole("button", { name: "퇴근길 카페의 하린 더보기" }); // 더보기 버튼 조회
        await user.click(more); // 신고 창 열기
        const dialog = screen.getByRole("dialog", { name: "캐릭터 신고" }); // 신고 창 조회
        expect(dialog).toBeVisible(); // 신고 창 표시 확인
        await user.click(screen.getByRole("radio", { name: "스팸 또는 반복 콘텐츠" })); // 신고 사유 선택
        await user.click(screen.getByRole("button", { name: "신고 접수" })); // 신고 저장
        expect(screen.queryByRole("dialog", { name: "캐릭터 신고" })).toBeNull(); // 신고 창 닫힘 확인
        expect(screen.getByLabelText("harin 신고 개수")).toHaveTextContent("1"); // 신고 저장 확인
        expect(more).toHaveFocus(); // 초점 복귀 확인
    }); // 검증 종료
}); // 묶음 종료
