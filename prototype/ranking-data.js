(function initializeRankingData(root) // 순위 데이터 초기화
{ // 초기화 시작
    "use strict"; // 엄격 모드
    const characterSeeds = [ // 캐릭터 원본
        { name: "새벽 도서관의 리안", image: "../public/images/characters/rian.webp", role: "기억을 기록하는 새벽 사서" }, // 리안 원본
        { name: "퇴근길 카페의 하린", image: "../public/images/characters/harin.webp", role: "표정을 먼저 읽는 바리스타" }, // 하린 원본
        { name: "비 오는 교실, 세라", image: "../public/images/characters/sera.webp", role: "방과 후를 기다리는 친구" }, // 세라 원본
        { name: "별 항해사 카일", image: "../public/images/characters/kyle.webp", role: "잃어버린 좌표를 찾는 항해사" }, // 카일 원본
        { name: "달빛 기록관의 노아", image: "../public/images/characters/noah.webp", role: "마음을 문장으로 남기는 기록자" }, // 노아 원본
        { name: "숲의 치료사 미엘", image: "../public/images/characters/miel.webp", role: "하루의 온도를 되돌리는 안내자" }, // 미엘 원본
        { name: "옥상 밴드의 유나", image: "../public/images/characters/yuna.webp", role: "미완성 노래를 들려주는 리더" }, // 유나 원본
    ]; // 캐릭터 원본 종료
    const scenarioSeeds = [ // 상황 원본
        "첫 번째 약속", // 첫 상황
        "비밀 편지", // 둘째 상황
        "늦은 밤의 통화", // 셋째 상황
        "예고 없는 재회", // 넷째 상황
        "둘만의 휴일", // 다섯째 상황
        "잊힌 계절", // 여섯째 상황
        "마지막 열차", // 일곱째 상황
        "별이 내린 거리", // 여덟째 상황
        "잠들지 않는 방", // 아홉째 상황
        "우리의 다음 장면", // 열째 상황
        "낯선 도시의 아침", // 열한째 상황
        "숨겨 둔 고백", // 열두째 상황
        "시간을 건넌 메시지", // 열셋째 상황
        "조용한 축제의 밤", // 열넷째 상황
        "다시 만난 세계", // 열다섯째 상황
    ]; // 상황 원본 종료
    const rankingPeriodLabels = // 기간 이름
    { // 기간 이름 시작
        monthly: "월간 추천", // 월간 이름
        weekly: "주간 추천", // 주간 이름
        daily: "일간 추천", // 일간 이름
    }; // 기간 이름 종료
    const topSearchRankings = [ // 검색 추천 목록
        { category: "성인", rank: 1, name: "새벽 도서관의 리안" }, // 첫 추천
        { category: "성인", rank: 2, name: "퇴근길 카페의 하린" }, // 둘째 추천
        { category: "성인", rank: 3, name: "비 오는 교실, 세라" }, // 셋째 추천
        { category: "성인", rank: 4, name: "달빛 기록관의 노아" }, // 넷째 추천
        { category: "성인", rank: 5, name: "별 항해사 카일" }, // 다섯째 추천
    ]; // 검색 추천 종료
    function formatRankingSuggestion(entry) // 검색 문구 생성기
    { // 함수 시작
        return `# ${entry.category} ${entry.rank}등 : ${entry.name}`; // 검색 문구 반환
    } // 함수 종료
    function getNextRankingIndex(currentIndex, length) // 다음 번호 계산기
    { // 함수 시작
        return (currentIndex + 1) % length; // 순환 번호 반환
    } // 함수 종료
    function normalizeRankingPeriod(value) // 기간 정규화기
    { // 함수 시작
        return Object.hasOwn(rankingPeriodLabels, value) ? value : "monthly"; // 안전 기간 반환
    } // 함수 종료
    function createRankingEntries(periodValue) // 순위 목록 생성기
    { // 함수 시작
        const period = normalizeRankingPeriod(periodValue); // 기간 보정
        const periodOffset = Object.keys(rankingPeriodLabels).indexOf(period); // 기간 위치 계산
        return Array.from({ length: 100 }, (_, index) => // 백 개 생성
        { // 항목 생성 시작
            const rank = index + 1; // 순위 계산
            const character = characterSeeds[(index + periodOffset) % characterSeeds.length]; // 캐릭터 선택
            const scenario = scenarioSeeds[(index * 3 + periodOffset) % scenarioSeeds.length]; // 상황 선택
            const score = Math.max(1200, 185000 - index * 1573 - periodOffset * 211); // 점수 계산
            const entry = // 항목 변수
            { // 항목 시작
                id: `${period}-${rank}`, // 식별자
                rank, // 순위
                name: `${character.name} · ${scenario}`, // 작품 이름
                image: character.image, // 작품 이미지
                description: character.role, // 작품 설명
                score: score.toLocaleString("ko-KR"), // 인기도 표시
            }; // 항목 종료
            return entry; // 항목 반환
        }); // 백 개 생성 종료
    } // 함수 종료
    const rankingData = // 공개 도구
    { // 공개 도구 시작
        createRankingEntries, // 순위 목록 생성기
        formatRankingSuggestion, // 검색 문구 생성기
        getNextRankingIndex, // 다음 번호 계산기
        normalizeRankingPeriod, // 기간 정규화기
        rankingPeriodLabels, // 기간 이름
        topSearchRankings, // 검색 추천 목록
    }; // 공개 도구 종료
    root.RankingData = rankingData; // 브라우저 도구 공개
    if (typeof module !== "undefined" && module.exports) // 노드 환경 판정
    { // 노드 환경 시작
        module.exports = rankingData; // 노드 도구 공개
    } // 노드 환경 종료
}(globalThis)); // 순위 데이터 초기화 실행
