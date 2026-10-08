"use client"; // 클라이언트 컴포넌트

import styles from "@chatbot/components/search/ListSearch.module.css"; // 검색창 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

interface ListSearchProps // 검색창 속성
{ // 구조 시작
    label: string; // 검색창 이름(읽어 주는 도구용)
    placeholder: string; // 안내 글
    value: string; // 검색어
    count: number; // 찾은 수
    onChange(value: string): void; // 검색어 변경
} // 구조 종료

export function ListSearch({ label, placeholder, value, count, onChange }: ListSearchProps) // 목록 검색창(보관함·스토리 목록·내 이미지 공통)
{ // 함수 시작
    return ( // 검색창 반환
        <div className={styles.search} role="search"> {/* 검색 영역 */}
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg> {/* 검색 아이콘 */}
            <input type="search" aria-label={label} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /> {/* 검색 입력 */}
            {value.trim().length === 0 ? null : <span className={styles.count} role="status" aria-label={t("찾은 수")}>{t("{0}개 찾음", [count])}</span>} {/* 찾은 수 */}
        </div> // 검색 영역 종료
    ); // 반환 종료
} // 함수 종료
