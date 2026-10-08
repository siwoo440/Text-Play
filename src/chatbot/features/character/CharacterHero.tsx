"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Image from "@/desktop/next-compat/image"; // 최적화 이미지
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { useState } from "react"; // 리액트 상태
import type { Character, CharacterDetailProfile, Conversation } from "@chatbot/features/core/types"; // 캐릭터 타입
import { createExploreHref } from "@chatbot/features/explore/explore-model"; // 탐색 주소 생성
import { contentRatingLabels } from "@chatbot/features/adult/adult-access"; // 등급 문구
import styles from "@chatbot/features/character/CharacterDetail.module.css"; // 상세 화면 스타일
import { localeTag, t, tc } from "@chatbot/lib/i18n"; // 화면 글자 번역

interface CharacterHeroProps // 히어로 속성
{ // 구조 시작
    character: Character; // 캐릭터 정보
    profile: CharacterDetailProfile; // 상세 프로필
    bookmarked: boolean; // 보관 상태
    liked: boolean; // 좋아요 상태
    followed: boolean; // 팔로우 상태
    own: boolean; // 내가 만든 캐릭터인지(팔로우·신고 대신 수정 링크를 보여 줌)
    latestConversation: Conversation | null; // 최근 대화
    creating: boolean; // 대화 생성 상태
    shareStatus: string; // 공유 상태
    onBookmark: () => void; // 보관 동작
    onLike: () => void; // 좋아요 동작
    onFollow: () => void; // 팔로우 동작
    onShare: () => void; // 공유 동작
    onReport: (trigger: HTMLButtonElement) => void; // 신고 창 열기
    onContinue: () => void; // 이어하기 동작
    onStart: () => void; // 새 대화 동작
} // 구조 종료


function formatMetric(value: number | null): string // 지표 표시 함수
{ // 함수 시작
    if (value === null) // 미확인 값 판정
    { // 조건 시작
        return t("확인되지 않음"); // 미확인 문구 반환
    } // 조건 종료
    return new Intl.NumberFormat(localeTag(), { notation: "compact", maximumFractionDigits: 1 }).format(value); // 축약 수치 반환
} // 함수 종료

function HeartIcon() // 좋아요 아이콘
{ // 함수 시작
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 20.2 4.4 13A5.1 5.1 0 0 1 11.6 5.8l.4.4.4-.4A5.1 5.1 0 0 1 19.6 13Z" /></svg>; // 하트 도형
} // 함수 종료

function BookmarkIcon() // 보관 아이콘
{ // 함수 시작
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6.5 3.5h11v17L12 17l-5.5 3.5Z" /></svg>; // 책갈피 도형
} // 함수 종료

function ShareIcon() // 공유 아이콘
{ // 함수 시작
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 12 16.5 6M8 12l8.5 6M8 12h9M14 4l3 2-3 2M14 16l3 2-3 2" /></svg>; // 공유 도형
} // 함수 종료

function ReportIcon() // 신고 아이콘(깃발)
{ // 함수 시작
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 21V4M6 5h11l-2.5 4L17 13H6" /></svg>; // 깃발 도형
} // 함수 종료

function EditIcon() // 수정 아이콘(연필)
{ // 함수 시작
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" /></svg>; // 연필 도형
} // 함수 종료

export function CharacterHero({ character, profile, bookmarked, liked, followed, own, latestConversation, creating, shareStatus, onBookmark, onLike, onFollow, onShare, onReport, onContinue, onStart }: CharacterHeroProps) // 캐릭터 히어로
{ // 함수 시작
    const [imageFailed, setImageFailed] = useState(false); // 이미지 오류 상태
    const metrics = profile.sampleMetrics; // 샘플 지표
    return ( // 히어로 반환
        <section className={styles.hero} aria-labelledby="character-title"> {/* 히어로 영역 */}
            <div className={styles.portraitFrame}> {/* 이미지 프레임 */}
                {imageFailed ? ( // 이미지 오류 분기
                    <div className={styles.imageFallback} role="img" aria-label={t("{0} 이미지 대체 화면", [character.name])}> {/* 대체 이미지 */}
                        <span className={styles.fallbackMark} aria-hidden="true">MV</span> {/* 브랜드 표시 */}
                        <span>{t("장면 이미지를 불러오지 못했습니다.")}</span> {/* 오류 안내 */}
                    </div> // 대체 이미지 종료
                ) : ( // 정상 이미지 분기
                    <Image className={styles.portrait} src={character.coverImage} alt={t("{0} 대표 이미지", [character.name])} width={720} height={900} sizes="(max-width: 719px) 100vw, (max-width: 1100px) 42vw, 430px" priority onError={() => setImageFailed(true)} /> // 대표 이미지
                )} {/* 이미지 분기 종료 */}
                <span className={styles.ratingBadge} data-rating={profile.contentRating}>{t(contentRatingLabels[profile.contentRating])}</span> {/* 등급 배지 */}
            </div> {/* 이미지 프레임 종료 */}
            <div className={styles.heroContent}> {/* 히어로 정보 */}
                <div className={styles.creatorRow}> {/* 제작자 행 */}
                    <div> {/* 제작자 정보 */}
                        <span className={styles.eyebrow}>CREATOR</span> {/* 제작자 라벨 */}
                        <strong>{character.creatorName}</strong> {/* 제작자 이름 */}
                        <small className={styles.localOnly}>{t("로컬 전용 · 서버 동기화 없음")}</small> {/* 로컬 범위 안내 */}
                    </div> {/* 제작자 정보 종료 */}
                    {own ? <span className={styles.ownBadge}>{t("내가 만든 캐릭터")}</span> : <button className={styles.followButton} type="button" aria-pressed={followed} aria-label={t("{0} 제작자 {1}", [character.creatorName, followed ? t("팔로우 해제") : t("팔로우")])} onClick={onFollow}>{followed ? t("팔로잉") : t("팔로우")}</button>} {/* 팔로우 버튼(내 캐릭터면 표시만) */}
                </div> {/* 제작자 행 종료 */}
                <div className={styles.titleBlock}> {/* 제목 묶음 */}
                    <p className={styles.kicker}>MATE:VERSE ORIGINAL</p> {/* 서비스 라벨 */}
                    <h1 id="character-title">{character.name}</h1> {/* 캐릭터 이름 */}
                    <p className={styles.summary}>{character.summary}</p> {/* 한 줄 소개 */}
                </div> {/* 제목 묶음 종료 */}
                <ul className={styles.badgeList} aria-label={t("캐릭터 특징")}> {/* 배지 목록 */}
                    {profile.badges.map((badge) => <li key={badge}>{badge}</li>)} {/* 배지 항목 */}
                </ul> {/* 배지 목록 종료 */}
                <ul className={styles.tagList} aria-label={t("캐릭터 태그")}> {/* 태그 목록 */}
                    {character.tags.map((tag) => <li key={tag}><Link href={createExploreHref(tag) as Route}>#{tag}</Link></li>)} {/* 태그 탐색 링크 */}
                </ul> {/* 태그 목록 종료 */}
                <div className={styles.metricPanel}> {/* 지표 패널 */}
                    <div className={styles.metricHeader}><strong>{t("이용 지표")}</strong><span>{t("샘플 데이터")}</span></div> {/* 지표 머리말 */}
                    <dl className={styles.metrics}> {/* 지표 목록 */}
                        <div><dt>{tc("metric", "대화")}</dt><dd>{formatMetric(metrics.conversations)}</dd></div> {/* 대화 지표 */}
                        <div><dt>{tc("metric", "보관")}</dt><dd>{formatMetric(metrics.bookmarks)}</dd></div> {/* 보관 지표 */}
                        <div><dt>{tc("metric", "평가")}</dt><dd>{formatMetric(metrics.ratings)}</dd></div> {/* 평가 지표 */}
                    </dl> {/* 지표 목록 종료 */}
                </div> {/* 지표 패널 종료 */}
                <div className={styles.quickActions} aria-label={t("캐릭터 빠른 동작")}> {/* 빠른 동작 */}
                    <button type="button" aria-pressed={liked} aria-label={t("{0} 좋아요", [character.name])} onClick={onLike}><HeartIcon /><span>{liked ? t("좋아요 취소") : t("좋아요")}</span></button> {/* 좋아요 버튼 */}
                    <button type="button" aria-pressed={bookmarked} aria-label={`${character.name} ${bookmarked ? t("보관함에서 제거") : t("보관함에 추가")}`} onClick={onBookmark}><BookmarkIcon /><span>{bookmarked ? t("보관됨") : t("보관")}</span></button> {/* 보관 버튼 */}
                    <button type="button" aria-label={t("{0} 공유", [character.name])} onClick={onShare}><ShareIcon /><span>{t("공유")}</span></button> {/* 공유 버튼 */}
                    {own ? <Link href={`/characters/${character.id}/edit` as Route} aria-label={t("{0} 수정", [character.name])}><EditIcon /><span>{t("수정")}</span></Link> : <button type="button" aria-label={t("{0} 신고", [character.name])} onClick={(event) => onReport(event.currentTarget)}><ReportIcon /><span>{t("신고")}</span></button>} {/* 내 캐릭터는 수정, 남의 캐릭터는 신고(메뉴 없이 신고 창을 열던 「더보기」를 하는 일 그대로의 이름으로) */}
                </div> {/* 빠른 동작 종료 */}
                {shareStatus.length === 0 ? null : <p className={styles.shareStatus} role="status">{shareStatus}</p>} {/* 공유 상태 안내 */}
                <div className={styles.heroConversationActions} aria-label={t("히어로 대화 시작 동작")}> {/* 히어로 대화 동작 */}
                    {latestConversation === null ? null : <button type="button" className={styles.secondaryAction} aria-label={t("히어로 최근 대화 이어하기")} onClick={onContinue}>{t("최근 대화 이어하기")}</button>} {/* 히어로 이어하기 */}
                    <button type="button" className={styles.primaryAction} aria-label={t("히어로 새 대화 시작")} disabled={creating} onClick={onStart}>{creating ? t("대화 준비 중…") : t("새 대화 시작")}</button> {/* 히어로 새 대화 */}
                </div> {/* 히어로 대화 동작 종료 */}
            </div> {/* 히어로 정보 종료 */}
        </section> // 히어로 영역 종료
    ); // 반환 종료
} // 함수 종료
