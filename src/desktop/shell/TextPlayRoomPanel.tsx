"use client"; // 클라이언트 컴포넌트

import { useEffect, useState, type ReactElement } from "react"; // 리액트 도구
import Link from "@/desktop/next-compat/link"; // 데스크톱 링크
import styles from "@/desktop/shell/DesktopShell.module.css"; // 데스크톱 틀 스타일
import type { TextPlaySaveSlot, TextPlaySlotId } from "@/features/text-play/core/types"; // 저장 슬롯 계약
import { DEMO_TEXT_PLAY_PACKAGE } from "@/features/text-play/data/demo-package"; // 샘플 작품
import type { TextPlaySaveRepository } from "@/features/text-play/storage/save-repository"; // 저장소 계약
import { formatTextPlaySaveSummary, getTextPlaySlotLabel, getTextPlayWorkTitle } from "@/features/text-play/ui/text-play-save-summary"; // 저장 요약 도구

interface TextPlayRoomPanelProps // Text-Play 대화방 속성
{ // 구조 시작
    repository: TextPlaySaveRepository; // Text-Play 저장소
    refreshKey: string; // 화면 이동마다 다시 읽기 위한 값
} // 구조 종료

type RoomState = { status: "loading" } | { status: "ready"; slots: TextPlaySaveSlot[] } | { status: "error" }; // 기록 조회 상태

function createResumeHref(slotId: TextPlaySlotId): string // 이어하기 주소 생성
{ // 함수 시작
    return slotId === "auto" ? "/text-play/play?mode=resume" : `/text-play/play?mode=resume&slot=${slotId}`; // 슬롯별 이어하기 주소
} // 함수 종료

export function TextPlayRoomPanel({ repository, refreshKey }: TextPlayRoomPanelProps): ReactElement // Text-Play 대화방
{ // 함수 시작
    const [rooms, setRooms] = useState<RoomState>({ status: "loading" }); // 기록 조회 상태
    useEffect(() => // 저장 기록 동기화
    { // 효과 시작
        let cancelled = false; // 취소 상태
        void repository.list(DEMO_TEXT_PLAY_PACKAGE.id).then((slots) => // 저장 슬롯 조회
        { // 처리 시작
            if (!cancelled) // 취소 확인
            { // 조건 시작
                setRooms({ status: "ready", slots: [...slots].sort((left, right) => right.savedAt.localeCompare(left.savedAt)) }); // 최신 순 반영
            } // 조건 종료
        }).catch(() => // 조회 실패 처리
        { // 오류 시작
            if (!cancelled) // 취소 확인
            { // 조건 시작
                setRooms({ status: "error" }); // 실패 반영
            } // 조건 종료
        }); // 조회 종료
        return () => // 효과 정리
        { // 정리 시작
            cancelled = true; // 늦은 결과 무시
        }; // 정리 종료
    }, [refreshKey, repository]); // 화면 이동과 저장소 의존
    return ( // 대화방 반환
        <section className={styles.playRooms} aria-labelledby="text-play-rooms-title"> {/* Text-Play 대화방 */}
            <div className={styles.playRoomsHeading}> {/* 제목 영역 */}
                <h2 id="text-play-rooms-title">Text-Play 대화방</h2> {/* 영역 제목 */}
                <span aria-hidden="true">MY PLAYS</span> {/* 영역 표제 */}
            </div> {/* 제목 영역 종료 */}
            <Link href="/text-play" className={styles.playRoomsCreate}>＋ Text-Play 작품 고르기</Link> {/* 작품 고르기 */}
            {rooms.status === "error" ? <p className={styles.playRoomsEmpty} role="status">Text-Play 기록을 불러오지 못했습니다.</p> : null} {/* 조회 실패 안내 */}
            {rooms.status === "ready" && rooms.slots.length === 0 ? <p className={styles.playRoomsEmpty}>아직 Text-Play 기록이 없습니다.</p> : null} {/* 빈 기록 안내 */}
            {rooms.status === "ready" && rooms.slots.length > 0 ? ( // 기록 목록 판정
                <ul className={styles.playRoomList} aria-label="Text-Play 진행 기록"> {/* 기록 목록 */}
                    {rooms.slots.map((slot) => // 기록 순회
                    { // 순회 시작
                        const title = getTextPlayWorkTitle(slot.packageId); // 작품 제목
                        const label = getTextPlaySlotLabel(slot.slotId); // 슬롯 이름
                        return ( // 기록 항목 반환
                            <li key={slot.key}> {/* 기록 항목 */}
                                <Link href={createResumeHref(slot.slotId)} className={styles.playRoomLink} data-slot={slot.slotId} aria-label={`${title} ${label} 이어하기`}> {/* 이어하기 링크 */}
                                    <strong>{title}</strong> {/* 작품 제목 */}
                                    <span>{`${label} · ${formatTextPlaySaveSummary(slot)}`}</span> {/* 슬롯·장면·시간 요약 */}
                                </Link> {/* 링크 종료 */}
                            </li> // 항목 종료
                        ); // 반환 종료
                    })} {/* 순회 종료 */}
                </ul> // 목록 종료
            ) : null} {/* 목록 판정 종료 */}
        </section> // 대화방 종료
    ); // 반환 종료
} // 함수 종료
