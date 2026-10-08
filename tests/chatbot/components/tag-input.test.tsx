import { render, screen } from "@testing-library/react"; // 화면 조회 도구
import userEvent from "@testing-library/user-event"; // 사용자 동작 도구
import { useState } from "react"; // 리액트 상태
import { describe, expect, it } from "vitest"; // 테스트 도구
import { TagInput } from "@chatbot/features/character/TagInput"; // 태그 입력칸

function Host({ initial, replace }: { initial: string[]; replace?: string[] }) // 편집기처럼 태그 목록을 들고 있는 부모
{ // 함수 시작
    const [tags, setTags] = useState(initial); // 태그 목록
    return ( // 화면 반환
        <div> {/* 부모 */}
            <TagInput label="태그" tags={tags} placeholder="힐링, 판타지, 여행" onChange={setTags} /> {/* 태그 입력칸 */}
            <output aria-label="태그 목록">{JSON.stringify(tags.map((tag) => tag.trim()))}</output> {/* 부모가 가진 태그 */}
            <button type="button" onClick={() => setTags(replace ?? [])}>불러오기</button> {/* 바깥에서 태그 바꾸기(임시 저장 불러오기 흉내) */}
        </div> // 부모 종료
    ); // 반환 종료
} // 함수 종료

describe("태그 입력칸", () => // 태그 입력 묶음
{ // 묶음 시작
    it("한 글자씩 쳐도 쉼표 뒤에 빈칸이 늘어나지 않고 친 그대로 보인다", async () => // 입력 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        render(<Host initial={[]} />); // 렌더
        const input = screen.getByRole("textbox", { name: "태그" }); // 입력칸
        await user.type(input, "힐링,판타지,여행"); // 한 글자씩 입력
        expect(input).toHaveValue("힐링,판타지,여행"); // 친 그대로
        expect(screen.getByLabelText("태그 목록")).toHaveTextContent("[\"힐링\",\"판타지\",\"여행\"]"); // 부모는 태그 세 개
        await user.type(input, ", 새벽"); // 쉼표와 빈칸을 직접 침
        expect(input).toHaveValue("힐링,판타지,여행, 새벽"); // 내가 친 빈칸만 있음
    }); // 검증 종료

    it("처음에는 저장된 태그를 쉼표와 빈칸으로 이어 보여 주고, 바깥에서 태그가 바뀌면 그 값으로 다시 맞춘다", async () => // 바깥 변경 검증
    { // 검증 시작
        const user = userEvent.setup(); // 사용자 도구 생성
        render(<Host initial={["힐링", "판타지"]} replace={["미스터리", "학원"]} />); // 저장된 태그로 렌더
        const input = screen.getByRole("textbox", { name: "태그" }); // 입력칸
        expect(input).toHaveValue("힐링, 판타지"); // 처음 모습
        await user.type(input, ",여"); // 이어 입력
        expect(input).toHaveValue("힐링, 판타지,여"); // 친 그대로
        await user.click(screen.getByRole("button", { name: "불러오기" })); // 바깥에서 바꿈
        expect(input).toHaveValue("미스터리, 학원"); // 바뀐 태그
    }); // 검증 종료
}); // 묶음 종료
