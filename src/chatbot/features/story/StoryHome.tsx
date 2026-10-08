"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { canViewMatureContent } from "@chatbot/features/adult/adult-access"; // 19세 콘텐츠 판정
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { ModeSwitch } from "@chatbot/features/story/ModeSwitch"; // 모드 전환
import { RewardsBanner } from "@chatbot/features/rewards/RewardsBanner"; // 출석·미션 카드
import { StoryCard } from "@chatbot/features/story/StoryCard"; // 스토리 카드
import { getDiscoverableStories, getStoryCastEntries } from "@chatbot/features/story/story-model"; // 스토리 모델
import styles from "@chatbot/features/story/Story.module.css"; // 스토리 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역
import { useEffect, useMemo, useState } from "react"; // 리액트 상태·효과
import { ListSearch } from "@chatbot/components/search/ListSearch"; // 목록 검색창
import type { Story } from "@chatbot/features/core/types"; // 스토리 타입
import { ratingFilters, type RatingFilter } from "@chatbot/features/discovery/discovery-filter"; // 이용 등급 선택지(캐릭터 홈과 같음)
import { searchBy } from "@chatbot/features/search/list-search"; // 목록 검색
import { applyStoryFilter, countActiveStoryFilters, createStoryFilter, getStartedStoryIds, isDefaultStoryFilter, parseStoredStoryFilter, STORY_FILTER_KEY, storyCastFilters, storySorts, type StoryCastFilter, type StoryFilter, type StorySort } from "@chatbot/features/story/story-filter"; // 스토리 정렬·필터

function readStoredFilter(): StoryFilter // 이 탭에서 고른 조건 읽기(없으면 기본 조건)
{ // 함수 시작
    try // 읽기 시도
    { // 시도 시작
        return (typeof window === "undefined" ? null : parseStoredStoryFilter(window.sessionStorage.getItem(STORY_FILTER_KEY))) ?? createStoryFilter(); // 기억한 조건 또는 기본
    } // 시도 종료
    catch // 읽기 실패(사생활 모드 등)
    { // 실패 시작
        return createStoryFilter(); // 기본 조건
    } // 실패 종료
} // 함수 종료

export function StoryHome() // 스토리 모드 홈
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    const showMature = canViewMatureContent(state, new Date()); // 19세 콘텐츠 표시 여부
    const [chosen, setChosen] = useState<StoryFilter>(readStoredFilter); // 정렬과 필터(이 탭에서 고른 조건을 이어받음)
    useEffect(() => // 조건 기억 효과
    { // 효과 시작
        try // 저장 시도
        { // 시도 시작
            if (isDefaultStoryFilter(chosen)) // 기본 조건
            { // 조건 시작
                window.sessionStorage.removeItem(STORY_FILTER_KEY); // 기억 지움
            } // 조건 종료
            else // 고른 조건 있음
            { // 저장 시작
                window.sessionStorage.setItem(STORY_FILTER_KEY, JSON.stringify(chosen)); // 조건 기억
            } // 저장 종료
        } // 시도 종료
        catch // 저장 실패(사생활 모드 등)
        { // 실패 시작
            // 화면 조건만 유지
        } // 실패 종료
    }, [chosen]); // 조건 의존
    const filter = useMemo<StoryFilter>(() => chosen.rating === "mature" && !showMature ? { ...chosen, rating: "any" } : chosen, [chosen, showMature]); // 19+를 끄면 19세 조건은 풀어 둠
    const startedIds = useMemo(() => getStartedStoryIds(state), [state]); // 해 본 스토리
    const stories = applyStoryFilter(getDiscoverableStories(state.stories, showMature), filter, startedIds); // 공개 스토리(조건을 걸고 정렬)
    const myStories = applyStoryFilter(state.stories.filter((story) => story.creatorId === state.profile.id), filter, startedIds); // 내가 만든 스토리(같은 조건)
    const [query, setQuery] = useState(""); // 스토리 검색어
    const fields = (story: Story) => [story.title, story.creatorName, ...story.tags, ...story.cast.map((member) => member.displayName)]; // 검색 대상(제목·제작자·태그·등장인물)
    const foundStories = searchBy(stories, query, fields); // 찾은 공개 스토리
    const foundMine = searchBy(myStories, query, fields); // 찾은 내 스토리
    const activeCount = countActiveStoryFilters(filter); // 걸린 조건 수
    const change = (patch: Partial<StoryFilter>) => setChosen((current) => ({ ...current, ...patch })); // 조건 변경
    return ( // 화면 반환
        <main className={`${styles.page} ${styles.homePage}`} data-surface="light"> {/* 스토리 홈 */}
            <ModeSwitch /> {/* 모드 전환 */}
            <header className={styles.hero}> {/* 머리말 */}
                <div> {/* 머리말 문구 */}
                    <span className={styles.eyebrow}>{t("STORY MODE · 상황극")}</span> {/* 표제 */}
                    <h1>{t("여러 인물과 함께 만드는")} <span className={styles.titleHighlight}>{t("하나의 이야기")}</span></h1> {/* 제목 */}
                    <p className={styles.lead}>{t("등장인물 여럿이 함께하는 스토리도, 한 명과 펼치는 상황극도 있어요. 내 역할을 맡아 장면을 이어 가 보세요.")}</p> {/* 설명 */}
                </div> {/* 문구 종료 */}
                <div className={styles.heroAside}><Link href={"/stories/new" as Route} className={styles.createLink}>{t("＋ 새 스토리 만들기")}</Link></div> {/* 만들기(메인의 검색창 자리) */}
            </header> {/* 머리말 종료 */}
            <RewardsBanner /> {/* 출석·미션 */}
            <div className={styles.searchRow}><ListSearch label={t("스토리 검색")} placeholder={t("제목·등장인물·태그로 찾기")} value={query} count={foundStories.length} onChange={setQuery} /></div> {/* 스토리 찾기 */}
            <section className={styles.filterBar} aria-label={t("정렬과 필터")}> {/* 정렬과 필터 */}
                <label>{t("정렬")}<select value={filter.sort} onChange={(event) => change({ sort: event.target.value as StorySort })}>{storySorts.map((item) => <option key={item.id} value={item.id}>{t(item.label)}</option>)}</select></label> {/* 정렬 */}
                <label>{t("이용 등급")}<select value={filter.rating} onChange={(event) => change({ rating: event.target.value as RatingFilter })}>{ratingFilters.filter((item) => item.id !== "mature" || showMature).map((item) => <option key={item.id} value={item.id}>{t(item.label)}</option>)}</select></label> {/* 이용 등급 */}
                <label>{t("인원")}<select value={filter.cast} onChange={(event) => change({ cast: event.target.value as StoryCastFilter })}>{storyCastFilters.map((item) => <option key={item.id} value={item.id}>{t(item.label)}</option>)}</select></label> {/* 등장인물 수 */}
                <label className={styles.filterCheck}><input type="checkbox" checked={filter.onlyNew} onChange={(event) => change({ onlyNew: event.target.checked })} />{t("처음 만나는 스토리만")}</label> {/* 해 보지 않은 스토리 */}
                <p className={styles.filterCount} role="status" aria-label={t("찾은 스토리")}>{t("스토리 {0}개", [foundStories.length])}{activeCount === 0 ? "" : t(" · 조건 {0}개", [activeCount])}</p> {/* 찾은 수 */}
                {isDefaultStoryFilter(filter) ? null : <button type="button" className={styles.filterReset} onClick={() => setChosen(createStoryFilter())}>{t("조건 지우기")}</button>} {/* 지우기 */}
            </section> {/* 정렬과 필터 종료 */}
            <section className={styles.section} aria-labelledby="story-list-title"> {/* 공개 스토리 */}
                <h2 id="story-list-title" className={styles.sectionTitle}>{t("지금 시작할 수 있는 스토리")}</h2> {/* 구역 제목 */}
                {stories.length === 0 ? <p className={styles.empty}>{activeCount === 0 ? t("아직 공개된 스토리가 없습니다.") : t("조건에 맞는 스토리가 없어요. 조건을 바꾸거나 지워 보세요.")}</p> : foundStories.length === 0 ? <p className={styles.empty}>{t("‘{0}’에 맞는 스토리가 없어요. 다른 낱말로 찾아보세요.", [query.trim()])}</p> : <div className={styles.grid}>{foundStories.map((story) => <StoryCard key={story.id} story={story} cast={getStoryCastEntries(state, story.cast)} />)}</div>} {/* 카드 목록 */}
            </section> {/* 공개 스토리 종료 */}
            {foundMine.length === 0 ? null : ( // 내 스토리 판정(검색 중이면 찾은 것만)
                <section className={styles.section} aria-labelledby="my-story-title"> {/* 내 스토리 */}
                    <h2 id="my-story-title" className={styles.sectionTitle}>{t("내가 만든 스토리")}</h2> {/* 구역 제목 */}
                    <div className={styles.grid}>{foundMine.map((story) => <StoryCard key={story.id} story={story} cast={getStoryCastEntries(state, story.cast)} />)}</div> {/* 카드 목록 */}
                </section> // 내 스토리 종료
            )} {/* 내 스토리 판정 종료 */}
        </main> // 화면 종료
    ); // 반환 종료
} // 함수 종료
