"use client"; // 클라이언트 컴포넌트(화면 언어에 맞춰 글자를 바꾸려면 브라우저에서 그려야 함)

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import { StatusScreen } from "@chatbot/components/feedback/StatusScreen"; // 공통 상태 화면
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export function NotFoundScreen() // 찾을 수 없음 안내
{ // 함수 시작
    return ( // 화면 반환
        <StatusScreen tone="not-found" label="404 · NOT FOUND" title={t("페이지를 찾을 수 없습니다")} description={t("주소가 바뀌었거나 존재하지 않는 페이지입니다. 메인·탐색 화면이나 보관함에서 다시 찾아 주세요.")}> {/* 안내 화면 */}
            <Link href="/">{t("메인으로 이동")}</Link> {/* 메인 링크 */}
            <Link href={"/library" as Route}>{t("보관함 열기")}</Link> {/* 보관함 링크 */}
        </StatusScreen> // 안내 화면 종료
    ); // 반환 종료
} // 함수 종료
