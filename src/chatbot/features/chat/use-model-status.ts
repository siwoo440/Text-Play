"use client"; // 클라이언트 훅

import { useEffect, useState } from "react"; // 리액트 도구
import { loadModelStatus, type ModelStatus } from "@chatbot/lib/adapters/model-status"; // 실제 AI 상태

export function useModelStatus(): ModelStatus | null // 등급별 실제 AI 사용 가능 여부(읽기 전에는 없음)
{ // 함수 시작
    const [status, setStatus] = useState<ModelStatus | null>(null); // 상태
    useEffect(() => // 상태 읽기 효과
    { // 효과 시작
        let active = true; // 화면이 살아 있는지
        void loadModelStatus().then((value) => // 서버 통로에 묻기
        { // 처리 시작
            if (active) // 화면이 살아 있을 때만
            { // 조건 시작
                setStatus(value); // 상태 반영
            } // 조건 종료
        }); // 처리 종료
        return () => { active = false; }; // 화면을 떠나면 반영하지 않음
    }, []); // 처음 한 번
    return status; // 상태 반환
} // 함수 종료
