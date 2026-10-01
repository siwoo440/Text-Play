export type ServiceRegion = "kr" | "global"; // 서비스 지역(나라별 서버)
export type ExposurePolicy = "covered" | "uncovered"; // 19세 이미지 중요 부위 처리

export interface RegionPolicy // 지역별 정책
{ // 구조 시작
    label: string; // 지역 이름
    exposure: ExposurePolicy; // 19세 이미지 가림 처리
    notice: string; // 화면 안내
} // 구조 종료

const policies: Record<ServiceRegion, RegionPolicy> = // 지역별 정책 표
{ // 표 시작
    kr: { label: "한국 서버", exposure: "covered", notice: "한국 서버는 국내 법에 따라 19세 이미지의 중요 부위를 가림 처리합니다." }, // 한국
    global: { label: "해외 서버", exposure: "uncovered", notice: "이 서버는 성인 인증 사용자에게 19세 이미지를 가림 없이 제공합니다." }, // 해외
}; // 표 종료

export function resolveServiceRegion(value: string | undefined): ServiceRegion // 설정값을 지역으로
{ // 함수 시작
    return value === "global" ? "global" : "kr"; // 모르는 값은 한국
} // 함수 종료

export function getServiceRegion(): ServiceRegion // 현재 배포 지역
{ // 함수 시작
    return resolveServiceRegion(process.env.NEXT_PUBLIC_SERVICE_REGION); // 배포 설정 읽기
} // 함수 종료

export function getRegionPolicy(region: ServiceRegion = getServiceRegion()): RegionPolicy // 지역 정책 조회
{ // 함수 시작
    return policies[region]; // 정책 반환
} // 함수 종료
