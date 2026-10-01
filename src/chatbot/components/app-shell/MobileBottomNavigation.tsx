"use client"; // 클라이언트 컴포넌트

import { usePathname } from "@/desktop/next-compat/navigation"; // 현재 경로 도구
import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { useEffect, useState } from "react"; // 리액트 상태 도구

export function MobileBottomNavigation({ onNavigate }: { onNavigate(): void }) // 모바일 하단 메뉴
{ // 함수 시작
    const pathname = usePathname() || "/"; // 현재 경로 조회
    const [hash, setHash] = useState(""); // 현재 앵커 상태
    useEffect(() => // 앵커 감시 효과
    { // 효과 시작
        const updateHash = () => setHash(window.location.hash); // 앵커 갱신 함수
        updateHash(); // 초기 앵커 반영
        window.addEventListener("hashchange", updateHash); // 앵커 변경 구독
        window.addEventListener("popstate", updateHash); // 기록 이동 구독
        return () => // 구독 해제 함수
        { // 해제 시작
            window.removeEventListener("hashchange", updateHash); // 앵커 구독 해제
            window.removeEventListener("popstate", updateHash); // 기록 구독 해제
        }; // 해제 종료
    }, []); // 최초 실행
    const rankingActive = pathname === "/" && hash === "#ranking"; // 랭킹 선택 판정
    const navigateHome = () => // 홈 이동 처리
    { // 함수 시작
        setHash(""); // 홈 앵커 초기화
        onNavigate(); // 패널 닫기
    }; // 함수 종료
    const navigateRanking = () => // 랭킹 이동 처리
    { // 함수 시작
        setHash("#ranking"); // 랭킹 앵커 설정
        onNavigate(); // 패널 닫기
    }; // 함수 종료
    return ( // 메뉴 반환
        <nav className="mobile-bottom-navigation" aria-label="모바일 메뉴"> {/* 하단 메뉴 */}
            <Link href="/" data-accent="home" aria-current={pathname === "/" && !rankingActive ? "page" : undefined} onClick={navigateHome}>홈</Link> {/* 홈 링크 */}
            <Link href={"/explore" as Route} data-accent="explore" aria-current={pathname.startsWith("/explore") ? "page" : undefined} onClick={onNavigate}>탐색</Link> {/* 탐색 링크 */}
            <Link href={"/#ranking" as Route} data-accent="ranking" aria-current={rankingActive ? "page" : undefined} onClick={navigateRanking}>랭킹</Link> {/* 랭킹 링크 */}
            <Link href={"/characters/new" as Route} data-accent="create" aria-current={pathname === "/characters/new" ? "page" : undefined} onClick={onNavigate}>만들기</Link> {/* 제작 링크 */}
            <Link href="/text-play" data-accent="textplay" aria-current={pathname === "/text-play" ? "page" : undefined} onClick={onNavigate}>Text-Play</Link> {/* Text-Play 링크 */}
            <Link href={"/library" as Route} data-accent="library" aria-current={pathname === "/library" ? "page" : undefined} onClick={onNavigate}>보관함</Link> {/* 보관함 링크 */}
        </nav> // 메뉴 종료
    ); // 반환 종료
} // 함수 종료
