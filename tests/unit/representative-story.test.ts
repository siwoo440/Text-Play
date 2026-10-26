import { describe, expect, it } from "vitest"; // 검증 도구
import { createTextPlayState, getAvailableChoices, selectTextPlayChoice } from "@/features/text-play/core/engine"; // 실제 엔진
import { DEMO_TEXT_PLAY_PACKAGE as work } from "@/features/text-play/data/demo-package"; // 대표 작품
import { buildTextPlayStoryPages } from "@/features/text-play/ui/text-play-story-pages"; // 턴 이미지 연결
import { createTextTranslator, localizeTextPlayPackage } from "@/features/text-play/data/localize-package"; // 언어판과 저장 문구 변환
import type { TextPlayState } from "@/features/text-play/core/types"; // 상태 계약
import { MemoryTextPlaySaveRepository } from "@/features/text-play/storage/memory-save-repository"; // 실제 저장 계약 구현
import { buildTextPlayContext } from "@/features/text-play/ai/context-builder"; // 장면별 AI 문맥
import { MockLLMAdapter } from "@/lib/adapters/mock-llm-adapter"; // 오프라인 임시 AI

describe("대표 작품 완성도", () => // 작품 검증 묶음
{ // 묶음 시작
    it("15~20개 장면과 두 엔딩을 제공하고 모든 경로를 실제 엔진으로 완료한다", () => // 분기 도달성 검증
    { // 검증 시작
        expect(work.scenes.length).toBeGreaterThanOrEqual(15); // 최소 콘텐츠 길이
        expect(work.scenes.length).toBeLessThanOrEqual(20); // 최대 콘텐츠 범위
        const queue: TextPlayState[] = [createTextPlayState(work, "2026-10-26T00:00:00Z")]; // 탐색 시작
        const reached = new Set<string>(); // 도달 장면 기록
        let steps = 0; // 무한 순회 방지
        while (queue.length > 0) // 모든 분기 순회
        { // 순회 시작
            const state = queue.shift()!; // 현재 경로
            reached.add(state.sceneId); // 장면 도달 기록
            const choices = getAvailableChoices(work, state); // 실제 가능 선택지
            if (state.endingId === null) // 진행 장면 확인
            { // 조건 시작
                expect(choices.length, state.sceneId).toBeGreaterThan(0); // 막힌 장면 차단
            } // 조건 종료
            for (const choice of choices) // 선택지별 경로 확인
            { // 선택 순회 시작
                const result = selectTextPlayChoice(work, state, choice.id, "2026-10-26T00:01:00Z"); // 실제 행동 적용
                expect(result.ok, `${state.sceneId}/${choice.id}`).toBe(true); // 선언 액션 유효성
                queue.push(result.state); // 다음 분기 추가
            } // 선택 순회 종료
            steps += 1; // 탐색 횟수 증가
            if (steps > 250) // 유한 경로 검사
            { // 조건 시작
                throw new Error("장면 경로 순환 또는 과도한 분기"); // 순환 오류
            } // 조건 종료
        } // 순회 종료
        expect([...reached].sort()).toEqual(work.scenes.map((scene) => scene.id).sort()); // 모든 장면 도달 확인
    }); // 검증 종료

    it("서재까지 진행해도 이야기가 끝나지 않고 등장인물 대사를 기록한다", () => // 짧은 경로 회귀 방지
    { // 검증 시작
        let state = createTextPlayState(work, "2026-10-26T00:00:00Z"); // 초기 상태
        for (const id of ["take-lantern", "enter-study", "decode-records"]) // 기존 짧은 경로
        { // 순회 시작
            state = selectTextPlayChoice(work, state, id, "2026-10-26T00:01:00Z").state; // 선택 적용
        } // 순회 종료
        expect(state.endingId).toBeNull(); // 조기 엔딩 차단
        expect(state.log.some((entry) => entry.kind === "dialogue" && entry.speaker === "lyra")).toBe(true); // 작품 대사 확인
    }); // 검증 종료

    it("아이템 조건을 만족하지 않는 선택지는 숨기고 직접 호출도 거부한다", () => // 조건 우회 차단
    { // 검증 시작
        const locked = { ...work.scenes[0].choices[0], requiredItemId: "moon-lantern" }; // 조건 있는 선택지
        const gated = { ...work, scenes: [{ ...work.scenes[0], choices: [locked] }, ...work.scenes.slice(1)] }; // 조건 검증 작품
        const state = createTextPlayState(gated, "2026-10-26T00:00:00Z"); // 등불 없는 상태
        expect(getAvailableChoices(gated, state)).toEqual([]); // 화면 선택지 차단
        expect(selectTextPlayChoice(gated, state, locked.id, state.updatedAt)).toEqual({ ok: false, reason: "unknown-choice", state }); // 직접 호출 원자적 거부
        expect(getAvailableChoices(gated, { ...state, inventory: { "moon-lantern": 1 } })).toHaveLength(1); // 아이템 보유 시 허용
    }); // 검증 종료

    it("서술과 무관하게 저장된 장면 식별자로 지난 턴의 그림을 찾는다", () => // 저장된 턴 이미지 검증
    { // 검증 시작
        const entry = { id: "old", kind: "narration" as const, speaker: null, content: "번역되거나 바뀐 문장", sceneId: "moonlit-hall", createdAt: "2026-10-26T00:00:00Z" }; // 장면 식별자 기록
        expect(buildTextPlayStoryPages([entry], work)[0].sceneId).toBe("moonlit-hall"); // 명시적 장면 우선 확인
    }); // 검증 종료

    it("모든 장면에 영어판·목표·제작 이미지를 제공한다", () => // 콘텐츠 누락 검증
    { // 검증 시작
        const english = localizeTextPlayPackage(work, "en"); // 영어판 생성
        for (const scene of english.scenes) // 영어 장면 순회
        { // 순회 시작
            expect(work.translations?.en?.scenes[scene.id], scene.id).toBeDefined(); // 번역 존재 확인
            expect(scene.imagePath, scene.id).toMatch(/^\/images\/text-play\/moonlit\//); // 정식 장면 이미지
            expect(scene.narration, scene.id).not.toMatch(/[가-힣]/u); // 영어판 원문 누락 차단
            expect(scene.objective, scene.id).toBeTruthy(); // 장면 목표 확인
            expect(scene.dialogue?.content, scene.id).toBeTruthy(); // 고정 대사 확인
        } // 순회 종료
    }); // 검증 종료

    it.each(["follow-lake", "climb-tower"])("%s 분기를 저장하고 복원해 엔딩과 지난 그림을 유지한다", async (branch) => // 분기별 저장 검증
    { // 검증 시작
        let state = createTextPlayState(work, "2026-10-26T00:00:00Z"); // 시작 상태
        for (const id of ["take-lantern", "enter-study", "decode-records", "follow-map", branch]) // 분기 도달
        { // 순회 시작
            state = selectTextPlayChoice(work, state, id, state.updatedAt).state; // 실제 선택 적용
        } // 순회 종료
        const repository = new MemoryTextPlaySaveRepository(); // 저장소 생성
        await repository.save("manual-1", state, state.sceneId); // 중간 장면 저장
        state = (await repository.load(work.id, "manual-1"))!.state; // 저장 복원
        const past = buildTextPlayStoryPages(state.log, work); // 복원 턴 묶음
        expect(past.at(-1)?.sceneId).toBe(branch === "follow-lake" ? "mirror-lake" : "bell-tower"); // 분기 그림 연결
        expect(past[0].sceneId).toBe("forest-gate"); // 첫 그림 유지
        while (state.endingId === null) // 복원 이후 끝까지 진행
        { // 반복 시작
            const result = selectTextPlayChoice(work, state, getAvailableChoices(work, state)[0].id, state.updatedAt); // 유효 선택
            expect(result.ok).toBe(true); // 진행 성공
            state = result.state; // 다음 상태
        } // 반복 종료
        expect(state.endingId).toBe("truth-ending"); // 정상 엔딩 도달
        expect(state.completedQuestIds).toContain("voices-below"); // 퀘스트 완료
    }); // 검증 종료

    it("기존 저장의 장면 식별자 없는 기록과 완료 엔딩을 유지한다", () => // 이전 저장 호환성
    { // 검증 시작
        const state = createTextPlayState(work, "2026-10-26T00:00:00Z"); // 호환 시작 상태
        state.packageVersion = "0.1.0"; // 이전 작품 버전
        state.log = state.log.filter((entry) => entry.kind === "narration").map(({ sceneId, ...entry }) => // 이전 기록 형식
        { // 변환 시작
            void sceneId; // 새 필드 제외
            return entry; // 이전 기록 반환
        }); // 변환 종료
        expect(buildTextPlayStoryPages(state.log, work)[0].sceneId).toBe("forest-gate"); // 이전 그림 탐색
        expect(selectTextPlayChoice(work, state, "take-lantern", state.updatedAt).ok).toBe(true); // 이전 저장 이어가기
        const ended = { ...state, sceneId: "truth-ending", endingId: "truth-ending" }; // 이전 완료 저장
        expect(getAvailableChoices(work, ended)).toEqual([]); // 완료 상태 유지
    }); // 검증 종료

    it("단서를 잃고 능력치가 최솟값이어도 기록고에 들어갈 수 있다", () => // 자유 행동 이후 막힘 방지
    { // 검증 시작
        const state = { ...createTextPlayState(work, "2026-10-26T00:00:00Z"), sceneId: "archive-door", locationId: "archive-door", inventory: {}, stats: { hp: 0, sanity: 0, gold: 0 } }; // 단서 없는 경계 상태
        expect(getAvailableChoices(work, state).map((choice) => choice.id)).toEqual(["answer-voices"]); // 안전한 대체 선택
        expect(selectTextPlayChoice(work, state, "answer-voices", state.updatedAt).state.sceneId).toBe("under-archive"); // 진행 유지
    }); // 검증 종료

    it("영어로 저장한 고정 관찰과 대사도 한국어로 다시 전환한다", () => // 독립 검토의 양방향 번역 회귀
    { // 검증 시작
        const english = localizeTextPlayPackage(work, "en"); // 영어 작품
        const translate = createTextTranslator(work, "ko"); // 한국어 표시 변환
        for (const [index, scene] of english.scenes.entries()) // 모든 장면 확인
        { // 순회 시작
            expect(translate(scene.observation!), scene.id).toBe(work.scenes[index].observation); // 저장 관찰의 역방향 번역
            expect(translate(scene.dialogue!.content), scene.id).toBe(work.scenes[index].dialogue!.content); // 저장 대사의 역방향 번역
        } // 순회 종료
    }); // 검증 종료

    it("이전 완료 저장의 짧은 엔딩 기록도 영어로 표시한다", () => // 독립 검토의 이전 엔딩 번역 회귀
    { // 검증 시작
        const translate = createTextTranslator(work, "en"); // 영어 표시 변환
        for (const original of ["당신은 기록을 세상에 돌려주고 숲의 오래된 오해를 끝낸다.", "당신은 숲을 떠났지만 희미한 목소리는 밤마다 다시 들려온다."]) // 실제 이전 서술
        { // 순회 시작
            expect(translate(original)).not.toMatch(/[가-힣]/u); // 원문 누출 차단
            expect(translate(original)).not.toBe(original); // 실제 별칭 적용
        } // 순회 종료
    }); // 검증 종료

    it("관계도가 최대여도 임시 AI의 장면 관찰을 반복하고 진행할 수 있다", async () => // 임시 AI 문맥과 진행 안전성
    { // 검증 시작
        const adapter = new MockLLMAdapter({ delayMs: 0 }); // 빠른 임시 AI
        const initial = createTextPlayState(work, "2026-10-26T00:00:00Z"); // 첫 장면
        const hall = selectTextPlayChoice(work, initial, "take-lantern", initial.updatedAt).state; // 회랑 장면
        const outputs: string[] = []; // 장면 응답 수집
        for (const state of [initial, hall]) // 서로 다른 장면
        { // 순회 시작
            state.relations.lyra = 100; // 관계 최대 상태
            let raw = ""; // 응답 누적
            for await (const chunk of adapter.streamStructuredReply(buildTextPlayContext(work, state, "주변을 살핀다", "en"))) // 실제 문맥 전달
            { // 스트림 시작
                raw += chunk; // 조각 누적
            } // 스트림 종료
            const reply = JSON.parse(raw); // 응답 해석
            expect(reply.proposedActions).toEqual([]); // 무한 관계 상승 차단
            expect(reply.narration).not.toMatch(/[가-힣]/u); // 영어 관찰 유지
            outputs.push(reply.narration); // 장면 서술 저장
        } // 순회 종료
        expect(outputs[0]).not.toBe(outputs[1]); // 장소에 따른 관찰 변화
    }); // 검증 종료
}); // 묶음 종료
