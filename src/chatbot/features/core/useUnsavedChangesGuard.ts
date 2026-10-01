"use client"; // 클라이언트 훅

import { useEffect } from "react"; // 리액트 효과

export function useUnsavedChangesGuard(dirty: boolean) // 저장하지 않은 변경 이탈 경고
{ // 함수 시작
    useEffect(() => // 이탈 경고 효과
    { // 효과 시작
        const warn = (event: BeforeUnloadEvent) => // 이탈 처리
        { // 처리 시작
            if (dirty) // 변경 판정
            { // 조건 시작
                event.preventDefault(); // 이탈 경고
            } // 조건 종료
        }; // 처리 종료
        const confirmNavigation = (event: MouseEvent) => // 내부 이동 처리
        { // 처리 시작
            if (!dirty || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) // 경고 제외 판정
            { // 조건 시작
                return; // 처리 종료
            } // 조건 종료
            const target = event.target; // 클릭 대상
            if (!(target instanceof Element)) // 요소 여부 판정
            { // 조건 시작
                return; // 처리 종료
            } // 조건 종료
            const anchor = target.closest("a[href]"); // 링크 탐색
            if (!(anchor instanceof HTMLAnchorElement)) // 링크 여부 판정
            { // 조건 시작
                return; // 처리 종료
            } // 조건 종료
            const destination = new URL(anchor.href, window.location.href); // 이동 주소 생성
            if (destination.origin !== window.location.origin) // 외부 주소 판정
            { // 조건 시작
                return; // 처리 종료
            } // 조건 종료
            const accepted = window.confirm("저장하지 않은 변경 사항이 있습니다. 페이지를 이동하시겠습니까?"); // 이동 확인
            if (!accepted) // 이동 취소 판정
            { // 조건 시작
                event.preventDefault(); // 기본 이동 취소
                event.stopPropagation(); // 링크 전파 중단
            } // 조건 종료
        }; // 처리 종료
        window.addEventListener("beforeunload", warn); // 경고 구독
        document.addEventListener("click", confirmNavigation, true); // 내부 이동 구독
        return () => // 경고 정리
        { // 정리 시작
            window.removeEventListener("beforeunload", warn); // 새로고침 경고 해제
            document.removeEventListener("click", confirmNavigation, true); // 내부 이동 해제
        }; // 정리 종료
    }, [dirty]); // 변경 상태 의존
} // 함수 종료
