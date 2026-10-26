import type { TextPlayPackage } from "@/features/text-play/core/types"; // 작품 계약
import { MOONLIT_ENGLISH_SCENES, MOONLIT_SCENES } from "@/features/text-play/data/moonlit-scenes"; // 완성 장면과 영어판

export const DEMO_TEXT_PLAY_PACKAGE: TextPlayPackage = // 대표 작품 패키지
{ // 패키지 시작
    id: "moonlit-forest-records", // 기존 작품 식별자 유지
    version: "0.2.0", // 콘텐츠 확장 버전
    saveSchemaVersion: 1, // 기존 저장 형식 유지
    title: "달빛 숲의 기록", // 작품 제목
    description: "사라진 기록과 숲 아래 목소리의 진실을 찾는 판타지 미스터리", // 작품 소개
    initialSceneId: "forest-gate", // 기존 시작 장면
    initialLocationId: "forest-gate", // 기존 시작 위치
    initialStats: { hp: 100, sanity: 80, gold: 10 }, // 초기 능력치 유지
    initialRelations: { lyra: 0 }, // 초기 관계 유지
    itemIds: ["moon-lantern", "record-fragment", "silver-thread", "resonance-key"], // 작품 단서
    locationIds: MOONLIT_SCENES.map((entry) => entry.id), // 전체 장면 위치
    questIds: ["voices-below"], // 기존 퀘스트 식별자
    eventIds: ["truth-revealed", "lake-memory", "tower-memory"], // 엔딩과 경로 기록
    characterIds: ["lyra"], // 주요 인물
    legacyLogTranslations: // 이전 완료 저장의 짧은 서술
    [ // 호환 번역 시작
        { ko: "당신은 기록을 세상에 돌려주고 숲의 오래된 오해를 끝낸다.", en: "You return the records to the world and end the forest's old misunderstanding." }, // 이전 진실 엔딩
        { ko: "당신은 숲을 떠났지만 희미한 목소리는 밤마다 다시 들려온다.", en: "You left the forest, but the faint voices return to you every night." }, // 이전 후퇴 엔딩
    ], // 호환 번역 종료
    glossary: // 한국어 용어
    { // 용어 시작
        characters: { lyra: { name: "리라", description: "달빛 숲의 기록관. 구조 신호를 조사하다 돌아오지 못했고 지금은 희미한 목소리로 곁에 머문다. 현재 장면에서 드러난 기억만 이야기하며 결말을 미리 말하지 않는다. 차분하고 조심스러운 말투." } }, // 인물 소개
        items: { "moon-lantern": "달빛 등불", "record-fragment": "기록 조각", "silver-thread": "은빛 실", "resonance-key": "공명 열쇠" }, // 단서 이름
        locations: Object.fromEntries(MOONLIT_SCENES.map((entry) => [entry.id, entry.title])), // 장면 표시 이름
        quests: { "voices-below": "숲 아래의 목소리" }, // 퀘스트 이름
        events: { "truth-revealed": "기록의 진실", "lake-memory": "호수의 기억", "tower-memory": "종탑의 기억" }, // 이벤트 이름
    }, // 용어 종료
    scenes: MOONLIT_SCENES, // 18개 장면
    endings: // 엔딩 계약
    [ // 엔딩 시작
        { id: "truth-ending", title: "기록의 진실", summary: "숲 아래 목소리의 정체를 밝히고 리라의 기록을 복원했다." }, // 기존 정상 엔딩
        { id: "retreat-ending", title: "돌아가는 길", summary: "숲의 봉인을 남겨 두고 돌아왔다. 기억과 다음 선택의 가능성은 숲에 남아 있다." }, // 조기·후반 귀환 엔딩
    ], // 엔딩 종료
    translations: // 영어판
    { // 번역 시작
        en: // 영어 작품
        { // 영어판 시작
            title: "Moonlit Forest Records", // 영어 제목
            description: "A fantasy mystery about lost records and the truth of the voices beneath the forest", // 영어 소개
            scenes: MOONLIT_ENGLISH_SCENES, // 모든 장면 영어판
            endings: // 영어 엔딩
            { // 엔딩 시작
                "truth-ending": { title: "The Truth of the Records", summary: "You uncovered the identity of the voices beneath the forest and restored Lyra's records." }, // 진실 엔딩
                "retreat-ending": { title: "The Way Back", summary: "You returned with the forest's seal intact. Its memories and the chance to choose again remain." }, // 귀환 엔딩
            }, // 엔딩 종료
            glossary: // 영어 용어
            { // 용어 시작
                characters: { lyra: { name: "Lyra", description: "The archivist of the moonlit forest. She never returned from investigating a call for help, and remains as a faint voice. She speaks calmly and shares only memories revealed in the current scene, never future events." } }, // 인물 소개
                items: { "moon-lantern": "Moon Lantern", "record-fragment": "Record Fragment", "silver-thread": "Silver Thread", "resonance-key": "Resonance Key" }, // 아이템 이름
                locations: Object.fromEntries(Object.entries(MOONLIT_ENGLISH_SCENES).map(([id, entry]) => [id, entry.title])), // 위치 이름
                quests: { "voices-below": "Voices Beneath the Forest" }, // 퀘스트 이름
                events: { "truth-revealed": "The Truth of the Records", "lake-memory": "Memory of the Lake", "tower-memory": "Memory of the Tower" }, // 이벤트 이름
            }, // 용어 종료
        }, // 영어판 종료
    }, // 번역 종료
}; // 패키지 종료
