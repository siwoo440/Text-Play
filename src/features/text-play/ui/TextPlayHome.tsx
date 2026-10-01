"use client"; // 클라이언트 컴포넌트

import { useEffect, useMemo, useState } from "react"; // 리액트 도구
import { filterTextPlayWorks, getTextPlayGenreKeyByLabel, TEXT_PLAY_CATEGORIES, TEXT_PLAY_WORKS, type TextPlayWork } from "@/features/text-play/catalog/text-play-catalog"; // 작품 목록
import type { TextPlaySaveSlot } from "@/features/text-play/core/types"; // 저장 슬롯 계약
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import { useTextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 훅
import { createBrowserTextPlaySaveRepository } from "@/features/text-play/storage/browser-save-repository"; // 브라우저 저장소 생성기
import type { TextPlaySaveRepository } from "@/features/text-play/storage/save-repository"; // 저장소 계약
import { TextPlayDialog } from "@/features/text-play/ui/TextPlayDialog"; // 공통 대화상자
import { formatTextPlaySaveSummary } from "@/features/text-play/ui/text-play-save-summary"; // 저장 요약 생성기
import styles from "@/features/text-play/ui/TextPlayHome.module.css"; // 메인 스타일

export interface TextPlayHomeProps // 메인 속성
{ // 구조 시작
    repository?: TextPlaySaveRepository; // 저장소 주입
    showHeader?: boolean; // 자체 헤더 표시 여부
} // 구조 종료

const PAGE_SIZE = 12; // 한 번에 보여 줄 작품 수

function scrollToSection(id: string) // 구역 이동
{ // 함수 시작
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); // 부드러운 이동
} // 함수 종료

function WorkCover({ work, priority = false }: { work: TextPlayWork; priority?: boolean }) // 작품 표지
{ // 함수 시작
    const platform = useTextPlayPlatform(); // 실행 플랫폼 조회
    return <span className={styles.cover}>{platform.renderSceneImage(work.coverImage, { priority, sizes: "240px" })}</span>; // 표지 반환
} // 함수 종료

function WorkCard({ work, onSelect }: { work: TextPlayWork; onSelect(work: TextPlayWork): void }) // 작품 카드
{ // 함수 시작
    return ( // 카드 반환
        <button type="button" className={`${styles.card} ${styles.genre}`} data-genre={work.genre} aria-label={`${work.title} - ${work.summary}`} onClick={() => onSelect(work)}> {/* 작품 카드 */}
            <span className={styles.cardMedia}> {/* 이미지 영역 */}
                <WorkCover work={work} /> {/* 작품 표지 */}
                <em className={styles.genreChip}>{work.genreLabel}</em> {/* 장르 표시 */}
                <em className={styles.statusChip} data-playable={work.playable}>{work.playable ? "플레이 가능" : "준비 중"}</em> {/* 공개 상태 */}
            </span> {/* 이미지 영역 종료 */}
            <span className={styles.cardBody}> {/* 카드 설명 */}
                <strong>{work.title}</strong> {/* 작품 제목 */}
                <span>{work.summary}</span> {/* 한 줄 소개 */}
                <small>{work.playCount.toLocaleString("ko-KR")} 플레이</small> {/* 플레이 수 */}
            </span> {/* 설명 종료 */}
        </button> // 카드 종료
    ); // 반환 종료
} // 함수 종료

export function TextPlayHome({ repository, showHeader = false }: TextPlayHomeProps) // Text-Play 메인
{ // 함수 시작
    const platform = useTextPlayPlatform(); // 실행 플랫폼 조회
    const [activeRepository] = useState<TextPlaySaveRepository>(() => repository ?? createBrowserTextPlaySaveRepository()); // 활성 저장소 생성
    const [resumeSlot, setResumeSlot] = useState<TextPlaySaveSlot | null>(null); // 이어하기 슬롯 상태
    const [storageWarning, setStorageWarning] = useState<string | null>(null); // 화면 표시 후 반영할 저장 경고
    const [query, setQuery] = useState(""); // 검색어
    const [category, setCategory] = useState("전체"); // 선택 장르
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE); // 표시 작품 수
    const [selectedWork, setSelectedWork] = useState<TextPlayWork | null>(null); // 상세 작품
    useEffect(() => // 자동 저장 조회 효과
    { // 효과 시작
        let cancelled = false; // 취소 상태
        void activeRepository.load(DEMO_TEXT_PLAY_PACKAGE.id, "auto").then((slot) => // 자동 슬롯 조회
        { // 처리 시작
            if (!cancelled) // 취소 여부 확인
            { // 조건 시작
                setResumeSlot(slot); // 이어하기 슬롯 반영
            } // 조건 종료
        }).catch(() => // 조회 실패 처리
        { // 오류 시작
            if (!cancelled) // 취소 여부 확인
            { // 조건 시작
                setResumeSlot(null); // 이어하기 슬롯 해제
            } // 조건 종료
        }).finally(() => // 저장 방식 확인
        { // 처리 시작
            if (!cancelled) // 취소 여부 확인
            { // 조건 시작
                setStorageWarning(activeRepository.getStorageWarning?.() ?? null); // 저장 경고 반영
            } // 조건 종료
        }); // 조회 종료
        return () => // 효과 정리
        { // 정리 시작
            cancelled = true; // 조회 반영 취소
        }; // 정리 종료
    }, [activeRepository]); // 저장소 의존
    const filtered = useMemo(() => filterTextPlayWorks(TEXT_PLAY_WORKS, query, category), [category, query]); // 필터 결과
    const defaultView = query.trim().length === 0 && category === "전체"; // 기본 화면 판정
    const featured = TEXT_PLAY_WORKS.find((work) => work.playable) ?? TEXT_PLAY_WORKS[0]; // 오늘의 작품
    const ranking = defaultView ? TEXT_PLAY_WORKS.slice(0, 10) : []; // 랭킹 작품
    const browsable = defaultView ? TEXT_PLAY_WORKS.slice(10) : filtered; // 탐색 대상
    const visibleWorks = browsable.slice(0, visibleCount); // 현재 표시 작품
    const resumeSummary = resumeSlot === null ? null : formatTextPlaySaveSummary(resumeSlot); // 이어하기 요약
    const updateQuery = (value: string) => // 검색어 변경
    { // 함수 시작
        setQuery(value); // 검색어 저장
        setVisibleCount(PAGE_SIZE); // 표시 수 초기화
    }; // 함수 종료
    const updateCategory = (value: string) => // 장르 변경
    { // 함수 시작
        setCategory(value); // 장르 저장
        setVisibleCount(PAGE_SIZE); // 표시 수 초기화
    }; // 함수 종료
    const playActions = (initialFocus: boolean) => // 플레이 버튼 묶음
    ( // 버튼 반환
        <div className={styles.actions}> {/* 플레이 동작 */}
            <button type="button" className={styles.primary} data-dialog-initial={initialFocus ? "" : undefined} onClick={() => platform.navigate("new")}>새 게임</button> {/* 새 게임 */}
            {resumeSlot === null ? <span className={styles.disabled}>이어할 저장 없음</span> : <button type="button" className={styles.secondary} onClick={() => platform.navigate("resume")}>이어하기</button>} {/* 이어하기 */}
        </div> // 동작 종료
    ); // 묶음 종료
    return ( // 메인 반환
        <main className={styles.home} data-text-play-home> {/* 메인 화면 */}
            {showHeader ? ( // 자체 헤더 확인
                <header className={styles.appHeader}> {/* 상단 헤더 */}
                    <span className={styles.brand}> {/* 브랜드 */}
                        <span className={styles.logo}>{platform.renderSceneImage("/images/brand/mate-verse-logo-v3.png", { sizes: "180px" })}</span> {/* 로고 */}
                        <span className={styles.brandBadge}>Text-Play</span> {/* 제품 표시 */}
                    </span> {/* 브랜드 종료 */}
                    <nav aria-label="주요 메뉴"> {/* 주요 메뉴 */}
                        <button type="button" className={styles.navLink} data-accent="explore" aria-current="page" onClick={() => scrollToSection("text-play-top")}>작품 탐색</button> {/* 탐색 메뉴 */}
                        <button type="button" className={styles.navLink} data-accent="ranking" onClick={() => scrollToSection("text-play-ranking")}>인기 랭킹</button> {/* 랭킹 메뉴 */}
                        <button type="button" className={styles.navLink} data-accent="library" onClick={() => scrollToSection("text-play-catalog")}>전체 작품</button> {/* 전체 메뉴 */}
                    </nav> {/* 메뉴 종료 */}
                    {resumeSlot === null ? <button type="button" className={styles.headerAction} onClick={() => platform.navigate("new")}>바로 시작</button> : <button type="button" className={styles.headerAction} onClick={() => platform.navigate("resume")}>바로 이어하기</button>} {/* 빠른 실행 */}
                </header> // 헤더 종료
            ) : null} {/* 자체 헤더 종료 */}
            <div className={styles.content}> {/* 본문 */}
                <section id="text-play-top" className={styles.hero} aria-labelledby="text-play-title"> {/* 소개 영역 */}
                    <div> {/* 소개 문구 */}
                        <span className={styles.eyebrow}>선택과 직접 입력으로 이어지는 이야기</span> {/* 상단 문구 */}
                        <h1 id="text-play-title">오늘, <span className={styles.titleHighlight}>어떤 이야기</span>를 플레이할까요?</h1> {/* 페이지 제목 */}
                        <p className={styles.heroLead}>판타지부터 미스터리까지, {TEXT_PLAY_WORKS.length}개의 작품이 당신의 선택을 기다리고 있어요.</p> {/* 페이지 설명 */}
                    </div> {/* 문구 종료 */}
                    <div className={styles.searchBox}> {/* 검색 영역 */}
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg> {/* 검색 아이콘 */}
                        <input type="search" aria-label="작품과 등장인물 검색" placeholder="작품과 등장인물 검색" value={query} onChange={(event) => updateQuery(event.target.value)} /> {/* 검색 입력 */}
                    </div> {/* 검색 영역 종료 */}
                </section> {/* 소개 영역 종료 */}
                {storageWarning === null ? null : <p className={styles.storageWarning} role="alert">{storageWarning}</p>} {/* 저장 경고 */}
                <div className={styles.categories} role="group" aria-label="작품 장르"> {/* 장르 필터 */}
                    {TEXT_PLAY_CATEGORIES.map((label) => <button key={label} type="button" className={styles.genre} data-genre={getTextPlayGenreKeyByLabel(label)} aria-pressed={category === label} onClick={() => updateCategory(label)}>{label}</button>)} {/* 장르 버튼 */}
                </div> {/* 장르 필터 종료 */}
                {defaultView ? ( // 기본 화면 확인
                    <section className={`${styles.featured} ${styles.genre}`} data-genre={featured.genre} aria-labelledby="featured-title"> {/* 오늘의 작품 */}
                        <div> {/* 작품 설명 */}
                            <span className={styles.featuredLabel}>오늘의 작품</span> {/* 추천 표시 */}
                            <h2 id="featured-title">{featured.title}</h2> {/* 작품 제목 */}
                            <p>{featured.summary}</p> {/* 작품 소개 */}
                            <ul className={styles.tagList} aria-label="작품 태그">{featured.tags.map((tag) => <li key={tag}>#{tag}</li>)}</ul> {/* 태그 목록 */}
                            {resumeSummary === null ? null : <p className={styles.progress}>이어하기 · {resumeSummary}</p>} {/* 저장 진행 요약 */}
                            {playActions(false)} {/* 플레이 동작 */}
                        </div> {/* 설명 종료 */}
                        <span className={styles.featuredCover}><WorkCover work={featured} priority /></span> {/* 작품 표지 */}
                    </section> // 오늘의 작품 종료
                ) : null} {/* 오늘의 작품 종료 */}
                {ranking.length > 0 ? ( // 랭킹 확인
                    <section id="text-play-ranking" className={styles.ranking} aria-labelledby="ranking-title"> {/* 랭킹 영역 */}
                        <div className={styles.sectionHeading}> {/* 제목 묶음 */}
                            <div> {/* 제목 문구 */}
                                <span>지금 가장 많이 플레이하는 작품</span> {/* 제목 설명 */}
                                <h2 id="ranking-title">인기 랭킹</h2> {/* 랭킹 제목 */}
                            </div> {/* 문구 종료 */}
                            <strong>TOP 10</strong> {/* 순위 범위 */}
                        </div> {/* 제목 종료 */}
                        <ol className={styles.rankingGrid}> {/* 랭킹 목록 */}
                            {ranking.map((work, index) => <li key={work.id} className={styles.rankingItem}><span className={styles.rankBadge} data-rank={index < 3 ? index + 1 : undefined}>{index + 1}위</span><WorkCard work={work} onSelect={setSelectedWork} /></li>)} {/* 랭킹 항목 */}
                        </ol> {/* 목록 종료 */}
                    </section> // 랭킹 종료
                ) : null} {/* 랭킹 종료 */}
                <section id="text-play-catalog" className={styles.rail} aria-labelledby="catalog-title"> {/* 작품 목록 */}
                    <h2 id="catalog-title">{defaultView ? "전체 작품" : "작품 탐색 결과"}</h2> {/* 목록 제목 */}
                    <div className={styles.grid}>{visibleWorks.map((work) => <WorkCard key={work.id} work={work} onSelect={setSelectedWork} />)}</div> {/* 작품 카드 */}
                    {visibleWorks.length < browsable.length ? <button type="button" className={styles.loadMore} onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>작품 더 보기</button> : null} {/* 더 보기 */}
                    {filtered.length === 0 ? <p className={styles.empty} role="status">조건에 맞는 작품이 없습니다.</p> : null} {/* 빈 결과 */}
                </section> {/* 작품 목록 종료 */}
            </div> {/* 본문 종료 */}
            <TextPlayDialog labelledBy="work-detail-title" describedBy="work-detail-description" open={selectedWork !== null} tone="light" onClose={() => setSelectedWork(null)}> {/* 작품 상세 */}
                {selectedWork === null ? null : ( // 상세 작품 확인
                    <div className={`${styles.detail} ${styles.genre}`} data-genre={selectedWork.genre}> {/* 상세 내용 */}
                        <span className={styles.detailCover}><WorkCover work={selectedWork} /></span> {/* 상세 표지 */}
                        <div> {/* 상세 설명 */}
                            <span className={styles.featuredLabel}>{selectedWork.genreLabel}</span> {/* 장르 표시 */}
                            <h2 id="work-detail-title">{selectedWork.title}</h2> {/* 작품 제목 */}
                            <p className={styles.detailLead}>주인공 {selectedWork.leadName} · {selectedWork.playCount.toLocaleString("ko-KR")} 플레이</p> {/* 작품 정보 */}
                            <p id="work-detail-description">{selectedWork.description}</p> {/* 상세 소개 */}
                            <ul className={styles.tagList} aria-label="작품 태그">{selectedWork.tags.map((tag) => <li key={tag}>#{tag}</li>)}</ul> {/* 태그 목록 */}
                            {selectedWork.playable ? playActions(true) : <div className={styles.actions}><button type="button" className={styles.primary} disabled>준비 중인 작품입니다</button></div>} {/* 상세 동작 */}
                        </div> {/* 설명 종료 */}
                    </div> // 상세 내용 종료
                )} {/* 상세 작품 종료 */}
            </TextPlayDialog> {/* 작품 상세 종료 */}
        </main> // 메인 종료
    ); // 반환 종료
} // 함수 종료
