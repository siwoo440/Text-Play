import assert from "node:assert/strict"; // 단언 도구
import { readFile } from "node:fs/promises"; // 파일 읽기
import { fileURLToPath } from "node:url"; // 파일 경로 변환
import test from "node:test"; // 테스트 도구
import { JSDOM, VirtualConsole } from "jsdom"; // 브라우저 모의 도구

const htmlPath = new URL("./Main.html", import.meta.url); // 목업 경로
const rankingHtmlPath = new URL("./Ranking.html", import.meta.url); // 순위 경로

test("필수 패널과 외부 요청 차단 상태를 포함한다", async () => // 구조 검증
{ // 검증 시작
    const html = await readFile(htmlPath, "utf8"); // 목업 읽기
    assert.match(html, /id="conversation-panel"/); // 왼쪽 패널 확인
    assert.match(html, /id="user-panel"/); // 오른쪽 패널 확인
    assert.match(html, /id="mobile-navigation"/); // 모바일 메뉴 확인
    assert.match(html, /id="featured-character"/); // 추천 영역 확인
    assert.match(html, /id="character-grid"/); // 캐릭터 목록 확인
    assert.match(html, /id="mobile-scrim"/); // 모바일 배경 확인
    assert.match(html, /\.\.\/public\/images\/characters\/rian\.webp/); // 리안 이미지 확인
    assert.match(html, /\.\.\/public\/images\/characters\/harin\.webp/); // 하린 이미지 확인
    assert.match(html, /\.\.\/public\/images\/characters\/sera\.webp/); // 세라 이미지 확인
    assert.match(html, /\.\.\/public\/images\/characters\/kyle\.webp/); // 카일 이미지 확인
    assert.match(html, /\.\.\/public\/images\/characters\/noah\.webp/); // 노아 이미지 확인
    assert.match(html, /\.\.\/public\/images\/characters\/miel\.webp/); // 미엘 이미지 확인
    assert.match(html, /\.\.\/public\/images\/characters\/yuna\.webp/); // 유나 이미지 확인
    assert.doesNotMatch(html, /<img[^>]+src="https?:\/\//); // 외부 이미지 차단
    assert.doesNotMatch(html, /fetch\s*\(/); // 네트워크 호출 차단
    assert.doesNotMatch(html, /XMLHttpRequest/); // 요청 객체 차단
    assert.doesNotMatch(html, /WebSocket/); // 소켓 호출 차단
}); // 검증 종료

test("파일로 직접 열어도 메인 동작과 백 개 순위가 초기화된다", async () => // 파일 실행 검증
{ // 검증 시작
    const virtualConsole = new VirtualConsole(); // 가상 로그 생성
    const mainDom = await JSDOM.fromFile(fileURLToPath(htmlPath), // 메인 파일 실행
    { // 실행 설정 시작
        resources: "usable", // 지역 자원 허용
        runScripts: "dangerously", // 화면 스크립트 실행
        virtualConsole, // 가상 로그 연결
        beforeParse(window) // 화면 준비 함수
        { // 화면 준비 시작
            window.matchMedia = () => // 화면 판정 대체
            { // 대체 시작
                function addEventListener() // 변화 연결 대체
                { // 대체 시작
                } // 대체 종료
                return { matches: false, addEventListener }; // 데스크톱 판정 반환
            }; // 대체 종료
        }, // 화면 준비 종료
    }); // 메인 파일 실행 종료
    await new Promise((resolve) => mainDom.window.addEventListener("load", resolve, { once: true })); // 메인 로드 대기
    assert.equal(mainDom.window.document.getElementById("conversation-toggle").getAttribute("aria-expanded"), "true"); // 패널 초기화 확인
    assert.match(mainDom.window.document.getElementById("character-search").placeholder, /# 성인 1등/); // 검색 순위 확인
    mainDom.window.close(); // 메인 화면 종료
    const rankingDom = await JSDOM.fromFile(fileURLToPath(rankingHtmlPath), // 순위 파일 실행
    { // 실행 설정 시작
        resources: "usable", // 지역 자원 허용
        runScripts: "dangerously", // 화면 스크립트 실행
        virtualConsole, // 가상 로그 연결
    }); // 순위 파일 실행 종료
    await new Promise((resolve) => rankingDom.window.addEventListener("load", resolve, { once: true })); // 순위 로드 대기
    assert.equal(rankingDom.window.document.querySelectorAll(".ranking-card").length, 100); // 순위 개수 확인
    rankingDom.window.close(); // 순위 화면 종료
}); // 검증 종료

test("기간별 순위 페이지 진입점과 반응형 목록을 제공한다", async () => // 순위 화면 검증
{ // 검증 시작
    const mainHtml = await readFile(htmlPath, "utf8"); // 메인 화면 읽기
    const rankingHtml = await readFile(rankingHtmlPath, "utf8"); // 순위 화면 읽기
    assert.match(mainHtml, /id="character-search"/); // 검색 입력 확인
    assert.match(mainHtml, /id="ranking-period-links"/); // 기간 링크 확인
    assert.match(mainHtml, /<script src="\.\/ranking-data\.js"><\/script>/); // 일반 데이터 스크립트 확인
    assert.match(mainHtml, /Ranking\.html\?period=monthly/); // 월간 링크 확인
    assert.match(mainHtml, /Ranking\.html\?period=weekly/); // 주간 링크 확인
    assert.match(mainHtml, /Ranking\.html\?period=daily/); // 일간 링크 확인
    assert.match(rankingHtml, /id="ranking-grid"/); // 순위 목록 확인
    assert.match(rankingHtml, /<script src="\.\/ranking-data\.js"><\/script>/); // 순위 데이터 스크립트 확인
    assert.doesNotMatch(mainHtml, /type="module"/); // 파일 실행 호환 확인
    assert.doesNotMatch(rankingHtml, /type="module"/); // 순위 파일 호환 확인
    assert.doesNotMatch(mainHtml, /setInterval/); // 중복 타이머 차단
    assert.match(mainHtml, /clearTimeout/); // 기존 타이머 해제 확인
    assert.match(rankingHtml, /repeat\(4, minmax\(0, 1fr\)\)/); // 데스크톱 열 확인
    assert.match(rankingHtml, /repeat\(2, minmax\(0, 1fr\)\)/); // 모바일 열 확인
    assert.doesNotMatch(rankingHtml, /<img[^>]+src="https?:\/\//); // 외부 이미지 차단
    assert.doesNotMatch(rankingHtml, /fetch\s*\(/); // 네트워크 호출 차단
    assert.doesNotMatch(rankingHtml, /XMLHttpRequest/); // 요청 객체 차단
    assert.doesNotMatch(rankingHtml, /WebSocket/); // 소켓 호출 차단
}); // 검증 종료
