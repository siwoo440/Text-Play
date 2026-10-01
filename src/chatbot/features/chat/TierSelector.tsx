"use client"; // 클라이언트 컴포넌트

import { useEffect, useRef, useState, type KeyboardEvent } from "react"; // 리액트 도구
import { chatTiers, getChatTier, getTierCost } from "@chatbot/features/chat/chat-tiers"; // 모델 등급
import { TierDialog } from "@chatbot/features/chat/ChatSettingsDialogs"; // 길이·생각 대화상자
import type { ChatTierId, ConversationSettings, TierOption } from "@chatbot/features/core/types"; // 도메인 타입
import styles from "@chatbot/features/chat/ChatPanels.module.css"; // 채팅 보조 영역 스타일

export function TierSelector({ settings, onSelect, onSaveOptions }: { settings: ConversationSettings; onSelect(tier: ChatTierId): void; onSaveOptions(options: Record<ChatTierId, TierOption>): void }) // 채팅 머리말의 모델 등급 선택
{ // 함수 시작
    const [open, setOpen] = useState(false); // 목록 열림
    const [dialogOpen, setDialogOpen] = useState(false); // 길이·생각 대화상자
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
    const current = getChatTier(settings.tier); // 현재 등급
    return ( // 선택기 반환
        <div ref={rootRef} className={styles.tierSelector} onKeyDown={handleKey}> {/* 선택기 */}
            <button type="button" className={styles.tierButton} aria-haspopup="menu" aria-expanded={open} aria-label={`채팅 모델 ${current.label}, 메시지당 ${getTierCost(settings.tier, settings.tierOptions[settings.tier])} 토큰`} onClick={() => setOpen(!open)}><span className={styles.tierDot} data-tier={current.id} aria-hidden="true" />{current.label}<span aria-hidden="true">⌄</span></button> {/* 현재 등급 */}
            {!open ? null : ( // 목록 판정
                <div className={styles.tierMenu} role="menu" aria-label="채팅 모델 선택"> {/* 등급 목록 */}
                    {chatTiers.map((tier) => <button key={tier.id} type="button" role="menuitemradio" aria-checked={tier.id === settings.tier} onClick={() => { onSelect(tier.id); setOpen(false); }}><span className={styles.tierDot} data-tier={tier.id} aria-hidden="true" /><span><strong>{tier.label}</strong><small>{tier.description}</small></span><em>{getTierCost(tier.id, settings.tierOptions[tier.id])} 토큰</em></button>)} {/* 등급 */}
                    <button type="button" role="menuitem" className={styles.tierMenuLink} onClick={() => { setOpen(false); setDialogOpen(true); }}>답변 길이 및 생각 조절</button> {/* 상세 설정 */}
                </div> // 목록 종료
            )} {/* 목록 판정 종료 */}
            {dialogOpen ? <TierDialog tierOptions={settings.tierOptions} onSave={onSaveOptions} onClose={() => setDialogOpen(false)} /> : null} {/* 길이·생각 */}
        </div> // 선택기 종료
    ); // 반환 종료
} // 함수 종료
