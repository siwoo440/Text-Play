import Image from "next/image"; // 최적화 이미지

export function SceneViewer({ src, name }: { src: string; name: string }) // 장면 보기
{ // 함수 시작
    return <figure><Image src={src} alt={`${name}의 현재 장면`} width={1200} height={720} priority /><figcaption>{name}의 이야기 장면</figcaption></figure>; // 장면 반환
} // 함수 종료
