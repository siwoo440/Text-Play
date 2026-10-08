import { describe, expect, it } from "vitest"; // 테스트 도구
import { fromRelationLevel, getRelationStat, normalizeRelationStatId, readRelationLevel, resolveStartRelation, toRelationLevel } from "@chatbot/features/chat/relation-model"; // 관계 스탯
import { createAffectionStat, createStat } from "@chatbot/features/chat/stat-model"; // 스탯
import { createDefaultStatusTemplate } from "@chatbot/features/core/defaults"; // 기본 상태창
import { scenePaths, upgradeScenePath } from "@chatbot/lib/assets/scene-paths"; // 장면 그림 경로

describe("관계 스탯", () => // 관계 스탯 묶음
{ // 묶음 시작
    const template = createDefaultStatusTemplate(true); // 기본 상태창(호감도가 관계 스탯)

    it("기본 작품은 호감도가 관계 스탯이고, 상태창을 끄거나 지정이 없거나 공통 스탯이면 관계 스탯이 없다", () => // 지정 검증
    { // 검증 시작
        expect(getRelationStat(template)?.name).toBe("호감도"); // 기본 지정
        expect(getRelationStat({ ...template, enabled: false })).toBeNull(); // 상태창 끔
        expect(getRelationStat({ ...template, relationStatId: null })).toBeNull(); // 지정 없음
        expect(getRelationStat({ ...template, stats: [{ ...createAffectionStat(), scope: "shared" }] })).toBeNull(); // 공통 스탯
        expect(getRelationStat(undefined)).toBeNull(); // 형식 없음
        expect(normalizeRelationStatId({ ...template, stats: [] })).toBeNull(); // 지운 스탯 지정 정리
        expect(normalizeRelationStatId(template)).toBe("affection"); // 정상 지정 유지
    }); // 검증 종료

    it("스탯 값을 0~100 관계 수치로 환산하고 되돌린다", () => // 환산 검증
    { // 검증 시작
        const affection = createAffectionStat(); // 범위 0~100
        expect(toRelationLevel(affection, 34)).toBe(34); // 그대로
        expect(fromRelationLevel(affection, 34)).toBe(34); // 그대로
        const trust = { ...createStat(0), id: "trust", name: "신뢰", min: -50, max: 50 }; // 범위 -50~50
        expect(toRelationLevel(trust, 0)).toBe(50); // 가운데
        expect(toRelationLevel(trust, 50)).toBe(100); // 최댓값
        expect(fromRelationLevel(trust, 25)).toBe(-25); // 되돌리기
        expect(toRelationLevel(trust, 999)).toBe(100); // 범위 밖은 자름
    }); // 검증 종료

    it("상태창에서 대표 인물의 관계 수치를 읽는다", () => // 읽기 검증
    { // 검증 시작
        const affection = createAffectionStat(); // 호감도
        const status = { turn: 1, location: null, time: null, tip: null, thoughts: [], custom: [], stats: [{ statId: "affection", name: "호감도", icon: "❤️", target: "노아", value: 52, delta: 2, min: 0, max: 100 }] }; // 상태창
        expect(readRelationLevel(status, affection, "노아")).toBe(52); // 대표 인물 값
        expect(readRelationLevel(status, affection, "리안")).toBeNull(); // 다른 인물 없음
        expect(readRelationLevel(null, affection, "노아")).toBeNull(); // 상태창 없음
    }); // 검증 종료

    it("시작 설정에 관계 수치가 정해져 있으면 그 값으로, 자동 시작 설정이면 관계 스탯 초기값으로 시작한다", () => // 시작값 검증
    { // 검증 시작
        const warm = { ...template, stats: [{ ...createAffectionStat(), initial: 60 }] }; // 초기값 60
        expect(resolveStartRelation(warm, { presetId: "returning-reader", relationshipLevel: 34, relationshipStage: "아는 사이" })).toEqual({ relationshipLevel: 34, relationshipStage: "아는 사이" }); // 정해 둔 시작 설정 우선
        expect(resolveStartRelation(warm, { presetId: "default", relationshipLevel: 0, relationshipStage: "첫 만남" })).toEqual({ relationshipLevel: 60, relationshipStage: "가까운 사이" }); // 자동 설정은 스탯 초기값
        expect(resolveStartRelation(warm, { presetId: "story-opening", relationshipLevel: 0, relationshipStage: "첫 만남" })).toEqual({ relationshipLevel: 60, relationshipStage: "가까운 사이" }); // 스토리 시작도 초기값
        expect(resolveStartRelation({ ...warm, relationStatId: null }, { presetId: "default", relationshipLevel: 0, relationshipStage: "첫 만남" })).toEqual({ relationshipLevel: 0, relationshipStage: "첫 만남" }); // 관계 스탯 없으면 그대로
    }); // 검증 종료
}); // 묶음 종료

describe("장면 그림 경로", () => // 장면 경로 묶음
{ // 묶음 시작
    it("예전 임시 그림(SVG) 경로를 새 그림(WebP) 경로로 바꾸고 다른 경로는 그대로 둔다", () => // 경로 변환 검증
    { // 검증 시작
        expect(upgradeScenePath("/images/scenes/dawn-letter.svg")).toBe(scenePaths.dawn); // 새벽
        expect(upgradeScenePath("/images/scenes/fallback-scene.svg")).toBe("/images/scenes/fallback-scene.webp"); // 기본
        expect(upgradeScenePath("/images/characters/rian.webp")).toBe("/images/characters/rian.webp"); // 캐릭터 그림 유지
        expect(upgradeScenePath("data:image/svg+xml,abc")).toBe("data:image/svg+xml,abc"); // 내 이미지 유지
    }); // 검증 종료
}); // 묶음 종료
