"use client"; // 오류 경계는 클라이언트 컴포넌트

import { useEffect } from "react"; // 리액트 효과

interface GlobalErrorProps // 전역 오류 속성
{ // 구조 시작
    error: Error & { digest?: string }; // 발생 오류
    retry(): void; // 다시 시도
} // 구조 종료

const actionStyle = { display: "inline-flex", alignItems: "center", minHeight: 46, padding: "0 18px", border: "1px solid #39445f", borderRadius: 14, background: "#171d2b", color: "#f4f6fd", font: "inherit", fontWeight: 800, textDecoration: "none", cursor: "pointer" } as const; // 동작 공통 스타일

export default function GlobalError({ error, retry }: GlobalErrorProps) // 최상위 오류 경계
{ // 함수 시작
    useEffect(() => // 오류 기록 효과
    { // 효과 시작
        console.error(error); // 개발 도구 기록
    }, [error]); // 오류 변경 의존
    return ( // 문서 반환
        <html lang="ko"> {/* 전역 오류 문서 */}
            <body style={{ display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, padding: 16, boxSizing: "border-box", background: "#0b0e18", color: "#f4f6fd", fontFamily: "system-ui, sans-serif" }}> {/* 전역 오류 본문 */}
                <title>앱을 불러오지 못했습니다 | Mate Verse</title> {/* 문서 제목 */}
                <main role="alert" style={{ width: "min(100%, 520px)", padding: 32, border: "1px solid #2d3653", borderRadius: 24, background: "#141a2a", textAlign: "center" }}> {/* 안내 카드 */}
                    <h1 style={{ margin: 0, fontSize: "1.6rem", wordBreak: "keep-all" }}>앱을 불러오지 못했습니다</h1> {/* 화면 제목 */}
                    <p style={{ margin: "14px 0 0", color: "#b5bdd3", lineHeight: 1.7, wordBreak: "keep-all" }}>앱 전체를 표시하는 중 문제가 생겼습니다. 브라우저에 저장된 캐릭터와 대화는 그대로 남아 있습니다.</p> {/* 안내 문구 */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 26 }}> {/* 동작 영역 */}
                        <button type="button" style={{ ...actionStyle, borderColor: "#744eff", background: "#6a3ff0" }} onClick={() => retry()}>다시 시도</button> {/* 재시도 버튼 */}
                        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 라우터가 깨졌을 수 있어 전체 새로고침 이동 */}
                        <a href="/" style={actionStyle}>처음 화면으로</a> {/* 전체 새로고침 이동 */}
                    </div> {/* 동작 영역 종료 */}
                </main> {/* 안내 카드 종료 */}
            </body> {/* 전역 오류 본문 종료 */}
        </html> // 전역 오류 문서 종료
    ); // 반환 종료
} // 함수 종료
