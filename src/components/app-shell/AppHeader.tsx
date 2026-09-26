import Image from "next/image"; // 이미지 최적화
import Link from "next/link"; // 내부 경로 링크

interface AppHeaderProps // 헤더 속성
{ // 구조 시작
    leftOpen: boolean; // 왼쪽 상태
    rightOpen: boolean; // 오른쪽 상태
    onToggleLeft(): void; // 왼쪽 전환
    onToggleRight(): void; // 오른쪽 전환
    leftButtonRef: React.RefObject<HTMLButtonElement | null>; // 왼쪽 버튼 참조
    rightButtonRef: React.RefObject<HTMLButtonElement | null>; // 오른쪽 버튼 참조
} // 구조 종료

function BookIcon() // 책 아이콘
{ // 함수 시작
    return ( // 아이콘 반환
        <svg data-icon="book" aria-hidden="true" focusable="false" viewBox="0 0 24 24"> {/* 책 도형 */}
            <path d="M3.5 5.5c2.9-.8 5.7-.1 8.5 2v11c-2.8-2.1-5.6-2.8-8.5-2V5.5Z" /> {/* 왼쪽 페이지 */}
            <path d="M20.5 5.5c-2.9-.8-5.7-.1-8.5 2v11c2.8-2.1 5.6-2.8 8.5-2V5.5Z" /> {/* 오른쪽 페이지 */}
        </svg> // 책 도형 종료
    ); // 반환 종료
} // 함수 종료

function MenuIcon() // 메뉴 아이콘
{ // 함수 시작
    return ( // 아이콘 반환
        <svg data-icon="menu" aria-hidden="true" focusable="false" viewBox="0 0 24 24"> {/* 메뉴 도형 */}
            <path d="M4 7h16M4 12h16M4 17h16" /> {/* 가로선 세 개 */}
        </svg> // 메뉴 도형 종료
    ); // 반환 종료
} // 함수 종료

export function AppHeader({ leftOpen, rightOpen, onToggleLeft, onToggleRight, leftButtonRef, rightButtonRef }: AppHeaderProps) // 앱 헤더
{ // 함수 시작
    return ( // 헤더 반환
        <header className="app-header"> {/* 상단 헤더 */}
            <button ref={leftButtonRef} type="button" aria-label="대화방 패널 열기와 닫기" aria-expanded={leftOpen} aria-controls="conversation-panel" onClick={onToggleLeft}> {/* 왼쪽 버튼 */}
                <BookIcon /> {/* 책 아이콘 */}
            </button> {/* 왼쪽 버튼 종료 */}
            <Link href="/" className="app-brand" aria-label="Mate Verse 홈"> {/* 브랜드 링크 */}
                <Image src="/images/brand/mate-verse-logo-v3.png" alt="Mate Verse" width={2172} height={724} priority /> {/* 브랜드 로고 */}
            </Link> {/* 브랜드 링크 종료 */}
            <nav aria-label="주요 메뉴"> {/* 주요 메뉴 */}
                <Link href="/" className="app-navigation-link">탐색</Link> {/* 탐색 링크 */}
                <Link href="/text-play" className="app-navigation-link">Text-Play</Link> {/* Text-Play 링크 */}
                <a href="/library" className="app-navigation-link">내 작품</a> {/* 작품 링크 */}
            </nav> {/* 메뉴 종료 */}
            <button ref={rightButtonRef} type="button" aria-label="사용자 패널 열기와 닫기" aria-expanded={rightOpen} aria-controls="user-panel" onClick={onToggleRight}> {/* 오른쪽 버튼 */}
                <MenuIcon /> {/* 메뉴 아이콘 */}
            </button> {/* 오른쪽 버튼 종료 */}
        </header> // 헤더 종료
    ); // 반환 종료
} // 함수 종료
