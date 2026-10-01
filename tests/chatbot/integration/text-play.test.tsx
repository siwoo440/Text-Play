import { screen } from "@testing-library/react"; // 화면 도구
import { describe, expect, it } from "vitest"; // 테스트 도구
import TextPlayPage from "@chatbot/app/text-play/page"; // Text-Play 통합 화면
import { DownloadAction } from "@chatbot/features/text-play/DownloadAction"; // 다운로드 동작
import { textPlayRelease } from "@chatbot/features/text-play/release-config"; // 배포 설정
import { renderWithApp } from "@chatbot/test/render-with-app"; // 앱 렌더

describe("Text-Play 다운로드 화면", () => // 다운로드 화면 묶음
{ // 묶음 시작
    it("확인되지 않은 배포 정보를 준비 중 상태로 표시한다", () => // 준비 상태 검증
    { // 검증 시작
        renderWithApp(<TextPlayPage />); // 통합 화면 렌더
        expect(screen.getByRole("heading", { level: 1, name: /이야기를 읽는 순간에서/ })).toBeInTheDocument(); // 화면 제목 확인
        expect(screen.getByRole("button", { name: "다운로드 준비 중" })).toBeDisabled(); // 비활성 버튼 확인
        expect(screen.getByText("Windows용 프로그램")).toBeInTheDocument(); // 플랫폼 확인
        expect(screen.getAllByText("다운로드 준비 중").length).toBeGreaterThan(1); // 배포 상태 배지 확인
    }); // 검증 종료

    it("소개 구역을 순서대로 보여 주고 다운로드 버튼은 하나만 표시한다", () => // 화면 구성 검증
    { // 검증 시작
        renderWithApp(<TextPlayPage />); // 통합 화면 렌더
        expect(screen.getAllByRole("button", { name: "다운로드 준비 중" })).toHaveLength(1); // 단일 버튼 확인
        const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent); // 구역 제목 조회
        expect(headings).toEqual(["한 장면은 이렇게 진행됩니다", "주요 기능", "Character Chat과 무엇이 다른가요?", "설치 순서", "자주 묻는 질문", "이야기의 다음 장은 직접 쓰세요"]); // 구역 순서 확인
        expect(screen.getByRole("figure", { name: /출시 전 화면 구성 예시/ })).toBeInTheDocument(); // 화면 예시 설명 확인
    }); // 검증 종료

    it("삭제한 바로가기와 다운로드 정보 구역을 표시하지 않는다", () => // 삭제 구역 검증
    { // 검증 시작
        renderWithApp(<TextPlayPage />); // 통합 화면 렌더
        expect(screen.queryByRole("link", { name: "다운로드 정보 보기" })).not.toBeInTheDocument(); // 정보 바로가기 제거 확인
        expect(screen.queryByRole("link", { name: "Character Chat 열기" })).not.toBeInTheDocument(); // 챗봇 바로가기 제거 확인
        expect(screen.queryByRole("heading", { name: "다운로드 정보" })).not.toBeInTheDocument(); // 정보 구역 제거 확인
        expect(document.getElementById("download-info")).toBeNull(); // 정보 앵커 제거 확인
    }); // 검증 종료

    it("하단 경로를 실제 화면으로 연결한다", () => // 경로 연결 검증
    { // 검증 시작
        renderWithApp(<TextPlayPage />); // 통합 화면 렌더
        expect(screen.getByRole("link", { name: "Character Chat" })).toHaveAttribute("href", "/"); // 챗봇 경로 확인
        expect(screen.queryByRole("link", { name: "Text-Play 홈" })).not.toBeInTheDocument(); // 자기 링크 제거 확인
        expect(screen.getByText("개인정보처리방침 · 준비 중")).toHaveAttribute("aria-disabled", "true"); // 개인정보 준비 상태 확인
        expect(screen.getByText("이용약관 · 준비 중")).toHaveAttribute("aria-disabled", "true"); // 약관 준비 상태 확인
        expect(screen.getByText("고객지원 · 준비 중")).toHaveAttribute("aria-disabled", "true"); // 지원 준비 상태 확인
    }); // 검증 종료

    it("실제 주소가 있으면 다운로드 버튼을 활성화한다", () => // 활성 버튼 검증
    { // 검증 시작
        const release = // 배포 주소 설정
        { // 설정 시작
            ...textPlayRelease, // 기본 배포 정보
            downloadUrl: "/downloads/mate-text-play.exe", // 다운로드 주소
            fileName: "mate-text-play.exe", // 다운로드 파일명
        }; // 설정 종료
        renderWithApp(<DownloadAction release={release} />); // 다운로드 동작 렌더
        expect(screen.getByRole("link", { name: "Windows용 다운로드" })).toHaveAttribute("href", "/downloads/mate-text-play.exe"); // 활성 링크 확인
    }); // 검증 종료

    it("외부 HTTPS 주소를 브라우저 다운로드 링크로 제공한다", () => // 외부 주소 검증
    { // 검증 시작
        const release = // 외부 배포 주소 설정
        { // 설정 시작
            ...textPlayRelease, // 기본 배포 정보
            downloadUrl: "https://downloads.example.com/mate-text-play.exe", // 외부 다운로드 주소
            fileName: "mate-text-play.exe", // 다운로드 파일명
        }; // 설정 종료
        renderWithApp(<DownloadAction release={release} />); // 다운로드 동작 렌더
        expect(screen.getByRole("link", { name: "Windows용 다운로드" })).toHaveAttribute("href", "https://downloads.example.com/mate-text-play.exe"); // 외부 링크 확인
    }); // 검증 종료

    it("활성 다운로드에 실패 대응 안내를 함께 표시한다", () => // 실패 안내 검증
    { // 검증 시작
        const release = // 배포 주소 설정
        { // 설정 시작
            ...textPlayRelease, // 기본 배포 정보
            downloadUrl: "/downloads/mate-text-play.exe", // 다운로드 주소
            fileName: "mate-text-play.exe", // 다운로드 파일명
        }; // 설정 종료
        renderWithApp(<DownloadAction release={release} />); // 다운로드 동작 렌더
        expect(screen.getByText(/다운로드가 시작되지 않으면/)).toBeInTheDocument(); // 실패 대응 안내 확인
    }); // 검증 종료
}); // 묶음 종료
