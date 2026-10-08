"use client"; // 클라이언트 컴포넌트

import { useState } from "react"; // 리액트 상태

function sameTags(left: readonly string[], right: readonly string[]): boolean // 앞뒤 빈칸을 빼고 같은 태그 목록인지(빈 목록과 빈 글 하나는 같은 것으로 봄)
{ // 함수 시작
    return left.map((tag) => tag.trim()).join(",") === right.map((tag) => tag.trim()).join(","); // 쉼표로 이은 글로 비교
} // 함수 종료

export function TagInput({ label, tags, placeholder, onChange }: { label: string; tags: readonly string[]; placeholder: string; onChange(tags: string[]): void }) // 쉼표로 나눠 적는 태그 입력칸(캐릭터·스토리 편집기 공통)
{ // 함수 시작
    const [text, setText] = useState(() => tags.join(", ")); // 입력칸 글자(친 그대로 보여 줌: 칠 때마다 다시 이어 붙이면 쉼표 뒤 빈칸이 늘어남)
    if (!sameTags(tags, text.split(",")) && text !== tags.join(", ")) // 바깥에서 태그가 바뀜(임시 저장 불러오기, 저장하며 정리 등)
    { // 조건 시작
        setText(tags.join(", ")); // 바뀐 태그로 다시 맞춤
    } // 조건 종료
    return <label>{label}<input value={text} onChange={(event) => { setText(event.target.value); onChange(event.target.value.split(",")); }} placeholder={placeholder} /></label>; // 입력칸 반환(태그 목록은 쉼표로 나눠 올려 보냄)
} // 함수 종료
