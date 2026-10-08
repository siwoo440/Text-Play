"use client"; // 클라이언트 컴포넌트

import Image from "@/desktop/next-compat/image"; // 이미지 최적화
import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"; // 리액트 도구
import { canViewMatureContent, getDiscoverableCharacters } from "@chatbot/features/adult/adult-access"; // 19세 콘텐츠 필터
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { CharacterCard } from "@chatbot/features/discovery/CharacterCard"; // 캐릭터 카드
import { addTag, suggestTags, TAG_FILTER_LIMIT } from "@chatbot/features/discovery/discovery-filter"; // 태그로 좁히기(메인과 같은 규칙)
import { buildCreatorStats, buildTagStats, createExploreHref, findTag, getCharactersByTags, getTagHue, pickDiverseWorks, type CreatorStat } from "@chatbot/features/explore/explore-model"; // 탐색 계산
import { getGenreKey } from "@chatbot/lib/theme/genre-theme"; // 장르 색 조회
import styles from "@chatbot/features/explore/ExploreScreen.module.css"; // 탐색 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

const initialTagCount = 24; // 처음 보여 줄 태그 수

interface TagChipProps // 태그 칩 속성
{ // 구조 시작
    tag: string; // 태그 이름
    count?: number; // 작품 수
    selected: boolean; // 선택 상태
    onSelect(tag: string): void; // 선택 처리
} // 구조 종료

function TagChip({ tag, count, selected, onSelect }: TagChipProps) // 태그 칩
{ // 함수 시작
    const genre = getGenreKey([tag]); // 장르 태그 판정
    return ( // 칩 반환
        <button type="button" className={styles.tagChip} data-genre={genre === "other" ? undefined : genre} data-hue={genre === "other" ? getTagHue(tag) : undefined} aria-pressed={selected} onClick={() => onSelect(tag)}> {/* 태그 버튼 */}
            <span>#{tag}</span>{count === undefined ? null : <>{" "}<small>{count}</small></>} {/* 태그 이름과 작품 수 */}
        </button> // 태그 버튼 종료
    ); // 반환 종료
} // 함수 종료

interface CreatorCardProps // 제작자 카드 속성
{ // 구조 시작
    creator: CreatorStat; // 제작자 통계
    followed: boolean; // 팔로우 상태
    selectedTags: readonly string[]; // 고른 태그
    onToggleFollow(): void; // 팔로우 전환
    onSelectTag(tag: string): void; // 태그 선택
} // 구조 종료

function CreatorCard({ creator, followed, selectedTags, onToggleFollow, onSelectTag }: CreatorCardProps) // 제작자 카드
{ // 함수 시작
    const titleId = `creator-${creator.creatorId}`; // 제목 식별자
    return ( // 카드 반환
        <article className={styles.creatorCard} data-genre={creator.genre} aria-labelledby={titleId}> {/* 제작자 카드 */}
            <div className={styles.creatorHead}> {/* 제작자 머리말 */}
                <span className={styles.avatar} aria-hidden="true">{creator.creatorName.slice(0, 1)}</span> {/* 이름 첫 글자 */}
                <div> {/* 제작자 정보 */}
                    <h3 id={titleId}>{creator.creatorName}</h3> {/* 제작자 이름 */}
                    <p>{t("작품")} {creator.works.length}{t("개 · 대화")} {creator.totalPopularity.toLocaleString()}</p> {/* 제작자 지표 */}
                </div> {/* 제작자 정보 종료 */}
            </div> {/* 제작자 머리말 종료 */}
            <div className={styles.creatorWorks}> {/* 대표 작품 */}
                {creator.works.slice(0, 3).map((work) => <Link key={work.id} href={`/characters/${work.id}` as Route}><Image src={work.coverImage} alt={work.name} width={120} height={160} /></Link>)} {/* 작품 썸네일 */}
            </div> {/* 대표 작품 종료 */}
            <div className={styles.creatorTags}> {/* 자주 쓴 태그 */}
                {creator.topTags.map((tag) => <TagChip key={tag} tag={tag} selected={selectedTags.includes(tag)} onSelect={onSelectTag} />)} {/* 태그 칩 */}
            </div> {/* 자주 쓴 태그 종료 */}
            <button type="button" className={styles.followButton} aria-pressed={followed} aria-label={t("{0} 제작자 {1}", [creator.creatorName, followed ? t("팔로우 해제") : t("팔로우")])} onClick={onToggleFollow}>{followed ? t("팔로잉") : t("팔로우")}</button> {/* 팔로우 버튼 */}
        </article> // 카드 종료
    ); // 반환 종료
} // 함수 종료

function RowHeading({ id, kicker, title, description }: { id: string; kicker: string; title: string; description: string }) // 줄 제목
{ // 함수 시작
    return ( // 제목 반환
        <div className={styles.rowHeading}> {/* 제목 영역 */}
            <p className={styles.kicker}>{kicker}</p> {/* 영문 표제 */}
            <h2 id={id}>{title}</h2> {/* 줄 제목 */}
            <p className={styles.rowLead}>{description}</p> {/* 줄 설명 */}
        </div> // 제목 영역 종료
    ); // 반환 종료
} // 함수 종료

export function ExploreScreen({ initialTag }: { initialTag: string | readonly string[] | null }) // 탐색 화면(초기 태그는 하나 또는 여러 개)
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const showMature = canViewMatureContent(state, new Date()); // 19세 콘텐츠 표시 여부
    const characters = useMemo(() => getDiscoverableCharacters(state.characters, showMature), [showMature, state.characters]); // 추천 가능한 공개 작품
    const tagStats = useMemo(() => buildTagStats(characters), [characters]); // 태그 통계
    const creators = useMemo(() => buildCreatorStats(characters), [characters]); // 제작자 통계
    const works = useMemo(() => pickDiverseWorks(characters, 12), [characters]); // 추천 작품
    const [query, setQuery] = useState(""); // 태그 검색어
    const [selectedTags, setSelectedTags] = useState<string[]>(() => (initialTag === null ? [] : typeof initialTag === "string" ? [initialTag] : initialTag).reduce<string[]>((tags, item) => addTag(tags, findTag(tagStats, item) ?? item), [])); // 고른 태그(겹침 없이 한도까지)
    const [limitNotice, setLimitNotice] = useState(false); // 한도 안내 표시
    const [showAllTags, setShowAllTags] = useState(false); // 전체 태그 표시
    const resultsRef = useRef<HTMLElement>(null); // 결과 영역 참조
    const pendingFocus = useRef(false); // 결과 이동 예약
    const results = useMemo(() => (selectedTags.length === 0 ? [] : getCharactersByTags(characters, selectedTags)), [characters, selectedTags]); // 고른 태그를 모두 가진 작품
    const pool = selectedTags.length === 0 ? characters : results; // 이어서 좁힐 작품(고른 태그가 있으면 남은 작품)
    const pending = query.trim().replace(/^#+/, "").trim(); // 입력 중인 태그 글자(# 제외)
    const suggestions = useMemo(() => (pending.length === 0 ? [] : suggestTags(pool, selectedTags, pending, 12)), [pending, pool, selectedTags]); // 태그 제안(초성 포함, 남은 작품 기준)
    const narrowing = useMemo(() => (selectedTags.length === 0 || selectedTags.length >= TAG_FILTER_LIMIT || results.length < 2 ? [] : suggestTags(results, selectedTags, null).filter((stat) => stat.count < results.length)), [results, selectedTags]); // 이어서 좁힐 태그(모든 작품이 가진 태그는 좁혀지지 않아 뺌)
    const visibleTags = showAllTags ? tagStats : tagStats.slice(0, initialTagCount); // 보이는 태그
    useEffect(() => // 결과 이동 효과
    { // 효과 시작
        const section = resultsRef.current; // 결과 영역
        if (!pendingFocus.current || section === null) // 이동 예약 확인
        { // 조건 시작
            return; // 이동 생략
        } // 조건 종료
        pendingFocus.current = false; // 예약 해제
        const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches; // 동작 축소 확인
        if (typeof section.scrollIntoView === "function") // 이동 지원 확인
        { // 조건 시작
            section.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" }); // 결과로 이동
        } // 조건 종료
        section.focus({ preventScroll: true }); // 결과에 초점
    }, [selectedTags]); // 고른 태그 의존
    const applyTags = (tags: string[]) => // 고른 태그 반영
    { // 함수 시작
        setSelectedTags(tags); // 태그 저장
        setLimitNotice(false); // 한도 안내 지움
        window.history.replaceState(null, "", createExploreHref(tags)); // 주소 갱신
    }; // 함수 종료
    const selectTag = (tag: string) => // 태그 고르기(이미 골랐으면 빼기)
    { // 함수 시작
        setQuery(""); // 검색어 초기화
        if (selectedTags.includes(tag)) // 이미 고른 태그
        { // 조건 시작
            applyTags(selectedTags.filter((item) => item !== tag)); // 빼기
            return; // 처리 종료
        } // 조건 종료
        if (selectedTags.length >= TAG_FILTER_LIMIT) // 한도 도달
        { // 조건 시작
            setLimitNotice(true); // 한도 안내
            return; // 넣지 않음
        } // 조건 종료
        pendingFocus.current = true; // 결과 이동 예약
        applyTags(addTag(selectedTags, tag)); // 넣기
    }; // 함수 종료
    const clearTag = () => // 태그 모두 해제
    { // 함수 시작
        applyTags([]); // 선택 해제와 주소 초기화
    }; // 함수 종료
    const submitSearch = (event: KeyboardEvent<HTMLInputElement>) => // 검색 확정 함수
    { // 함수 시작
        if (event.key === "Backspace" && query.length === 0 && selectedTags.length > 0) // 빈 검색창에서 지우기
        { // 조건 시작
            applyTags(selectedTags.slice(0, -1)); // 마지막 태그 빼기
            return; // 처리 종료
        } // 조건 종료
        if (event.key !== "Enter" || event.nativeEvent.isComposing) // 확정 키 판정
        { // 조건 시작
            return; // 처리 생략
        } // 조건 종료
        const exact = findTag(tagStats, pending); // 정확히 같은 태그
        const target = exact !== null && !selectedTags.includes(exact) ? exact : suggestions[0]?.tag; // 정확 일치 우선
        if (target !== undefined) // 대상 존재 판정
        { // 조건 시작
            event.preventDefault(); // 기본 동작 차단
            selectTag(target); // 태그 선택
        } // 조건 종료
    }; // 함수 종료
    return ( // 화면 반환
        <main className={styles.page} data-surface="light"> {/* 탐색 화면 */}
            <header className={styles.hero}> {/* 탐색 머리말 */}
                <p className={styles.eyebrow}>{t("EXPLORE · 작품 · 제작자 · 태그")}</p> {/* 상단 표제 */}
                <h1>{t("취향을 따라")} <span className={styles.highlight}>{t("새로운 세계")}</span>{t("를 찾아보세요")}</h1> {/* 화면 제목 */}
                <p className={styles.lead}>{t("태그로 원하는 이야기를 찾고, 장르별 추천 작품과 주목할 제작자를 한눈에 둘러볼 수 있어요.")}</p> {/* 화면 설명 */}
                <div className={styles.searchBox}> {/* 태그 검색 */}
                    <span aria-hidden="true">#</span> {/* 태그 기호 */}
                    <input type="search" aria-label={t("태그 검색")} placeholder={t("태그로 찾아보기 (예: 힐링, 편지, 우주)")} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={submitSearch} /> {/* 검색 입력 */}
                </div> {/* 태그 검색 종료 */}
                {query.trim().length === 0 ? null : ( // 제안 표시 판정
                    <div className={styles.suggestions} aria-label={t("태그 검색 결과")} role="group"> {/* 태그 제안 */}
                        {suggestions.length === 0 ? <p role="status">‘{query.trim()}{t("’와 일치하는 태그가 없습니다.")}</p> : suggestions.map((stat) => <TagChip key={stat.tag} tag={stat.tag} count={stat.count} selected={false} onSelect={selectTag} />)} {/* 제안 목록 */}
                    </div> // 태그 제안 종료
                )} {/* 제안 판정 종료 */}
            </header> {/* 탐색 머리말 종료 */}

            {selectedTags.length === 0 ? null : ( // 태그 결과 판정
                <section ref={resultsRef} tabIndex={-1} className={`${styles.row} ${styles.results}`} aria-labelledby="tag-results-title"> {/* 태그 결과 */}
                    <div className={styles.resultsHeading}> {/* 결과 제목 행 */}
                        <div> {/* 결과 제목 */}
                            <p className={styles.kicker}>TAG RESULT</p> {/* 영문 표제 */}
                            <h2 id="tag-results-title">{selectedTags.map((tag) => `#${tag}`).join(" ")} {t("작품")} {results.length}{t("개")}</h2> {/* 결과 제목 */}
                        </div> {/* 결과 제목 종료 */}
                        <button type="button" className={styles.clearButton} onClick={clearTag}>{t("태그 선택 해제")}</button> {/* 해제 버튼 */}
                    </div> {/* 결과 제목 행 종료 */}
                    <div className={styles.chosenTags} role="group" aria-label={t("고른 태그")}> {/* 고른 태그 */}
                        {selectedTags.map((tag) => <button key={tag} type="button" className={styles.chosenTag} aria-label={t("#{0} 태그 빼기", [tag])} onClick={() => selectTag(tag)}><span>#{tag}</span><span aria-hidden="true">×</span></button>)} {/* 태그 빼기 */}
                        <small>{t("태그를 더 고르면 모두 가진 작품만 남아요. (최대 {0}개)", [TAG_FILTER_LIMIT])}</small> {/* 좁히기 안내 */}
                    </div> {/* 고른 태그 종료 */}
                    {!limitNotice ? null : <p className={styles.empty} role="status">{t("태그는 {0}개까지 함께 고를 수 있어요. 하나를 빼고 다시 골라 주세요.", [TAG_FILTER_LIMIT])}</p>} {/* 한도 안내 */}
                    {narrowing.length === 0 ? null : <div className={styles.narrowTags} role="group" aria-label={t("이어서 좁힐 태그")}>{narrowing.map((stat) => <TagChip key={stat.tag} tag={stat.tag} count={stat.count} selected={false} onSelect={selectTag} />)}</div>} {/* 이어서 좁히기 */}
                    {results.length === 0 ? <p className={styles.empty}>{selectedTags.length === 1 ? t("이 태그의 공개 작품이 아직 없습니다.") : t("고른 태그를 모두 가진 공개 작품이 없습니다. 태그를 하나 빼 보세요.")}</p> : <div className={styles.resultGrid}>{results.map((character) => <CharacterCard key={character.id} character={character} />)}</div>} {/* 결과 목록 */}
                </section> // 태그 결과 종료
            )} {/* 결과 판정 종료 */}

            <section className={styles.row} data-row="works" aria-labelledby="explore-works-title"> {/* 추천 작품 줄 */}
                <RowHeading id="explore-works-title" kicker="WORKS" title={t("장르별 추천 작품")} description={t("힐링부터 SF까지, 장르를 고루 섞어 인기 작품을 골랐어요.")} /> {/* 작품 제목 */}
                <div className={styles.rail}>{works.map((character) => <div key={character.id} className={styles.railItem}><CharacterCard character={character} /></div>)}</div> {/* 작품 목록 */}
            </section> {/* 추천 작품 줄 종료 */}

            <section className={styles.row} data-row="creators" aria-labelledby="explore-creators-title"> {/* 추천 제작자 줄 */}
                <RowHeading id="explore-creators-title" kicker="CREATORS" title={t("주목할 제작자")} description={t("대화가 많이 이어진 제작자와 대표 작품, 자주 쓰는 태그를 모았어요.")} /> {/* 제작자 제목 */}
                <div className={styles.rail}>{creators.map((creator) => <CreatorCard key={creator.creatorId} creator={creator} followed={state.followedCreatorIds.includes(creator.creatorId)} selectedTags={selectedTags} onToggleFollow={() => dispatch({ type: "toggle-creator-follow", creatorId: creator.creatorId })} onSelectTag={selectTag} />)}</div> {/* 제작자 목록 */}
            </section> {/* 추천 제작자 줄 종료 */}

            <section className={styles.row} data-row="tags" aria-labelledby="explore-tags-title"> {/* 추천 태그 줄 */}
                <RowHeading id="explore-tags-title" kicker="TAGS" title={t("인기 태그")} description={t("많이 쓰인 태그부터 보여 드려요. 태그를 누르면 해당 작품을 찾고, 여러 개를 고르면 모두 가진 작품으로 좁혀져요.")} /> {/* 태그 제목 */}
                <div className={styles.tagCloud}>{visibleTags.map((stat) => <TagChip key={stat.tag} tag={stat.tag} count={stat.count} selected={selectedTags.includes(stat.tag)} onSelect={selectTag} />)}</div> {/* 태그 목록 */}
                {tagStats.length > initialTagCount ? <button type="button" className={styles.moreTags} aria-expanded={showAllTags} onClick={() => setShowAllTags((value) => !value)}>{showAllTags ? t("인기 태그만 보기") : t("모든 태그 보기 ({0})", [tagStats.length])}</button> : null} {/* 태그 더 보기 */}
            </section> {/* 추천 태그 줄 종료 */}
        </main> // 화면 종료
    ); // 반환 종료
} // 함수 종료
