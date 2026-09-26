"use client"; // 클라이언트 컴포넌트

import { useAppStore } from "@/features/core/AppProvider"; // 앱 저장소
import type { LayoutId } from "@/features/core/types"; // 레이아웃 타입
import { recommendLayout } from "@/features/chat/layout-resolver"; // 레이아웃 추천

const layoutIds: LayoutId[] = ["M1", "M2", "M3", "T1", "T2", "T3", "D1", "D2", "D3"]; // 레이아웃 목록

export function LayoutSelector({ width, height }: { width: number; height: number }) // 레이아웃 선택기
{ // 함수 시작
    const { state, dispatch } = useAppStore(); // 앱 상태
    const recommended = recommendLayout({ width, height, platformMode: state.settings.platformMode, layoutId: null }); // 자동 추천
    const value = state.settings.layoutId ?? "auto"; // 선택 값
    const update = (nextValue: string) => // 선택 변경
    { // 함수 시작
        dispatch({ type: "update-settings", settings: { layoutId: nextValue === "auto" ? null : nextValue as LayoutId } }); // 설정 반영
    }; // 함수 종료
    return ( // 선택기 반환
        <label> {/* 선택기 레이블 */}
            <span>화면 배치</span> {/* 레이블 문구 */}
            <select aria-label="채팅 레이아웃" value={value} onChange={(event) => update(event.target.value)}> {/* 선택 상자 */}
                <option value="auto">자동 · {recommended}</option> {/* 자동 옵션 */}
                {layoutIds.map((layoutId) => <option key={layoutId} value={layoutId}>{layoutId}</option>)} {/* 수동 옵션 */}
            </select> {/* 선택 종료 */}
        </label> // 레이블 종료
    ); // 반환 종료
} // 함수 종료
