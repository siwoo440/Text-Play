"use client"; // 클라이언트 컴포넌트

import Image from "@/desktop/next-compat/image"; // 최적화 이미지
import { useState, type CSSProperties } from "react"; // 리액트 상태 도구
import styles from "@chatbot/features/character/CharacterDetail.module.css"; // 상세 화면 스타일
import type { CharacterPrologue } from "@chatbot/features/core/types"; // 프롤로그 타입
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

interface ProloguePreviewProps // 프롤로그 속성
{ // 구조 시작
    prologue: CharacterPrologue; // 선택 프롤로그
    presetName: string; // 선택 프리셋 이름
    fallbackImage: string; // 대표 대체 이미지
    characterName: string; // 캐릭터 이름
} // 구조 종료

export function ProloguePreview({ prologue, presetName, fallbackImage, characterName }: ProloguePreviewProps) // 프롤로그 미리보기
{ // 함수 시작
    const [imageFailed, setImageFailed] = useState(false); // 이미지 오류 상태
    const fallbackStyle = { "--prologue-fallback-image": `url("${fallbackImage}")` } as CSSProperties; // 대표 이미지 배경
    return ( // 미리보기 반환
        <section className={styles.prologueSection} aria-labelledby="prologue-title"> {/* 프롤로그 영역 */}
            <div className={styles.prologueMedia}> {/* 프롤로그 이미지 영역 */}
                {imageFailed ? ( // 이미지 오류 조건
                    <div className={styles.prologueFallback} role="img" aria-label={t("{0} 대표 이미지 기반 프롤로그 대체 화면", [characterName])} style={fallbackStyle}> {/* 이미지 대체 화면 */}
                        <span aria-hidden="true">✦</span> {/* 장식 기호 */}
                        <strong>{t("장면을 준비하고 있어요")}</strong> {/* 오류 제목 */}
                        <small>{t("이야기는 그대로 시작할 수 있습니다.")}</small> {/* 오류 안내 */}
                    </div> // 대체 화면 종료
                ) : <Image src={prologue.image} alt={prologue.imageAlt} fill sizes="(max-width: 760px) 100vw, 46vw" onError={() => setImageFailed(true)} />} {/* 프롤로그 이미지 */}
                <div className={styles.prologueShade} aria-hidden="true" /> {/* 이미지 음영 */}
                <span className={styles.prologueBadge}>PROLOGUE</span> {/* 프롤로그 배지 */}
            </div> {/* 이미지 영역 종료 */}
            <div className={styles.prologueContent}> {/* 프롤로그 내용 */}
                <span className={styles.eyebrow}>OPENING SCENE</span> {/* 영문 표제 */}
                <span className={styles.prologuePreset}>{t("시작 설정 ·")} {presetName}</span> {/* 프리셋 이름 */}
                <h2 id="prologue-title">{t(prologue.title)}</h2> {/* 프롤로그 제목 */}
                <p>{t(prologue.description)}</p> {/* 장면 설명 */}
                <blockquote> {/* 첫 대사 인용 */}
                    <span aria-hidden="true">“</span> {/* 인용 장식 */}
                    <p>{prologue.greeting}</p> {/* 첫 대사 */}
                </blockquote> {/* 인용 종료 */}
            </div> {/* 내용 종료 */}
        </section> // 프롤로그 영역 종료
    ); // 반환 종료
} // 함수 종료
