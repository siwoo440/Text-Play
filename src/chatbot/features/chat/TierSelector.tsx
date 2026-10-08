"use client"; // 클라이언트 컴포넌트

import { useEffect, useRef, useState, type KeyboardEvent } from "react"; // 리액트 도구
import { chatTiers, getChatTier, getTierCost, getTierOption, type ChatTier } from "@chatbot/features/chat/chat-tiers"; // 모델 등급
import { useModelStatus } from "@chatbot/features/chat/use-model-status"; // 실제 AI 사용 가능 여부
import { TierDialog } from "@chatbot/features/chat/ChatSettingsDialogs"; // 길이·생각 대화상자
import type { ChatTierId, ConversationSettings, TierOption } from "@chatbot/features/core/types"; // 도메인 타입
import styles from "@chatbot/features/chat/ChatPanels.module.css"; // 채팅 보조 영역 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

const TIER_MENU_WIDTH = 340; // 등급 목록 너비(스타일의 .tierMenu와 같은 값)

export function TierSelector({ settings, mature = false, onSelect, onSaveOptions }: { settings: ConversationSettings; mature?: boolean; onSelect(tier: ChatTierId): void; onSaveOptions(options: Record<ChatTierId, TierOption>): void }) // 채팅 머리말의 모델 등급 선택
{ // 함수 시작
    const modelStatus = useModelStatus(); // 등급별 실제 AI 사용 가능 여부
    const [open, setOpen] = useState(false); // 목록 열림
    const [dialogOpen, setDialogOpen] = useState(false); // 길이·생각 대화상자
    const [alignLeft, setAlignLeft] = useState(false); // 목록을 버튼 왼쪽에 맞출지(버튼이 화면 왼쪽에 있으면 오른쪽 맞춤은 화면 밖으로 나감)
    const rootRef = useRef<HTMLDivElement>(null); // 바깥 클릭 판정
    useEffect(() => // 바깥 클릭 닫기
    { // 효과 시작
        if (!open) // 닫힘
        { // 조건 시작
            return; // 생략
        } // 조건 종료
        const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) { setOpen(false); } }; // 바깥 판정
        document.addEventListener("pointerdown", close); // 구독
        return () => document.removeEventListener("pointerdown", close); // 해제
    }, [open]); // 열림 의존
    const handleKey = (event: KeyboardEvent<HTMLDivElement>) => // 키 처리
    { // 함수 시작
        if (event.key === "Escape" && open) // 닫기
        { // 조건 시작
            event.preventDefault(); // 패널 닫기 방지 표시
            setOpen(false); // 닫기
        } // 조건 종료
    }; // 함수 종료
    const toggle = () => // 목록 열고 닫기
    { // 함수 시작
        const right = rootRef.current?.getBoundingClientRect().right ?? TIER_MENU_WIDTH; // 버튼의 오른쪽 끝
        setAlignLeft(right < TIER_MENU_WIDTH + 8); // 오른쪽 맞춤으로는 목록이 화면 왼쪽 밖으로 나가는 경우
        setOpen(!open); // 열림 전환
    }; // 함수 종료
    const current = getChatTier(settings.tier); // 현재 등급
    const tiers = mature ? [...chatTiers].sort((left, right) => Number(right.mature) - Number(left.mature)) : chatTiers; // 19세 작품에서는 답할 수 있는 등급을 맨 위에
    const isLive = (tier: ChatTier): boolean => modelStatus?.tiers[tier.id] === true && (!mature || tier.mature); // 실제 AI로 답하는 등급인지(19세 작품은 공개 모델 등급만)
    return ( // 선택기 반환
        <div ref={rootRef} className={styles.tierSelector} onKeyDown={handleKey}> {/* 선택기 */}
            <button type="button" className={styles.tierButton} aria-haspopup="menu" aria-expanded={open} aria-label={t("채팅 모델 {0}, 메시지당 {1} 토큰", [current.label, getTierCost(settings.tier, getTierOption(settings.tierOptions, settings.tier))])} onClick={toggle}><span className={styles.tierDot} data-tier={current.id} aria-hidden="true" />{t(current.label)}<span aria-hidden="true">⌄</span></button> {/* 현재 등급 */}
            {!open ? null : ( // 목록 판정
                <div className={styles.tierMenu} data-align={alignLeft ? "left" : undefined} role="menu" aria-label={t("채팅 모델 선택")}> {/* 등급 목록 */}
                    {tiers.map((tier) => <button key={tier.id} type="button" role="menuitemradio" aria-checked={tier.id === settings.tier} onClick={() => { onSelect(tier.id); setOpen(false); }}><span className={styles.tierDot} data-tier={tier.id} aria-hidden="true" /><span><strong>{t(tier.label)}</strong><small>{modelStatus?.models[tier.id] ?? t(tier.model)} · {t(tier.description)}</small><small className={styles.tierLive} data-live={isLive(tier) ? "true" : undefined}>{isLive(tier) ? t("실제 AI") : t("연습용 AI")}</small></span><em>{getTierCost(tier.id, getTierOption(settings.tierOptions, tier.id))} {t("토큰")}</em></button>)} {/* 등급 */}
                    <button type="button" role="menuitem" className={styles.tierMenuLink} onClick={() => { setOpen(false); setDialogOpen(true); }}>{t("답변 길이 및 생각 조절")}</button> {/* 상세 설정 */}
                </div> // 목록 종료
            )} {/* 목록 판정 종료 */}
            {dialogOpen ? <TierDialog tierOptions={settings.tierOptions} onSave={onSaveOptions} onClose={() => setDialogOpen(false)} /> : null} {/* 길이·생각 */}
        </div> // 선택기 종료
    ); // 반환 종료
} // 함수 종료
