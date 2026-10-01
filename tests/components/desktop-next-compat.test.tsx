import { render, screen } from "@testing-library/react"; // 렌더 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작
import { beforeEach, describe, expect, it } from "vitest"; // 테스트 도구
import Image from "@/desktop/next-compat/image"; // 이미지 호환 모듈
import Link from "@/desktop/next-compat/link"; // 링크 호환 모듈
import { usePathname, useRouter, useSearchParams } from "@/desktop/next-compat/navigation"; // 경로 호환 모듈
import { DesktopRouterProvider } from "@/desktop/router/DesktopRouter"; // 데스크톱 경로 공급자

function LocationProbe() // 현재 위치 표시기
{ // 함수 시작
    const pathname = usePathname(); // 현재 경로
    const searchParams = useSearchParams(); // 현재 검색어
    return <output aria-label="현재 위치">{`${pathname}|${searchParams.get("conversation") ?? ""}`}</output>; // 위치 출력
} // 함수 종료

function RouterButtons() // 경로 이동 버튼
{ // 함수 시작
    const router = useRouter(); // 경로 이동 도구
    const replace = router.replace; // 분리한 교체 함수
    return ( // 버튼 반환
        <> {/* 버튼 묶음 */}
            <button type="button" onClick={() => router.push("/library")}>보관함 이동</button> {/* 이동 버튼 */}
            <button type="button" onClick={() => replace("/chat/rian?conversation=c1")}>대화 교체</button> {/* 교체 버튼 */}
        </> // 묶음 종료
    ); // 반환 종료
} // 함수 종료

describe("데스크톱 Next 호환 모듈", () => // 호환 모듈 묶음
{ // 묶음 시작
    beforeEach(() => // 테스트 준비
    { // 준비 시작
        window.history.replaceState(null, "", "/"); // 주소 초기화
    }); // 준비 종료

    it("링크는 원래 경로를 그대로 표시하고 누르면 화면 안에서 이동한다", async () => // 링크 이동 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        let clicked = false; // 클릭 처리 여부
        render(<DesktopRouterProvider><Link href="/explore?tag=힐링" onClick={() => { clicked = true; }}>탐색</Link><LocationProbe /></DesktopRouterProvider>); // 링크 렌더
        expect(screen.getByRole("link", { name: "탐색" })).toHaveAttribute("href", "/explore?tag=힐링"); // 원래 경로 표시 확인
        await user.click(screen.getByRole("link", { name: "탐색" })); // 링크 선택
        expect(clicked).toBe(true); // 기존 클릭 처리 확인
        expect(screen.getByLabelText("현재 위치")).toHaveTextContent("/explore|"); // 화면 경로 확인
        expect(decodeURIComponent(window.location.hash)).toBe("#/explore?tag=힐링"); // 해시 주소 확인
    }); // 테스트 종료

    it("경로 이동 도구는 추가와 교체를 지원하고 함수를 떼어 써도 동작한다", async () => // 경로 도구 검증
    { // 테스트 시작
        const user = userEvent.setup(); // 사용자 동작 준비
        render(<DesktopRouterProvider><RouterButtons /><LocationProbe /></DesktopRouterProvider>); // 도구 렌더
        await user.click(screen.getByRole("button", { name: "보관함 이동" })); // 추가 이동
        expect(screen.getByLabelText("현재 위치")).toHaveTextContent("/library|"); // 추가 이동 확인
        await user.click(screen.getByRole("button", { name: "대화 교체" })); // 교체 이동
        expect(screen.getByLabelText("현재 위치")).toHaveTextContent("/chat/rian|c1"); // 교체 이동 확인
    }); // 테스트 종료

    it("브라우저 해시 변경을 화면 경로에 반영한다", async () => // 뒤로 가기 반영 검증
    { // 테스트 시작
        render(<DesktopRouterProvider><LocationProbe /></DesktopRouterProvider>); // 표시기 렌더
        window.location.hash = "#/support"; // 외부 해시 변경
        window.dispatchEvent(new HashChangeEvent("hashchange")); // 해시 변경 알림
        expect(await screen.findByText("/support|")).toBeInTheDocument(); // 경로 반영 확인
    }); // 테스트 종료

    it("이미지는 원래 주소와 크기로 출력하고 채움 배치를 지원한다", () => // 이미지 검증
    { // 테스트 시작
        render(<><Image src="/images/brand/mate-verse-logo-v3.png" alt="로고" width={2172} height={724} priority /><div style={{ position: "relative" }}><Image src="/images/scenes/fallback-scene.svg" alt="장면" fill sizes="100vw" /></div></>); // 이미지 렌더
        const logo = screen.getByRole("img", { name: "로고" }); // 로고 조회
        expect(logo).toHaveAttribute("src", "/images/brand/mate-verse-logo-v3.png"); // 원래 주소 확인
        expect(logo).toHaveAttribute("width", "2172"); // 너비 확인
        expect(logo).toHaveAttribute("loading", "eager"); // 우선 불러오기 확인
        const scene = screen.getByRole("img", { name: "장면" }); // 장면 조회
        expect(scene).toHaveStyle({ position: "absolute", width: "100%", height: "100%" }); // 채움 배치 확인
        expect(scene).toHaveAttribute("loading", "lazy"); // 지연 불러오기 확인
    }); // 테스트 종료
}); // 묶음 종료
