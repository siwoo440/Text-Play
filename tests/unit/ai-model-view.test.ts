import { describe, expect, it } from "vitest"; // 테스트 도구
import { describeHardware, describeRuntime, FITNESS_LABELS, formatGigabytes, formatProgress, ROLE_LABELS, toModelErrorMessage } from "@/desktop/ai-models/ai-model-view"; // AI 모델 화면 표시 도구

const GIB = 1_073_741_824; // 1GiB

describe("AI 모델 화면 표시", () => // 표시 묶음
{ // 묶음 시작
    it("크기를 GB 한 자리로, 예상 크기는 약으로 보여 준다", () => // 크기 표시 검증
    { // 테스트 시작
        expect(formatGigabytes(1_600_000_000, true)).toBe("약 1.5GB"); // 예상 크기
        expect(formatGigabytes(16 * GIB, false)).toBe("16.0GB"); // 정확한 크기
    }); // 테스트 종료

    it("적합도와 역할을 한국어로 보여 준다", () => // 이름 검증
    { // 테스트 시작
        expect(FITNESS_LABELS).toEqual({ recommended: "권장", possible: "가능", slow: "느릴 수 있음", insufficient: "부족" }); // 적합도 이름
        expect(ROLE_LABELS).toEqual({ light: "가벼움", standard: "표준", high: "고성능" }); // 역할 이름
    }); // 테스트 종료

    it("PC 사양을 한 줄로 요약한다", () => // 사양 요약 검증
    { // 테스트 시작
        expect(describeHardware({ gpuName: "NVIDIA GeForce RTX 5070 Ti", vramBytes: 16 * GIB, ramBytes: 32 * GIB }, 100 * GIB)).toBe("NVIDIA GeForce RTX 5070 Ti · 그래픽 메모리 16.0GB · RAM 32.0GB · 남은 공간 100.0GB"); // 그래픽 있음
        expect(describeHardware({ gpuName: null, vramBytes: 0, ramBytes: 8 * GIB }, null)).toBe("그래픽 장치 없음(CPU로 실행) · RAM 8.0GB · 남은 공간 확인 불가"); // 그래픽 없음
    }); // 테스트 종료

    it("실행 엔진 상태를 쉬운 말로 보여 준다", () => // 엔진 상태 검증
    { // 테스트 시작
        expect(describeRuntime({ state: "stopped", backend: null, message: null })).toBe("꺼짐 · 내장 AI로 행동을 보내면 켜집니다"); // 꺼짐
        expect(describeRuntime({ state: "starting", backend: null, message: null })).toBe("켜는 중"); // 켜는 중
        expect(describeRuntime({ state: "ready", backend: "vulkan", message: null })).toBe("켜짐 · 그래픽(Vulkan)으로 실행 중"); // 그래픽 실행
        expect(describeRuntime({ state: "ready", backend: "cpu", message: null })).toBe("켜짐 · CPU로 실행 중"); // CPU 실행
        expect(describeRuntime({ state: "failed", backend: null, message: "준비 시간이 지났습니다." })).toBe("켜지 못함 · 준비 시간이 지났습니다."); // 실패
    }); // 테스트 종료

    it("진행률을 백분율·받은 크기·속도·남은 시간으로 보여 준다", () => // 진행률 검증
    { // 테스트 시작
        expect(formatProgress(GIB / 2, GIB, 10 * 1_048_576)).toEqual({ percent: 50, text: "0.5GB / 1.0GB · 10.0MB/초 · 약 1분 남음" }); // 진행 중
        expect(formatProgress(0, GIB, 0)).toEqual({ percent: 0, text: "0.0GB / 1.0GB · 속도 계산 중" }); // 시작
    }); // 테스트 종료

    it("Rust 오류 표시를 떼고 사용자 안내만 남긴다", () => // 오류 안내 검증
    { // 테스트 시작
        expect(toModelErrorMessage(new Error("DOWNLOAD_CANCELLED: 다운로드를 취소했습니다."))).toBe("다운로드를 취소했습니다. 다시 누르면 이어서 받습니다."); // 취소
        expect(toModelErrorMessage("디스크 공간이 부족합니다.")).toBe("디스크 공간이 부족합니다."); // 문자열 오류
    }); // 테스트 종료
}); // 묶음 종료
