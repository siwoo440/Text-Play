"use client"; // 클라이언트 컴포넌트

import { useState } from "react"; // 리액트 상태
import type { Character, CharacterDetailProfile } from "@chatbot/features/core/types"; // 캐릭터 타입
import styles from "@chatbot/features/character/CharacterDetail.module.css"; // 상세 화면 스타일

interface CharacterStoryInfoProps // 스토리 속성
{ // 구조 시작
    character: Character; // 캐릭터 정보
    profile: CharacterDetailProfile; // 상세 프로필
} // 구조 종료

interface StoryItemProps // 스토리 항목 속성
{ // 구조 시작
    title: string; // 항목 제목
    content: string; // 항목 내용
} // 구조 종료

function StoryItem({ title, content }: StoryItemProps) // 스토리 항목
{ // 함수 시작
    return <article className={styles.storyItem}><h3>{title}</h3><p>{content}</p></article>; // 항목 반환
} // 함수 종료

export function CharacterStoryInfo({ character, profile }: CharacterStoryInfoProps) // 스토리 정보
{ // 함수 시작
    const [expanded, setExpanded] = useState(false); // 확장 상태
    const collapsible = character.description.length > 220; // 긴 설명 판정
    return ( // 스토리 반환
        <section className={styles.storySection} aria-labelledby="story-title"> {/* 스토리 영역 */}
            <div className={styles.sectionHeading}> {/* 섹션 머리말 */}
                <span className={styles.eyebrow}>STORY PROFILE</span> {/* 영문 라벨 */}
                <h2 id="story-title">캐릭터 소개</h2> {/* 섹션 제목 */}
            </div> {/* 섹션 머리말 종료 */}
            <div className={`${styles.storyGrid} ${collapsible && !expanded ? styles.storyCollapsed : ""}`}> {/* 스토리 내용 */}
                <StoryItem title="소개" content={character.description} /> {/* 소개 항목 */}
                <StoryItem title="성격" content={character.personality} /> {/* 성격 항목 */}
                <StoryItem title="세계관" content={character.worldSetting} /> {/* 세계관 항목 */}
                <StoryItem title="관계 설정" content={profile.relationshipSetup} /> {/* 관계 항목 */}
                <StoryItem title="대화 스타일" content={profile.dialogueStyle} /> {/* 대화 항목 */}
                <article className={styles.storyItem}> {/* 주의 항목 */}
                    <h3>콘텐츠 주의 사항</h3> {/* 주의 제목 */}
                    {profile.contentWarnings.length === 0 ? <p>별도 안내 없음</p> : <ul className={styles.warningList}>{profile.contentWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>} {/* 주의 내용 */}
                </article> {/* 주의 항목 종료 */}
            </div> {/* 스토리 내용 종료 */}
            {collapsible ? <button className={styles.expandButton} type="button" aria-expanded={expanded} aria-label={`캐릭터 상세 ${expanded ? "접기" : "전체 보기"}`} onClick={() => setExpanded((current) => !current)}>{expanded ? "접기" : "전체 보기"}<span aria-hidden="true">{expanded ? "↑" : "↓"}</span></button> : null} {/* 확장 버튼 */}
        </section> // 스토리 영역 종료
    ); // 반환 종료
} // 함수 종료
