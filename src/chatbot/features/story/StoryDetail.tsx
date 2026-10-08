"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Image from "@/desktop/next-compat/image"; // 최적화 이미지
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { useRouter } from "@/desktop/next-compat/navigation"; // 경로 이동
import { StatusScreen } from "@chatbot/components/feedback/StatusScreen"; // 공통 상태 화면
import { AdultContentGate } from "@chatbot/features/adult/AdultContentGate"; // 19세 잠금 화면
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { StoryCast, storyRatingLabels } from "@chatbot/features/story/StoryCard"; // 등장인물 표시
import { createSessionHref, createStoryConversation, getLatestStoryConversation, getStoryCastEntries, isStoryLocked } from "@chatbot/features/story/story-model"; // 스토리 모델
import styles from "@chatbot/features/story/Story.module.css"; // 스토리 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역
import { PageTitle } from "@chatbot/components/feedback/PageTitle"; // 탭 제목

export function StoryDetail({ storyId }: { storyId: string }) // 스토리 상세
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const router = useRouter(); // 경로 이동기
    const story = state.stories.find((item) => item.id === storyId); // 스토리 조회
    if (story === undefined) // 부재 판정
    { // 조건 시작
        return ( // 부재 화면 반환
            <StatusScreen tone="not-found" label="STORY NOT FOUND" title={t("스토리를 찾을 수 없습니다")} description={t("주소가 잘못되었거나 이 브라우저에서 삭제된 스토리입니다. 스토리 모드에서 다른 이야기를 골라 주세요.")}> {/* 부재 안내 */}
                <Link href={"/stories" as Route}>{t("스토리 모드로 이동")}</Link> {/* 목록 링크 */}
                <Link href="/">{t("메인으로 이동")}</Link> {/* 메인 링크 */}
            </StatusScreen> // 부재 안내 종료
        ); // 반환 종료
    } // 조건 종료
    if (isStoryLocked(story, state, new Date())) // 19세 잠금 판정
    { // 조건 시작
        return <AdultContentGate subject={{ kind: "story", name: story.title, coverImage: story.coverImage }} target="detail" />; // 잠금 화면 반환
    } // 조건 종료
    const cast = getStoryCastEntries(state, story.cast); // 등장인물
    const latest = getLatestStoryConversation(state.conversations, story.id); // 진행 중인 대화
    const start = () => // 새로 시작
    { // 함수 시작
        const result = createStoryConversation(state, story.id); // 스토리 대화 생성
        dispatch({ type: "replace-state", state: result.state }); // 생성 상태 저장
        router.push(result.href as Route); // 대화 화면 이동
    }; // 함수 종료
    const resume = () => // 이어하기
    { // 함수 시작
        if (latest !== null) // 대화 존재 판정
        { // 조건 시작
            router.push(createSessionHref(latest) as Route); // 기존 대화 이동
        } // 조건 종료
    }; // 함수 종료
    return ( // 상세 반환
        <main className={styles.page} data-surface="light"> {/* 스토리 상세 */}
            <PageTitle title={story.title} /> {/* 탭 제목 */}
            <section className={styles.detailHero}> {/* 상세 머리말 */}
                <div className={styles.detailMedia}><Image src={story.coverImage} alt={t("{0} 대표 이미지", [story.title])} width={720} height={480} priority /></div> {/* 대표 이미지 */}
                <div className={styles.detailCopy}> {/* 머리말 문구 */}
                    <span className={styles.eyebrow}>{t("STORY MODE · 등장인물")} {story.cast.length}{t("명")}</span> {/* 표제 */}
                    <h1>{t(story.title)}</h1> {/* 제목 */}
                    <p className={styles.detailMeta}><span className={styles.ratingInline} data-rating={story.contentRating}>{t(storyRatingLabels[story.contentRating])}</span><span>{story.creatorName}</span></p> {/* 등급·제작자 */}
                    <p className={styles.lead}>{story.summary}</p> {/* 한 줄 소개 */}
                    <StoryCast cast={cast} /> {/* 등장인물 요약 */}
                    <p className={styles.tagLine}>{story.tags.map((tag) => <span key={tag}>#{tag}</span>)}</p> {/* 태그 */}
                    <div className={styles.detailActions}> {/* 시작 동작 */}
                        {latest === null ? <button type="button" className={styles.primaryButton} onClick={start}>{t("스토리 시작")}</button> : <><button type="button" className={styles.primaryButton} onClick={resume}>{t("이어하기")}</button><button type="button" className={styles.secondaryButton} onClick={start}>{t("새로 시작")}</button></>} {/* 시작·이어하기 */}
                        {story.creatorId === state.profile.id ? <Link href={`/stories/${encodeURIComponent(story.id)}/edit` as Route} className={styles.secondaryButton}>{t("스토리 수정")}</Link> : null} {/* 내 스토리 수정 */}
                    </div> {/* 동작 종료 */}
                </div> {/* 문구 종료 */}
            </section> {/* 머리말 종료 */}
            <div className={styles.detailGrid}> {/* 상세 구역 */}
                <section className={styles.detailCard} aria-labelledby="story-synopsis-title"><h2 id="story-synopsis-title">{t("줄거리")}</h2><p>{story.synopsis.length > 0 ? story.synopsis : t("줄거리 없이 시작 장면부터 펼쳐지는 이야기입니다.")}</p></section> {/* 줄거리 */}
                <section className={styles.detailCard} aria-labelledby="story-opening-title"> {/* 시작 장면 */}
                    <h2 id="story-opening-title">{t("시작 장면")}</h2> {/* 구역 제목 */}
                    <p className={styles.openingNarration}>{story.opening}</p> {/* 내레이션 */}
                    <ul className={styles.firstLines}>{story.cast.filter((member) => member.firstLine.trim().length > 0).map((member) => <li key={member.characterId}><strong>{member.displayName}</strong><span>{member.firstLine}</span></li>)}</ul> {/* 첫 대사 */}
                </section> {/* 시작 장면 종료 */}
                <section className={styles.detailCard} aria-labelledby="story-role-title"><h2 id="story-role-title">{t("내 역할")}</h2><p>{story.userRole.length > 0 ? story.userRole : t("정해진 역할 없이 자유롭게 참여합니다.")}</p></section> {/* 내 역할 */}
                <section className={`${styles.detailCard} ${styles.castCard}`} aria-labelledby="story-cast-title"> {/* 등장인물 */}
                    <h2 id="story-cast-title">{t("등장인물")}</h2> {/* 구역 제목 */}
                    <ul className={styles.castList}> {/* 등장인물 목록 */}
                        {cast.map((entry) => ( // 인물 순회
                            <li key={entry.member.characterId}> {/* 인물 항목 */}
                                {entry.character === undefined ? <span className={styles.castMissing}><strong>{entry.member.displayName}</strong><span>{t("삭제된 캐릭터")}</span></span> : <Link href={`/characters/${encodeURIComponent(entry.character.id)}` as Route} className={styles.castLink}><span className={styles.castFace} aria-hidden="true"><Image src={entry.character.coverImage} alt="" width={96} height={96} /></span><span><strong>{entry.member.displayName}</strong><span>{entry.character.name}</span></span></Link>} {/* 인물 링크 */}
                                <p>{entry.member.role}</p> {/* 역할 */}
                            </li> // 인물 항목 종료
                        ))} {/* 인물 순회 종료 */}
                    </ul> {/* 목록 종료 */}
                </section> {/* 등장인물 종료 */}
            </div> {/* 상세 구역 종료 */}
        </main> // 상세 종료
    ); // 반환 종료
} // 함수 종료
