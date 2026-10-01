"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { canViewMatureContent } from "@chatbot/features/adult/adult-access"; // 19세 콘텐츠 판정
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { ModeSwitch } from "@chatbot/features/story/ModeSwitch"; // 모드 전환
import { StoryCard } from "@chatbot/features/story/StoryCard"; // 스토리 카드
import { getDiscoverableStories, getStoryCastEntries } from "@chatbot/features/story/story-model"; // 스토리 모델
import styles from "@chatbot/features/story/Story.module.css"; // 스토리 스타일

export function StoryHome() // 스토리 모드 홈
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태
    const showMature = canViewMatureContent(state, new Date()); // 19세 콘텐츠 표시 여부
    const stories = getDiscoverableStories(state.stories, showMature).sort((left, right) => right.popularity - left.popularity || left.title.localeCompare(right.title, "ko")); // 공개 스토리(인기순)
    const myStories = state.stories.filter((story) => story.creatorId === state.profile.id); // 내가 만든 스토리
    return ( // 화면 반환
        <main className={styles.page} data-surface="light"> {/* 스토리 홈 */}
            <ModeSwitch /> {/* 모드 전환 */}
            <header className={styles.hero}> {/* 머리말 */}
                <div> {/* 머리말 문구 */}
                    <span className={styles.eyebrow}>STORY MODE · 상황극</span> {/* 표제 */}
                    <h1>여러 인물과 함께 만드는 <span className={styles.titleHighlight}>하나의 이야기</span></h1> {/* 제목 */}
                    <p className={styles.lead}>등장인물 여럿이 함께하는 스토리도, 한 명과 펼치는 상황극도 있어요. 내 역할을 맡아 장면을 이어 가 보세요.</p> {/* 설명 */}
                </div> {/* 문구 종료 */}
                <Link href={"/stories/new" as Route} className={styles.createLink}>＋ 새 스토리 만들기</Link> {/* 만들기 */}
            </header> {/* 머리말 종료 */}
            <section className={styles.section} aria-labelledby="story-list-title"> {/* 공개 스토리 */}
                <h2 id="story-list-title" className={styles.sectionTitle}>지금 시작할 수 있는 스토리</h2> {/* 구역 제목 */}
                {stories.length === 0 ? <p className={styles.empty}>아직 공개된 스토리가 없습니다.</p> : <div className={styles.grid}>{stories.map((story) => <StoryCard key={story.id} story={story} cast={getStoryCastEntries(state, story.cast)} />)}</div>} {/* 카드 목록 */}
            </section> {/* 공개 스토리 종료 */}
            {myStories.length === 0 ? null : ( // 내 스토리 판정
                <section className={styles.section} aria-labelledby="my-story-title"> {/* 내 스토리 */}
                    <h2 id="my-story-title" className={styles.sectionTitle}>내가 만든 스토리</h2> {/* 구역 제목 */}
                    <div className={styles.grid}>{myStories.map((story) => <StoryCard key={story.id} story={story} cast={getStoryCastEntries(state, story.cast)} />)}</div> {/* 카드 목록 */}
                </section> // 내 스토리 종료
            )} {/* 내 스토리 판정 종료 */}
        </main> // 화면 종료
    ); // 반환 종료
} // 함수 종료
