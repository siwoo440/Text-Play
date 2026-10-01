import type { TextPlayPackage } from "@/features/text-play/core/types"; // 패키지 계약

export const DEMO_TEXT_PLAY_PACKAGE: TextPlayPackage = // 공식 샘플 패키지
{ // 패키지 시작
    id: "moonlit-forest-records", // 작품 식별자
    version: "0.1.0", // 작품 버전
    saveSchemaVersion: 1, // 저장 스키마 버전
    title: "달빛 숲의 기록", // 작품 제목
    description: "사라진 기록과 숲 아래 목소리의 진실을 찾는 판타지 미스터리", // 작품 설명
    initialSceneId: "forest-gate", // 시작 장면
    initialLocationId: "forest-gate", // 시작 위치
    initialStats: // 초기 능력치
    { // 능력치 시작
        hp: 100, // 초기 체력
        sanity: 80, // 초기 정신력
        gold: 10, // 초기 골드
    }, // 능력치 종료
    initialRelations: // 초기 관계도
    { // 관계도 시작
        lyra: 0, // 리라 관계도
    }, // 관계도 종료
    itemIds: ["moon-lantern"], // 아이템 목록
    locationIds: ["forest-gate", "moonlit-hall", "sealed-study"], // 장소 목록
    questIds: ["voices-below"], // 퀘스트 목록
    eventIds: ["truth-revealed"], // 이벤트 목록
    characterIds: ["lyra"], // 캐릭터 목록
    glossary: // 표시 이름과 소개
    { // 용어 시작
        characters: { lyra: { name: "리라", description: "달빛 숲의 기록을 지키던 기록관. 숲 아래 목소리를 조사하다 자취를 감췄고, 지금은 희미한 목소리로만 플레이어 곁에 머문다. 차분하고 조심스러운 말투를 쓴다." } }, // 인물
        items: { "moon-lantern": "달빛 등불" }, // 아이템
        locations: { "forest-gate": "달빛 숲 입구", "moonlit-hall": "폐허 회랑", "sealed-study": "봉인된 서재" }, // 장소
        quests: { "voices-below": "숲 아래의 목소리" }, // 퀘스트
        events: { "truth-revealed": "기록의 진실" }, // 이벤트
    }, // 용어 종료
    translations: // 다른 언어판
    { // 언어판 시작
        en: // 영어판
        { // 영어판 시작
            title: "Moonlit Forest Records", // 작품 제목
            description: "A fantasy mystery about lost records and the truth of the voices beneath the forest", // 작품 설명
            scenes: // 장면
            { // 장면 시작
                "forest-gate": { title: "Moonlit Forest Gate", narration: "Beyond the silver mist, an old lantern glimmers faintly.", choices: { "take-lantern": "Take the moon lantern", retreat: "Retreat out of the forest" } }, // 숲 입구
                "moonlit-hall": { title: "Ruined Hall", narration: "The lantern reveals patterns on the wall and a door leading to the sealed study.", choices: { "inspect-seal": "Examine the pattern on the wall", "enter-study": "Go to the sealed study" } }, // 폐허 회랑
                "sealed-study": { title: "Sealed Study", narration: "The records Lyra left behind show that the voices beneath the forest were a call for help.", choices: { "decode-records": "Decode the records" } }, // 봉인 서재
                "truth-ending": { title: "The Truth of the Records", narration: "You return the records to the world and end the forest's old misunderstanding.", choices: {} }, // 진실 엔딩
                "retreat-ending": { title: "The Way Back", narration: "You left the forest, but the faint voices return to you every night.", choices: {} }, // 후퇴 엔딩
            }, // 장면 종료
            endings: // 엔딩
            { // 엔딩 시작
                "truth-ending": { title: "The Truth of the Records", summary: "You uncovered the identity of the voices beneath the forest and restored Lyra's records." }, // 정상 엔딩
                "retreat-ending": { title: "The Way Back", summary: "You gave up the expedition at the entrance of the moonlit forest and turned back." }, // 후퇴 엔딩
            }, // 엔딩 종료
            glossary: // 용어
            { // 용어 시작
                characters: { lyra: { name: "Lyra", description: "An archivist who once guarded the records of the moonlit forest. She vanished while investigating the voices beneath the forest and now stays by the player's side only as a faint voice. She speaks calmly and carefully." } }, // 인물
                items: { "moon-lantern": "Moon Lantern" }, // 아이템
                locations: { "forest-gate": "Moonlit Forest Gate", "moonlit-hall": "Ruined Hall", "sealed-study": "Sealed Study" }, // 장소
                quests: { "voices-below": "Voices Beneath the Forest" }, // 퀘스트
                events: { "truth-revealed": "The Truth of the Records" }, // 이벤트
            }, // 용어 종료
        }, // 영어판 종료
    }, // 언어판 종료
    scenes: // 장면 목록
    [ // 장면 시작
        { // 숲 입구 시작
            id: "forest-gate", // 장면 식별자
            title: "달빛 숲 입구", // 장면 제목
            locationId: "forest-gate", // 장면 위치
            narration: "은빛 안개 너머에서 낡은 등불이 희미하게 빛난다.", // 장면 서술
            imagePath: "/images/scenes/moon-library.svg", // 임시 장면 이미지
            choices: // 선택지 목록
            [ // 선택지 시작
                { // 등불 선택 시작
                    id: "take-lantern", // 선택지 식별자
                    label: "달빛 등불을 든다", // 선택지 문구
                    targetSceneId: "moonlit-hall", // 이동 장면
                    actions: // 선택 액션
                    [ // 액션 시작
                        { type: "add-item", itemId: "moon-lantern", quantity: 1 }, // 등불 획득
                        { type: "move-location", locationId: "moonlit-hall" }, // 회랑 이동
                    ], // 액션 종료
                }, // 등불 선택 종료
                { // 후퇴 선택 시작
                    id: "retreat", // 선택지 식별자
                    label: "숲 밖으로 후퇴한다", // 선택지 문구
                    targetSceneId: "retreat-ending", // 후퇴 엔딩 이동
                    actions: [], // 상태 변경 없음
                }, // 후퇴 선택 종료
            ], // 선택지 종료
            endingId: null, // 진행 장면 표시
        }, // 숲 입구 종료
        { // 폐허 회랑 시작
            id: "moonlit-hall", // 장면 식별자
            title: "폐허 회랑", // 장면 제목
            locationId: "moonlit-hall", // 장면 위치
            narration: "등불이 벽의 문양과 봉인된 서재로 이어지는 문을 드러낸다.", // 장면 서술
            imagePath: "/images/scenes/dawn-letter.svg", // 임시 장면 이미지
            choices: // 선택지 목록
            [ // 선택지 시작
                { // 문양 조사 시작
                    id: "inspect-seal", // 선택지 식별자
                    label: "벽의 문양을 조사한다", // 선택지 문구
                    targetSceneId: "sealed-study", // 서재 이동
                    actions: // 선택 액션
                    [ // 액션 시작
                        { type: "change-stat", stat: "sanity", amount: -5 }, // 정신력 감소
                        { type: "move-location", locationId: "sealed-study" }, // 서재 이동
                        { type: "start-quest", questId: "voices-below" }, // 진실 퀘스트 시작
                    ], // 액션 종료
                }, // 문양 조사 종료
                { // 서재 이동 시작
                    id: "enter-study", // 선택지 식별자
                    label: "봉인된 서재로 간다", // 선택지 문구
                    targetSceneId: "sealed-study", // 서재 이동
                    actions: // 선택 액션
                    [ // 액션 시작
                        { type: "move-location", locationId: "sealed-study" }, // 서재 이동
                        { type: "start-quest", questId: "voices-below" }, // 진실 퀘스트 시작
                    ], // 액션 종료
                }, // 서재 이동 종료
            ], // 선택지 종료
            endingId: null, // 진행 장면 표시
        }, // 폐허 회랑 종료
        { // 봉인 서재 시작
            id: "sealed-study", // 장면 식별자
            title: "봉인된 서재", // 장면 제목
            locationId: "sealed-study", // 장면 위치
            narration: "리라가 남긴 기록은 숲 아래 목소리가 구조 신호였음을 보여 준다.", // 장면 서술
            imagePath: "/images/scenes/rainy-classroom.svg", // 임시 장면 이미지
            choices: // 선택지 목록
            [ // 선택지 시작
                { // 기록 해독 시작
                    id: "decode-records", // 선택지 식별자
                    label: "기록을 해독한다", // 선택지 문구
                    targetSceneId: "truth-ending", // 진실 엔딩 이동
                    actions: // 선택 액션
                    [ // 액션 시작
                        { type: "complete-quest", questId: "voices-below" }, // 진실 퀘스트 완료
                        { type: "trigger-event", eventId: "truth-revealed" }, // 진실 이벤트 실행
                        { type: "change-relation", characterId: "lyra", amount: 10 }, // 리라 관계도 증가
                    ], // 액션 종료
                }, // 기록 해독 종료
            ], // 선택지 종료
            endingId: null, // 진행 장면 표시
        }, // 봉인 서재 종료
        { // 진실 엔딩 시작
            id: "truth-ending", // 장면 식별자
            title: "기록의 진실", // 장면 제목
            locationId: "sealed-study", // 장면 위치
            narration: "당신은 기록을 세상에 돌려주고 숲의 오래된 오해를 끝낸다.", // 엔딩 서술
            imagePath: "/images/scenes/fallback-scene.svg", // 임시 엔딩 이미지
            choices: [], // 종료 장면 선택지
            endingId: "truth-ending", // 정상 엔딩 표시
        }, // 진실 엔딩 종료
        { // 후퇴 엔딩 시작
            id: "retreat-ending", // 장면 식별자
            title: "돌아가는 길", // 장면 제목
            locationId: "forest-gate", // 장면 위치
            narration: "당신은 숲을 떠났지만 희미한 목소리는 밤마다 다시 들려온다.", // 엔딩 서술
            imagePath: "/images/scenes/fallback-scene.svg", // 임시 엔딩 이미지
            choices: [], // 종료 장면 선택지
            endingId: "retreat-ending", // 후퇴 엔딩 표시
        }, // 후퇴 엔딩 종료
    ], // 장면 종료
    endings: // 엔딩 목록
    [ // 엔딩 시작
        { // 정상 엔딩 시작
            id: "truth-ending", // 엔딩 식별자
            title: "기록의 진실", // 엔딩 제목
            summary: "숲 아래 목소리의 정체를 밝히고 리라의 기록을 복원했다.", // 엔딩 요약
        }, // 정상 엔딩 종료
        { // 후퇴 엔딩 시작
            id: "retreat-ending", // 엔딩 식별자
            title: "돌아가는 길", // 엔딩 제목
            summary: "달빛 숲의 입구에서 탐사를 포기하고 돌아왔다.", // 엔딩 요약
        }, // 후퇴 엔딩 종료
    ], // 엔딩 종료
}; // 패키지 종료
