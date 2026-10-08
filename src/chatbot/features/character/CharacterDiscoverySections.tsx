"use client"; // 클라이언트 컴포넌트

import Image from "@/desktop/next-compat/image"; // 최적화 이미지
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { useState } from "react"; // 리액트 상태
import styles from "@chatbot/features/character/CharacterDetail.module.css"; // 상세 화면 스타일
import type { Character, CharacterDetailProfile, UserProfile } from "@chatbot/features/core/types"; // 도메인 타입
import { getGenreKey, getGenreLabel } from "@chatbot/lib/theme/genre-theme"; // 장르 색 조회
import { localeTag, t } from "@chatbot/lib/i18n"; // 화면 글자 번역·날짜와 숫자 형식

type RankingPeriod = "weekly" | "daily" | "all"; // 랭킹 기간

const rankingTabs: Array<{ id: RankingPeriod; label: string }> = // 랭킹 탭 목록
[ // 목록 시작
    { id: "weekly", label: "주간" }, // 주간 탭
    { id: "daily", label: "일간" }, // 일간 탭
    { id: "all", label: "누적" }, // 누적 탭
]; // 목록 종료

function formatReleaseDate(value: string): string // 배포 날짜 표시
{ // 함수 시작
    const [year, month, day] = value.split("-").map(Number); // 날짜 요소 분리
    return `${year}. ${month}. ${day}.`; // 한국 날짜 반환
} // 함수 종료

function formatRankingScore(character: Character, period: RankingPeriod): string // 랭킹 수치 표시
{ // 함수 시작
    const divisor = period === "daily" ? 8200 : period === "weekly" ? 2300 : 1; // 기간별 환산값
    const score = period === "all" ? character.popularity : Math.max(1, Math.round(character.popularity / divisor)); // 샘플 수치 계산
    return t("{0}회", [new Intl.NumberFormat(localeTag(), { notation: score >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(score)]); // 수치 문구 반환
} // 함수 종료

interface CharacterDiscoverySectionsProps // 보조 섹션 속성
{ // 구조 시작
    profile: CharacterDetailProfile; // 상세 프로필
    userProfile: UserProfile; // 로컬 사용자 프로필
    characters: Character[]; // 전체 캐릭터
    relatedCharacters: Character[]; // 연관 캐릭터
} // 구조 종료

export function CharacterDiscoverySections({ profile, userProfile, characters, relatedCharacters }: CharacterDiscoverySectionsProps) // 캐릭터 보조 섹션
{ // 함수 시작
    const [period, setPeriod] = useState<RankingPeriod>("weekly"); // 랭킹 기간 상태
    const rankedCharacters = [...characters].filter((character) => character.visibility === "public" && character.publicationStatus === "published").sort((left, right) => period === "daily" ? right.updatedAt.localeCompare(left.updatedAt) || right.popularity - left.popularity : right.popularity - left.popularity).slice(0, 3); // 샘플 랭킹 계산
    const periodLabel = rankingTabs.find((tab) => tab.id === period)?.label ?? t("주간"); // 선택 기간 문구
    return ( // 보조 섹션 반환
        <div className={styles.discoverySections}> {/* 보조 섹션 묶음 */}
            <section className={styles.updateSection} aria-labelledby="update-title"> {/* 업데이트 영역 */}
                <div className={styles.discoveryHeading}> {/* 업데이트 머리말 */}
                    <div><span className={styles.eyebrow}>CHANGE LOG</span><h2 id="update-title">{t("업데이트 정보")}</h2></div> {/* 업데이트 제목 */}
                    <span className={styles.samplePill}>LOCAL DATA</span> {/* 데이터 표기 */}
                </div> {/* 머리말 종료 */}
                {profile.releaseNotes.length === 0 ? <p className={styles.emptyDiscovery}>{t("등록된 업데이트 정보가 없습니다.")}</p> : ( // 업데이트 빈 상태
                    <ol className={styles.releaseList}> {/* 업데이트 목록 */}
                        {profile.releaseNotes.map((note) => ( // 업데이트 순회
                            <li key={`${note.version}-${note.date}`}> {/* 업데이트 항목 */}
                                <div><strong>v{note.version}</strong><time dateTime={note.date}>{formatReleaseDate(note.date)}</time></div> {/* 버전 날짜 */}
                                <div>{note.title.length === 0 ? null : <h3>{t(note.title)}</h3>}<ul>{note.changes.map((change) => <li key={change}>{change}</li>)}</ul></div> {/* 변경 내용 */}
                            </li> // 업데이트 항목 종료
                        ))} {/* 순회 종료 */}
                    </ol> // 업데이트 목록 종료
                )} {/* 빈 상태 종료 */}
            </section> {/* 업데이트 영역 종료 */}
            <section className={styles.rankingSection} aria-labelledby="ranking-title"> {/* 랭킹 영역 */}
                <div className={styles.discoveryHeading}> {/* 랭킹 머리말 */}
                    <div><span className={styles.eyebrow}>COMMUNITY</span><h2 id="ranking-title">{t("사용자 랭킹")}</h2></div> {/* 랭킹 제목 */}
                    <span className={styles.samplePill}>{t("샘플 랭킹")}</span> {/* 샘플 표기 */}
                </div> {/* 머리말 종료 */}
                <div className={styles.rankingTabs} role="tablist" aria-label={t("랭킹 기간")}> {/* 랭킹 탭 */}
                    {rankingTabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={period === tab.id} onClick={() => setPeriod(tab.id)}>{t(tab.label)}</button>)} {/* 탭 항목 */}
                </div> {/* 랭킹 탭 종료 */}
                <ol className={styles.rankingList} aria-label={t("{0} 샘플 랭킹", [periodLabel])}> {/* 랭킹 목록 */}
                    {rankedCharacters.map((character, index) => ( // 랭킹 순회
                        <li key={character.id}> {/* 랭킹 항목 */}
                            <strong>{index + 1}</strong> {/* 순위 */}
                            <Image src={character.coverImage} alt="" width={50} height={50} /> {/* 캐릭터 이미지 */}
                            <span><b>{character.name}</b><small>{character.creatorName}</small></span> {/* 캐릭터 정보 */}
                            <em>{formatRankingScore(character, period)}</em> {/* 랭킹 수치 */}
                        </li> // 랭킹 항목 종료
                    ))} {/* 순회 종료 */}
                </ol> {/* 랭킹 목록 종료 */}
                <div className={styles.myRanking} aria-label={t("내 샘플 순위")}> {/* 내 순위 */}
                    <strong>{t("내 순위")}</strong> {/* 순위 표제 */}
                    <span className={styles.myRankingAvatar} aria-hidden="true">{userProfile.avatar}</span> {/* 사용자 표시 */}
                    <span><b>{userProfile.nickname}</b><small>{t("로컬 Mock 프로필")}</small></span> {/* 사용자 정보 */}
                    <em>{t("집계 전 · 샘플 데이터")}</em> {/* 샘플 상태 */}
                </div> {/* 내 순위 종료 */}
            </section> {/* 랭킹 영역 종료 */}
            <section className={styles.relatedSection} aria-labelledby="related-title"> {/* 연관 영역 */}
                <div className={styles.discoveryHeading}> {/* 연관 머리말 */}
                    <div><span className={styles.eyebrow}>DISCOVER MORE</span><h2 id="related-title">{t("이 캐릭터와 비슷해요")}</h2></div> {/* 연관 제목 */}
                </div> {/* 머리말 종료 */}
                <ul className={styles.relatedRail} aria-label={t("연관 캐릭터")}> {/* 연관 캐릭터 목록 */}
                    {relatedCharacters.slice(0, 8).map((character) => ( // 연관 순회
                        <li key={character.id}> {/* 연관 항목 */}
                            <Link href={`/characters/${character.id}`} data-genre={getGenreKey(character.tags)}> {/* 상세 링크 */}
                                <div><Image src={character.coverImage} alt={t("{0} 대표 이미지", [character.name])} fill sizes="(max-width: 520px) 58vw, 220px" /><em>{getGenreLabel(character.tags)}</em></div> {/* 연관 이미지와 장르 */}
                                <strong>{character.name}</strong> {/* 연관 이름 */}
                                <small>{character.summary}</small> {/* 연관 소개 */}
                            </Link> {/* 상세 링크 종료 */}
                        </li> // 연관 항목 종료
                    ))} {/* 순회 종료 */}
                </ul> {/* 연관 목록 종료 */}
            </section> {/* 연관 영역 종료 */}
        </div> // 보조 섹션 묶음 종료
    ); // 반환 종료
} // 함수 종료
