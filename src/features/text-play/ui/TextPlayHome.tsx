"use client"; // 클라이언트 컴포넌트

import { useEffect, useState } from "react"; // 리액트 도구
import type { TextPlaySaveSlot } from "@/features/text-play/core/types"; // 저장 슬롯 계약
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import { useTextPlayPlatform } from "@/features/text-play/platform/text-play-platform"; // 플랫폼 훅
import { createBrowserTextPlaySaveRepository } from "@/features/text-play/storage/browser-save-repository"; // 브라우저 저장소 생성기
import type { TextPlaySaveRepository } from "@/features/text-play/storage/save-repository"; // 저장소 계약
import styles from "@/features/text-play/ui/TextPlayHome.module.css"; // 홈 스타일

export interface TextPlayHomeProps // 홈 속성
{ // 구조 시작
    repository?: TextPlaySaveRepository; // 저장소 주입
} // 구조 종료

function formatPlayTime(totalSeconds: number): string // 플레이 시간 표시
{ // 함수 시작
    const minutes = Math.floor(totalSeconds / 60); // 전체 분 계산
    const seconds = totalSeconds % 60; // 남은 초 계산
    return `${minutes}분 ${seconds}초`; // 시간 문구 반환
} // 함수 종료

export function TextPlayHome({ repository }: TextPlayHomeProps) // Text-Play 홈
{ // 함수 시작
    const platform = useTextPlayPlatform(); // 실행 플랫폼 조회
    const [activeRepository] = useState<TextPlaySaveRepository>(() => repository ?? createBrowserTextPlaySaveRepository()); // 활성 저장소 생성
    const [resumeSlot, setResumeSlot] = useState<TextPlaySaveSlot | null>(null); // 이어하기 슬롯 상태
    const [storageWarning, setStorageWarning] = useState<string | null>(null); // 화면 표시 후 반영할 저장 경고
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
    return ( // 홈 반환
        <main className={styles.page}> {/* 홈 화면 */}
            <section className={styles.hero} aria-labelledby="text-play-title"> {/* 소개 영역 */}
                <p className={styles.eyebrow}>MATE VERSE INTERACTIVE STORY</p> {/* 소개 표제 */}
                <h1 id="text-play-title">Text-Play</h1> {/* 서비스 제목 */}
                <p>읽고, 선택하고, 직접 행동을 입력하는 로컬 우선 텍스트 게임입니다.</p> {/* 서비스 설명 */}
            </section> {/* 소개 영역 종료 */}
            {storageWarning === null ? null : <p className={styles.storageWarning} role="alert">{storageWarning}</p>} {/* 저장 경고 */}
            <section className={styles.card} aria-labelledby="demo-title"> {/* 작품 카드 */}
                <div className={styles.art} aria-hidden="true">月</div> {/* 작품 장식 */}
                <div className={styles.copy}> {/* 작품 정보 */}
                    <p className={styles.badge}>샘플 작품 · 판타지 미스터리</p> {/* 작품 분류 */}
                    <h2 id="demo-title">{DEMO_TEXT_PLAY_PACKAGE.title}</h2> {/* 작품 제목 */}
                    <p>{DEMO_TEXT_PLAY_PACKAGE.description}</p> {/* 작품 설명 */}
                    {resumeSlot === null ? null : <p className={styles.progress}>{resumeSlot.summary} · {formatPlayTime(resumeSlot.state.playTimeSeconds)}</p>} {/* 저장 진행 요약 */}
                    <div className={styles.actions}> {/* 작품 동작 */}
                        <button className={styles.primary} type="button" onClick={() => platform.navigate("new")}>새 게임</button> {/* 새 게임 동작 */}
                        {resumeSlot === null ? <span className={styles.disabled}>이어할 저장 없음</span> : <button className={styles.secondary} type="button" onClick={() => platform.navigate("resume")}>이어하기</button>} {/* 이어하기 동작 */}
                    </div> {/* 작품 동작 종료 */}
                </div> {/* 작품 정보 종료 */}
            </section> {/* 작품 카드 종료 */}
            <button className={styles.back} type="button" onClick={() => platform.navigate("back")}>Mate Verse 탐색으로 돌아가기</button> {/* 탐색 복귀 */}
        </main> // 홈 종료
    ); // 반환 종료
} // 함수 종료
