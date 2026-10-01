/* eslint-disable @next/next/no-img-element -- 데스크톱 실행 파일은 Next 이미지 최적화 서버가 없어 기본 이미지 요소를 사용 */
import type { CSSProperties, ImgHTMLAttributes, ReactElement } from "react"; // 리액트 타입

interface StaticImage // 정적 가져오기 이미지
{ // 구조 시작
    src: string; // 이미지 주소
} // 구조 종료

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height" | "loading" | "placeholder"> // 이미지 속성
{ // 구조 시작
    src: string | StaticImage; // 이미지 주소
    alt: string; // 대체 문구
    width?: number | `${number}`; // 너비
    height?: number | `${number}`; // 높이
    fill?: boolean; // 부모 채움 여부
    priority?: boolean; // 우선 불러오기 여부
    loading?: "eager" | "lazy"; // 불러오기 방식
    unoptimized?: boolean; // 최적화 생략(Next 호환용)
    quality?: number; // 품질(Next 호환용)
    placeholder?: string; // 자리 표시(Next 호환용)
    blurDataURL?: string; // 흐림 이미지(Next 호환용)
} // 구조 종료

export default function Image({ src, alt, width, height, fill = false, priority = false, loading, unoptimized, quality, placeholder, blurDataURL, style, ...rest }: ImageProps): ReactElement // 데스크톱 이미지
{ // 함수 시작
    void unoptimized; // 호환 속성 표시
    void quality; // 호환 속성 표시
    void placeholder; // 호환 속성 표시
    void blurDataURL; // 호환 속성 표시
    const source = typeof src === "string" ? src : src.src; // 이미지 주소 결정
    const imageStyle: CSSProperties | undefined = fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : style; // 채움 배치 계산
    return <img src={source} alt={alt} width={fill ? undefined : width} height={fill ? undefined : height} loading={loading ?? (priority ? "eager" : "lazy")} decoding="async" style={imageStyle} {...rest} />; // 이미지 반환
} // 함수 종료
