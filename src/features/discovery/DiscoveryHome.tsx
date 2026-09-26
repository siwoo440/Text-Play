"use client"; // 클라이언트 컴포넌트

import { useMemo, useState } from "react"; // 리액트 상태
import { useAppStore } from "@/features/core/AppProvider"; // 앱 상태
import { CategoryFilter } from "@/features/discovery/CategoryFilter"; // 카테고리 필터
import { CharacterRail } from "@/features/discovery/CharacterRail"; // 캐릭터 레일
import { FeaturedCharacter } from "@/features/discovery/FeaturedCharacter"; // 추천 캐릭터
import { RankingRail } from "@/features/discovery/RankingRail"; // 랭킹 레일
import styles from "@/features/discovery/DiscoveryHome.module.css"; // 탐색 스타일

const categories = ["전체", "힐링", "판타지", "현대", "로맨스", "미스터리", "SF"]; // 카테고리 목록
const pageSize = 12; // 페이지 표시 수

export function DiscoveryHome() // 탐색 홈
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    const [query, setQuery] = useState(""); // 검색어
    const [category, setCategory] = useState("전체"); // 선택 카테고리
    const [visibleCount, setVisibleCount] = useState(pageSize); // 표시 항목 수
    const filtered = useMemo(() => // 필터 결과
    { // 계산 시작
        const normalized = query.trim().toLowerCase(); // 검색어 정규화
        return state.characters.filter((character) => // 캐릭터 필터
        { // 필터 시작
            if (character.publicationStatus !== "published" || character.visibility !== "public") // 공개 상태 판정
            { // 조건 시작
                return false; // 비공개 항목 제외
            } // 조건 종료
            const categoryMatch = category === "전체" || character.tags.includes(category); // 카테고리 일치
            const searchTarget = `${character.name} ${character.summary} ${character.worldSetting} ${character.tags.join(" ")}`.toLowerCase(); // 검색 대상
            return categoryMatch && (normalized.length === 0 || searchTarget.includes(normalized)); // 복합 결과
        }); // 필터 종료
    }, [category, query, state.characters]); // 필터 의존
    const defaultView = query.length === 0 && category === "전체"; // 기본 화면 판정
    const rankingCharacters = defaultView ? filtered.slice(0, 10) : []; // 상위 랭킹 목록
    const browsableCharacters = defaultView ? filtered.slice(10) : filtered; // 탐색 대상 목록
    const visibleCharacters = browsableCharacters.slice(0, visibleCount); // 현재 표시 목록
    const updateQuery = (value: string) => // 검색어 변경 함수
    { // 함수 시작
        setQuery(value); // 검색어 저장
        setVisibleCount(pageSize); // 표시 수 초기화
    }; // 함수 종료
    const updateCategory = (value: string) => // 카테고리 변경 함수
    { // 함수 시작
        setCategory(value); // 카테고리 저장
        setVisibleCount(pageSize); // 표시 수 초기화
    }; // 함수 종료
    return ( // 홈 반환
        <main className={styles.home}> {/* 탐색 본문 */}
            <header className={styles.hero}> {/* 탐색 헤더 */}
                <div> {/* 헤더 문구 */}
                    <span>감정과 이야기가 이어지는 공간</span> {/* 상단 문구 */}
                    <h1>오늘, 누구의 세계에 들어갈까요?</h1> {/* 페이지 제목 */}
                </div> {/* 문구 종료 */}
                <input type="search" aria-label="캐릭터와 세계관 검색" placeholder="캐릭터와 세계관 검색" value={query} onChange={(event) => updateQuery(event.target.value)} /> {/* 검색 입력 */}
            </header> {/* 헤더 종료 */}
            <CategoryFilter categories={categories} selected={category} onSelect={updateCategory} /> {/* 카테고리 */}
            {defaultView && filtered[0] !== undefined ? <FeaturedCharacter character={filtered[0]} /> : null} {/* 추천 영역 */}
            {defaultView && rankingCharacters.length > 0 ? <RankingRail characters={rankingCharacters} /> : null} {/* 랭킹 영역 */}
            <CharacterRail title="캐릭터 탐색 결과" characters={visibleCharacters} /> {/* 검색 결과 */}
            {visibleCharacters.length < browsableCharacters.length ? <button type="button" className={styles.loadMore} onClick={() => setVisibleCount((count) => count + pageSize)}>캐릭터 더 보기</button> : null} {/* 더 보기 */}
            {filtered.length === 0 ? <p role="status">조건에 맞는 캐릭터가 없습니다.</p> : null} {/* 빈 결과 */}
        </main> // 본문 종료
    ); // 반환 종료
} // 함수 종료
