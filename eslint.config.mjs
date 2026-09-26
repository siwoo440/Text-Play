import { defineConfig, globalIgnores } from "eslint/config"; // 설정 도구
import nextVitals from "eslint-config-next/core-web-vitals"; // 웹 권장 규칙
import nextTypeScript from "eslint-config-next/typescript"; // 타입 규칙

export default defineConfig( // 설정 내보내기
[ // 설정 목록 시작
    ...nextVitals, // 웹 규칙 적용
    ...nextTypeScript, // 타입 규칙 적용
    globalIgnores( // 제외 설정
    [ // 제외 목록 시작
        ".next/**", // 빌드 결과 제외
        "coverage/**", // 검사 결과 제외
        "playwright-report/**", // 종단 보고서 제외
        "test-results/**", // 종단 결과 제외
    ]), // 제외 목록 종료
]); // 설정 목록 종료
