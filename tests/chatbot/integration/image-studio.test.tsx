import { screen, within } from "@testing-library/react"; // 화면 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { describe, expect, it, vi } from "vitest"; // 테스트 도구
import { createMockAdultVerification } from "@chatbot/features/adult/adult-access"; // 모의 인증
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태 훅
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태
import type { AppState } from "@chatbot/features/core/types"; // 상태 타입
import { createGeneratedImage } from "@chatbot/features/images/image-model"; // 생성 이미지 만들기
import { ImageStudio } from "@chatbot/features/images/ImageStudio"; // 이미지 스튜디오
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더

vi.mock("@/desktop/next-compat/navigation", () => // 경로 도구 대체
({ // 대체 시작
    usePathname: () => "/images", // 현재 경로
    useRouter: () => ({ push: () => undefined, replace: () => undefined }), // 이동 함수
})); // 대체 종료

function Probe() // 상태 표시
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    return <output aria-label="이미지 상태">{state.wallet.balance}:{state.images.length}</output>; // 잔액과 이미지 수
} // 함수 종료

function adultState(): AppState // 성인 인증·19+ 켠 상태
{ // 함수 시작
    const state = createInitialState(); // 초기 상태
    return { ...state, profile: { ...state.profile, adultVerification: createMockAdultVerification(new Date()) }, settings: { ...state.settings, matureContentEnabled: true } }; // 인증 상태 반환
} // 함수 종료

describe("이미지 스튜디오", () => // 스튜디오 묶음
{ // 묶음 시작
    it("설명·그림체·비율로 이미지를 만들면 토큰을 쓰고 내 이미지에 저장하며 작품 활용 링크를 준다", async () => // 생성 흐름 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const state = createInitialState(); // 초기 상태
        renderWithApp(<><ImageStudio /><Probe /></>, state); // 화면 렌더
        await user.type(screen.getByLabelText("장면 설명"), "비 오는 밤의 옥상"); // 설명 입력
        await user.click(screen.getByRole("radio", { name: "수채화" })); // 그림체 선택
        await user.click(screen.getByRole("radio", { name: "가로 16:10" })); // 비율 선택
        await user.click(screen.getByRole("button", { name: "이미지 만들기 · 20 토큰" })); // 생성
        expect(screen.getByRole("status", { name: "생성 상태" })).toHaveTextContent("이미지를 만들어 내 이미지에 저장했어요."); // 안내 확인
        expect(screen.getByLabelText("이미지 상태")).toHaveTextContent(`${state.wallet.balance - 20}:1`); // 차감·저장 확인
        const result = screen.getByRole("region", { name: "방금 만든 이미지" }); // 결과 영역
        expect(within(result).getByRole("img", { name: "비 오는 밤의 옥상" })).toBeVisible(); // 결과 이미지
        const characterLink = within(result).getByRole("link", { name: "캐릭터 대표 이미지로 쓰기" }); // 캐릭터 활용 링크
        expect(characterLink.getAttribute("href")).toMatch(/^\/characters\/new\?image=image-/); // 캐릭터 만들기 주소
        expect(within(result).getByRole("link", { name: "스토리 표지로 쓰기" }).getAttribute("href")).toMatch(/^\/stories\/new\?image=image-/); // 스토리 만들기 주소
        const gallery = screen.getByRole("region", { name: "내 이미지" }); // 갤러리
        expect(within(gallery).getAllByRole("article")).toHaveLength(1); // 저장 확인
        expect(within(gallery).getByRole("article")).toHaveTextContent("수채화 · 가로 16:10"); // 옵션 기록
    }); // 검증 종료

    it("실존 인물 합성 요청과 토큰 부족은 만들지 않고 이유를 알린다", async () => // 거부 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const state = createInitialState(); // 초기 상태
        renderWithApp(<><ImageStudio /><Probe /></>, state); // 화면 렌더
        await user.type(screen.getByLabelText("장면 설명"), "연예인 얼굴 합성"); // 금지 설명
        await user.click(screen.getByRole("button", { name: "이미지 만들기 · 20 토큰" })); // 생성 시도
        expect(screen.getByRole("alert")).toHaveTextContent("실존 인물을 그리거나 합성하는 이미지는 만들 수 없어요."); // 거부 안내
        expect(screen.getByLabelText("이미지 상태")).toHaveTextContent(`${state.wallet.balance}:0`); // 차감·저장 없음
    }); // 검증 종료

    it("토큰이 부족하면 만들지 않는다", async () => // 토큰 부족 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const state = createInitialState(); // 초기 상태
        state.wallet = { ...state.wallet, balance: 5 }; // 잔액 부족
        renderWithApp(<><ImageStudio /><Probe /></>, state); // 화면 렌더
        await user.type(screen.getByLabelText("장면 설명"), "숲속 정원"); // 설명 입력
        await user.click(screen.getByRole("button", { name: "이미지 만들기 · 20 토큰" })); // 생성 시도
        expect(screen.getByRole("alert")).toHaveTextContent("토큰이 부족해요."); // 부족 안내
        expect(screen.getByLabelText("이미지 상태")).toHaveTextContent("5:0"); // 변화 없음
    }); // 검증 종료

    it("19세 이미지는 성인 인증·19+를 켰을 때만 고를 수 있고 미성년자 표현은 막으며 한국 서버는 가림 처리를 기록한다", async () => // 19세 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const { unmount } = renderWithApp(<ImageStudio />); // 기본 상태
        expect(within(screen.getByLabelText("이용 등급")).getByRole("option", { name: "19세 이용가" })).toBeDisabled(); // 19세 막힘
        expect(screen.getByRole("note", { name: "이미지 생성 규칙" })).toHaveTextContent("한국 서버는 국내 법에 따라 19세 이미지의 중요 부위를 가림 처리합니다."); // 지역 안내
        unmount(); // 정리
        renderWithApp(<><ImageStudio /><Probe /></>, adultState()); // 인증 상태
        await user.selectOptions(screen.getByLabelText("이용 등급"), "mature"); // 19세 선택
        await user.type(screen.getByLabelText("장면 설명"), "교복 입은 고등학생"); // 미성년자 표현
        await user.click(screen.getByRole("button", { name: "이미지 만들기 · 20 토큰" })); // 생성 시도
        expect(screen.getByRole("alert")).toHaveTextContent("미성년자로 보이는 인물은 19세 이미지로 만들 수 없어요."); // 거부 안내
        await user.clear(screen.getByLabelText("장면 설명")); // 설명 지우기
        await user.type(screen.getByLabelText("장면 설명"), "성인 바텐더의 밤"); // 성인 설명
        await user.click(screen.getByRole("button", { name: "이미지 만들기 · 20 토큰" })); // 생성
        const gallery = screen.getByRole("region", { name: "내 이미지" }); // 갤러리
        expect(within(gallery).getByRole("article")).toHaveTextContent("19+ · 가림 처리"); // 등급·가림 표시
    }); // 검증 종료

    it("19+를 끄면 19세 이미지는 잠기고 즐겨찾기 필터와 백업 후 삭제가 동작한다", async () => // 갤러리 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 생성
        const state = createInitialState(); // 초기 상태
        const plain = createGeneratedImage({ prompt: "숲속 정원", style: "watercolor", aspect: "square", referenceCharacterId: null, contentRating: "all" }, "kr", "2026-10-01T00:00:00.000Z", "image-plain"); // 일반 이미지
        const mature = createGeneratedImage({ prompt: "성인 바텐더의 밤", style: "cinematic", aspect: "portrait", referenceCharacterId: null, contentRating: "mature" }, "kr", "2026-10-01T00:01:00.000Z", "image-mature"); // 19세 이미지
        state.images = [mature, plain]; // 갤러리 준비
        const failingBackup = vi.fn(() => { throw new Error("백업 실패"); }); // 실패 백업
        const { unmount } = renderWithApp(<><ImageStudio /><Probe /></>, state, { load: () => state, save: () => undefined, createBackup: failingBackup }); // 실패 저장소
        const gallery = screen.getByRole("region", { name: "내 이미지" }); // 갤러리
        const cards = within(gallery).getAllByRole("article"); // 카드
        expect(cards[0]).toHaveAttribute("data-locked", "true"); // 19세 잠금
        expect(cards[0]).toHaveTextContent("19+를 켜면 볼 수 있어요"); // 잠금 안내
        expect(within(cards[0]).queryByRole("link", { name: "캐릭터 대표 이미지로 쓰기" })).toBeNull(); // 잠금 이미지 활용 막힘
        await user.click(within(cards[1]).getByRole("button", { name: "숲속 정원 즐겨찾기" })); // 즐겨찾기
        expect(within(cards[1]).getByRole("button", { name: "숲속 정원 즐겨찾기" })).toHaveAttribute("aria-pressed", "true"); // 즐겨찾기 확인
        await user.click(within(gallery).getByRole("tab", { name: "즐겨찾기" })); // 즐겨찾기 필터
        expect(within(gallery).getAllByRole("article")).toHaveLength(1); // 필터 확인
        await user.click(within(gallery).getByRole("button", { name: "숲속 정원 삭제" })); // 삭제 시작
        await user.click(screen.getByRole("button", { name: "이미지 삭제 확인" })); // 삭제 승인
        expect(failingBackup).toHaveBeenCalledWith(expect.objectContaining({ schemaVersion: 12 }), "image-delete"); // 백업 시도
        expect(screen.getByLabelText("이미지 상태")).toHaveTextContent(":2"); // 실패 시 유지
        unmount(); // 정리
        const backup = vi.fn(); // 성공 백업
        renderWithApp(<><ImageStudio /><Probe /></>, state, { load: () => state, save: () => undefined, createBackup: backup }); // 성공 저장소
        await user.click(screen.getByRole("button", { name: "숲속 정원 삭제" })); // 삭제 시작
        await user.click(screen.getByRole("button", { name: "이미지 삭제 확인" })); // 삭제 승인
        expect(backup).toHaveBeenCalledWith(expect.objectContaining({ schemaVersion: 12 }), "image-delete"); // 백업 확인
        expect(screen.getByLabelText("이미지 상태")).toHaveTextContent(":1"); // 삭제 확인
    }); // 검증 종료
}); // 묶음 종료
