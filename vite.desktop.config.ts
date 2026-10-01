import { resolve } from "node:path"; // 절대 경로 결합기
import react from "@vitejs/plugin-react"; // 리액트 변환 플러그인
import { defineConfig } from "vite"; // Vite 설정 도구

export default defineConfig( // 데스크톱 Vite 설정
{ // 객체 시작
    root: resolve(process.cwd(), "desktop"), // 데스크톱 HTML 루트
    base: "./", // 상대 자산 기준
    publicDir: resolve(process.cwd(), "public"), // 공용 자산 폴더
    plugins: [react()], // 리액트 변환 활성화
    define: // ChatBot 코드가 읽는 Next 공개 환경 값(Vite에는 process가 없어 빌드 때 글자로 바꿔 넣음)
    { // 객체 시작
        "process.env.NEXT_PUBLIC_SERVICE_REGION": JSON.stringify(process.env.NEXT_PUBLIC_SERVICE_REGION ?? "kr"), // 서비스 지역(없으면 한국 서버 규칙)
    }, // 환경 값 종료
    resolve: // 경로 해석 설정
    { // 객체 시작
        alias: // 경로 별칭
        { // 객체 시작
            "@chatbot": resolve(process.cwd(), "src/chatbot"), // ChatBot 사본 별칭
            "@": resolve(process.cwd(), "src"), // 소스 루트 별칭
        }, // 객체 종료
    }, // 경로 해석 종료
    server: // 개발 서버 설정
    { // 객체 시작
        host: "127.0.0.1", // 로컬 접속 주소
        port: 1420, // 고정 개발 포트
        strictPort: true, // 포트 변경 차단
    }, // 개발 서버 종료
    build: // 빌드 설정
    { // 객체 시작
        outDir: resolve(process.cwd(), "desktop-dist"), // 데스크톱 출력 폴더
        emptyOutDir: true, // 이전 출력 제거
    }, // 빌드 설정 종료
}); // 설정 내보내기 종료
