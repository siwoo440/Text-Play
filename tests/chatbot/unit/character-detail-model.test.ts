import { describe, expect, it } from "vitest"; // 테스트 도구
import { createConversationFromPreset, getCharacterDetailProfile, getLatestActiveConversation, getRelatedCharacters } from "@chatbot/features/character/character-detail-model"; // 상세 선택 함수
import { createInitialState } from "@chatbot/features/core/initial-state"; // 초기 상태 함수
import { resolveRelationshipStage } from "@chatbot/lib/story/story-engine"; // 관계 단계 기준

describe("캐릭터 상세 모델", () => // 상세 모델 묶음
{ // 묶음 시작
    it("하린의 상세 프로필과 기본 시작 구성을 반환한다", () => // 하린 프로필 검증
    { // 검증 시작
        const character = createInitialState().characters.find((item) => item.id === "harin"); // 하린 조회
        expect(character).toBeDefined(); // 하린 존재 확인
        const profile = getCharacterDetailProfile(character!); // 상세 프로필 조회
        expect(profile.characterId).toBe("harin"); // 식별자 확인
        expect(profile.accentColor).toBe("#f4a261"); // 강조색 확인
        expect(profile.contentRating).toBe("all"); // 콘텐츠 등급 확인
        expect(profile.startPresets[0]?.id).toBe("after-work-comfort"); // 기본 프리셋 확인
        expect(profile.prologues[0]?.image).toBe("/images/characters/prologues/harin-prologue-v1.png"); // 프롤로그 경로 확인
        expect(profile.releaseNotes[0]?.version).toBe("1.2.0"); // 업데이트 버전 확인
    }); // 검증 종료

    it("상세 데이터가 없는 캐릭터는 기존 정보만으로 안전한 기본 프로필을 만든다", () => // 기본 프로필 검증
    { // 검증 시작
        const character = createInitialState().characters.find((item) => item.id === "rank-008"); // 랭킹 캐릭터 조회
        expect(character).toBeDefined(); // 캐릭터 존재 확인
        const profile = getCharacterDetailProfile(character!); // 기본 프로필 조회
        expect(profile.characterId).toBe("rank-008"); // 식별자 확인
        expect(profile.badges).toEqual(character!.tags); // 태그 배지 확인
        expect(profile.contentWarnings).toEqual([]); // 미확인 경고 제외
        expect(profile.dialogueStyle).toBe(character!.summary); // 기존 소개 활용 확인
        expect(profile.relationshipSetup).toBe(character!.worldSetting); // 기존 세계관 활용 확인
        expect(profile.startPresets[0]?.greeting).toBe(character!.greeting); // 기존 첫 대사 확인
        expect(profile.prologues[0]?.image).toBe(character!.coverImage); // 기존 이미지 확인
        expect(profile.sampleMetrics).toEqual({ conversations: character!.popularity, bookmarks: null, ratings: null }); // 확인 가능 지표 확인
    }); // 검증 종료

    it("연관 캐릭터는 자신과 비공개 항목을 제외하고 태그 일치 순으로 제한한다", () => // 연관 정렬 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const character = state.characters.find((item) => item.id === "harin")!; // 기준 캐릭터 조회
        const closeMatch = { ...state.characters.find((item) => item.id === "miel")!, id: "close-match", tags: ["일상", "힐링", "로맨스"], popularity: 10 }; // 세 태그 일치 캐릭터
        const looseMatch = { ...state.characters.find((item) => item.id === "yuna")!, id: "loose-match", tags: ["일상"], popularity: 999999 }; // 한 태그 일치 캐릭터
        const privateMatch = { ...state.characters.find((item) => item.id === "sera")!, id: "private-match", tags: ["일상", "힐링", "로맨스"], visibility: "private" as const }; // 비공개 캐릭터
        const related = getRelatedCharacters(character, [character, looseMatch, privateMatch, closeMatch], 2); // 연관 목록 조회
        expect(related.map((item) => item.id)).toEqual(["close-match", "loose-match"]); // 정렬 결과 확인
    }); // 검증 종료

    it("가장 최근에 갱신된 활성 대화를 선택한다", () => // 최근 대화 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const base = state.conversations.find((conversation) => conversation.characterId === "rian")!; // 기준 대화 조회
        const older = { ...base, id: "conversation-rian-older", updatedAt: "2026-09-20T00:00:00.000Z" }; // 이전 활성 대화
        const newer = { ...base, id: "conversation-rian-newer", updatedAt: "2026-09-29T00:00:00.000Z" }; // 최신 활성 대화
        const archived = { ...base, id: "conversation-rian-archived", archivedAt: "2026-09-30T00:00:00.000Z", updatedAt: "2026-09-30T00:00:00.000Z" }; // 보관 대화
        expect(getLatestActiveConversation([older, archived, newer], "rian")?.id).toBe("conversation-rian-newer"); // 최신 활성 대화 확인
    }); // 검증 종료

    it("보관 대화만 있으면 최근 활성 대화를 반환하지 않는다", () => // 보관 제외 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const base = state.conversations.find((conversation) => conversation.characterId === "rian")!; // 기준 대화 조회
        const archived = { ...base, archivedAt: "2026-09-29T00:00:00.000Z" }; // 보관 대화 생성
        expect(getLatestActiveConversation([archived], "rian")).toBeNull(); // 빈 결과 확인
    }); // 검증 종료

    it("기본 캐릭터의 시작 설정은 관계 수치와 관계 단계가 같은 기준을 따른다", () => // 시작 관계 기준 검증
    { // 검증 시작
        for (const character of createInitialState().characters) // 기본 캐릭터 순회
        { // 순회 시작
            for (const preset of getCharacterDetailProfile(character).startPresets) // 시작 설정 순회
            { // 순회 시작
                expect(`${character.id}/${preset.id}: ${resolveRelationshipStage(preset.relationshipLevel)}`).toBe(`${character.id}/${preset.id}: ${preset.relationshipStage}`); // 수치로 정한 단계와 적어 둔 단계가 같음
            } // 순회 종료
        } // 순회 종료
    }); // 검증 종료

    it("상세에서 고른 대화 프로필이 새 대화의 설정에 들어가고, 기본 프로필이면 비워 둔다", () => // 대화 프로필 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        state.personas.push({ id: "persona-traveler", name: "여행자 소하", description: "먼 길을 걷는 사람", createdAt: "2026-10-05T00:00:00.000Z", updatedAt: "2026-10-05T00:00:00.000Z" }); // 추가 대화 프로필
        const chosen = createConversationFromPreset(state, "harin", "closing-time", "2026-10-05T09:00:00.000Z", "persona-traveler"); // 고른 프로필로 시작
        expect(chosen.conversation.settings.personaId).toBe("persona-traveler"); // 고른 프로필 적용
        const basic = createConversationFromPreset(state, "harin", "closing-time", "2026-10-05T09:01:00.000Z", state.personas[0].id); // 기본 프로필로 시작
        expect(basic.conversation.settings.personaId).toBeNull(); // 기본 프로필은 비워 둠(기본을 따름)
        const missing = createConversationFromPreset(state, "harin", "closing-time", "2026-10-05T09:02:00.000Z", "persona-gone"); // 없는 프로필
        expect(missing.conversation.settings.personaId).toBeNull(); // 없는 프로필은 기본으로
    }); // 검증 종료

    it("편집기에서 적은 업데이트 기록이 상세의 업데이트 정보 맨 앞에 최근 순으로 나온다", () => // 업데이트 기록 검증
    { // 검증 시작
        const harin = createInitialState().characters.find((character) => character.id === "harin"); // 하린
        if (harin === undefined) // 캐릭터 없음
        { // 조건 시작
            throw new Error("하린을 찾지 못했습니다."); // 준비 오류
        } // 조건 종료
        const edited = { ...harin, updates: [{ id: "update-1", version: "V1.3", date: "2026-10-01", note: "첫 인사를 다듬었어요." }, { id: "update-2", version: "1.4", date: "2026-10-04", note: "비 오는 날 장면을 더했어요." }] }; // 제작자가 적은 기록
        const notes = getCharacterDetailProfile(edited).releaseNotes; // 업데이트 정보
        expect(notes.slice(0, 2)).toEqual([{ version: "1.4", date: "2026-10-04", title: "", changes: ["비 오는 날 장면을 더했어요."] }, { version: "1.3", date: "2026-10-01", title: "", changes: ["첫 인사를 다듬었어요."] }]); // 최근 순, 버전 앞의 V는 뺌
        expect(notes[2]?.version).toBe("1.2.0"); // 기본 기록은 그 뒤에
        expect(getCharacterDetailProfile(harin).releaseNotes).toHaveLength(1); // 적은 기록이 없으면 그대로
    }); // 검증 종료

    it("선택한 시작 프리셋으로 독립 대화와 첫 메시지를 만든다", () => // 프리셋 생성 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const originalConversationCount = state.conversations.length; // 기존 대화 수 저장
        const originalMessageCount = state.messages.length; // 기존 메시지 수 저장
        const result = createConversationFromPreset(state, "harin", "closing-time", "2026-09-29T09:00:00.000Z"); // 새 대화 생성
        expect(result.conversation.id).toBe("conversation-harin-2026-09-29T09:00:00.000Z"); // 시간 기반 식별자 확인
        expect(result.conversation.title).toBe("퇴근길 카페의 하린 · 마감 뒤의 한 잔"); // 대화 제목 확인
        expect(result.conversation.startSettings.presetId).toBe("closing-time"); // 프리셋 식별자 확인
        expect(result.conversation.currentVersionId).toBe(`${result.conversation.id}-version-1`); // 현재 버전 확인
        expect(result.version.relationshipStage).toBe("가까운 사이"); // 관계 단계 확인
        expect(result.version.relationshipLevel).toBe(52); // 관계 수치 확인(가까운 사이 기준 50 이상)
        expect(result.version.currentScene).toBe("/images/characters/prologues/harin-prologue-v1.png"); // 표시 이미지 확인
        expect(result.conversation.startSettings.scene).toBe("/images/characters/prologues/harin-prologue-v1.png"); // 저장 이미지 확인
        expect(result.message.content).toBe("오늘 마지막 잔은 네 거야. 천천히 마시면서 이야기해 줘."); // 첫 대사 확인
        expect(result.message.versionId).toBe(result.conversation.currentVersionId); // 메시지 버전 확인
        expect(result.message.sourceMessageId).toBeNull(); // 원본 메시지 확인
        expect(result.state.conversationVersions.at(-1)?.id).toBe(result.conversation.currentVersionId); // 버전 상태 확인
        expect(result.state.selectedConversationId).toBe(result.conversation.id); // 선택 대화 확인
        expect(result.state.conversations).toHaveLength(originalConversationCount + 1); // 대화 추가 확인
        expect(result.state.messages).toHaveLength(originalMessageCount + 1); // 메시지 추가 확인
        expect(state.conversations).toHaveLength(originalConversationCount); // 원본 대화 유지 확인
        expect(state.messages).toHaveLength(originalMessageCount); // 원본 메시지 유지 확인
    }); // 검증 종료

    it("동일 시각의 대화 식별자가 겹치면 가장 작은 숫자 접미사를 붙인다", () => // 식별자 충돌 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const first = createConversationFromPreset(state, "harin", "after-work-comfort", "2026-09-29T09:00:00.000Z"); // 첫 대화 생성
        const second = createConversationFromPreset(first.state, "harin", "after-work-comfort", "2026-09-29T09:00:00.000Z"); // 둘째 대화 생성
        expect(second.conversation.id).toBe("conversation-harin-2026-09-29T09:00:00.000Z-2"); // 접미사 확인
        expect(second.message.id).toBe(`${second.conversation.id}-message-1`); // 메시지 식별자 확인
    }); // 검증 종료

    it("알 수 없는 프리셋은 캐릭터의 첫 프리셋으로 안전하게 대체한다", () => // 프리셋 대체 검증
    { // 검증 시작
        const state = createInitialState(); // 초기 상태 생성
        const result = createConversationFromPreset(state, "harin", "missing", "2026-09-29T10:00:00.000Z"); // 잘못된 프리셋 생성
        expect(result.conversation.startSettings.presetId).toBe("after-work-comfort"); // 기본 프리셋 확인
        expect(result.version.lastMessage).toBe("오늘은 평소보다 조금 지쳐 보여. 따뜻한 걸로 준비해도 될까?"); // 기본 대사 확인
    }); // 검증 종료
}); // 묶음 종료
