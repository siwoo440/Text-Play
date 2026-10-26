import type { TextPlayAction, TextPlayChoice, TextPlayPackageTranslation, TextPlayScene } from "@/features/text-play/core/types"; // 작품 데이터 계약

type SceneText = TextPlayPackageTranslation["scenes"][string]; // 장면 번역 계약
type StoryChoice = TextPlayChoice & { englishLabel: string }; // 이중 언어 선택지
type StoryScene = Omit<TextPlayScene, "choices"> & { english: SceneText; choices: StoryChoice[] }; // 이중 언어 장면과 선택지

const OBSERVATIONS: Record<string, [string, string]> = // 장소별 오프라인 관찰
{ // 목록 시작
    forest: ["등불 가까이의 이끼만 은빛으로 반짝인다. 숲의 흔적은 빛이 닿는 곳부터 확인할 수 있다.", "Only the moss beside the lantern glints silver. The forest's traces are clearest where its light reaches."], // 숲 관찰
    hall: ["회랑의 벽에는 문에서 바닥으로 이어지는 가느다란 홈이 있다. 소리는 그 홈을 타고 올라온다.", "A thin groove runs from the hall's door into the floor. The sound travels upward along it."], // 회랑 관찰
    study: ["책상에 쌓인 먼지 사이로 종이를 옮긴 자국이 보인다. 기록은 무작정 사라진 것이 아니라 옮겨진 듯하다.", "Marks in the desk's dust show where papers were moved. The records seem displaced rather than simply lost."], // 서재 관찰
    lake: ["바람이 멈춰도 작은 배 아래의 물결은 계속된다. 물속의 빛은 수면의 달과 다른 속도로 움직인다.", "Ripples persist beneath the boat even when the wind stops. The light below moves at a different pace from the moon's reflection."], // 호수 관찰
    tower: ["종의 가장자리는 닳았지만 매달린 고리는 온전하다. 바람이 지나갈 때마다 금속 안쪽이 아주 약하게 떤다.", "The bell's rim is worn, but its hanging loop is intact. Its inner metal trembles faintly whenever the wind passes."], // 종탑 관찰
    stairs: ["젖은 계단 가장자리로 뿌리가 난간처럼 이어진다. 아래에서 들려오는 울림 사이에 짧은 침묵이 반복된다.", "Roots line the wet steps like a handrail. Short silences repeat between the echoes rising from below."], // 계단 관찰
    archive: ["책장마다 빈 자리의 폭이 다르다. 남아 있는 기록은 제목보다 서로 이어지는 이름으로 구분되어 있다.", "The gaps on each shelf have different widths. The surviving records are linked by names rather than titles."], // 기록고 관찰
    heart: ["결정의 빛은 재촉하지 않는다. 종이를 가까이 대면 뿌리 사이로 번지던 울림이 조금씩 고르게 바뀐다.", "The crystal's light does not hurry you. When a page draws near, the echoes among the roots become more even."], // 심장 관찰
    truth: ["새벽 바람이 종이의 가장자리를 넘긴다. 숲에서 들리던 울림 대신 멀리 사람들의 생활 소리가 들려온다.", "The dawn breeze lifts a page's edge. Distant signs of daily life replace the echoes of the forest."], // 귀환 관찰
    retreat: ["경계의 돌 뒤로 숲길이 남아 있다. 바깥의 공기는 차갑지만 등불 가까이에는 작은 온기가 머문다.", "The forest path remains beyond the boundary stone. The outside air is cold, but a little warmth lingers beside the lantern."], // 후퇴 관찰
}; // 목록 종료

function choice(id: string, label: string, englishLabel: string, targetSceneId: string, actions: TextPlayAction[] = [], requiredItemId?: string): StoryChoice // 작품 선택지 생성
{ // 함수 시작
    return { id, label, englishLabel, targetSceneId, actions, ...(requiredItemId === undefined ? {} : { requiredItemId }) }; // 규칙과 표시 문구
} // 함수 종료

function scene(id: string, title: string, englishTitle: string, narration: string, englishNarration: string, image: string, objective: string, englishObjective: string, dialogue: string, englishDialogue: string, choices: StoryChoice[], endingId: string | null = null): StoryScene // 장면과 번역 생성
{ // 함수 시작
    return { // 장면 반환
        id, title, narration, objective, endingId, // 장면 기본 정보
        locationId: id, // 장면별 위치
        imagePath: `/images/text-play/moonlit/${image}.png`, // 제작 장면 그림
        dialogue: { speaker: "lyra", content: dialogue }, // 리라의 장면 대사
        observation: OBSERVATIONS[image][0], // 한국어 관찰 응답
        freeActions: [`${title}의 단서를 자세히 살핀다`, "리라에게 지금 느끼는 것을 묻는다"], // 장면별 관찰 추천
        choices, // 결정형 진행 선택지
        english: // 같은 장면의 영어판
        { // 번역 시작
            title: englishTitle, narration: englishNarration, objective: englishObjective, // 장면 표시 글자
            dialogue: { speaker: "lyra", content: englishDialogue }, // 영어 대사
            observation: OBSERVATIONS[image][1], // 영어 관찰 응답
            freeActions: [`Examine the clues in ${englishTitle}`, "Ask Lyra what she senses here"], // 영어 관찰 추천
            choices: Object.fromEntries(choices.map((entry) => [entry.id, entry.englishLabel])), // 영어 선택지
        }, // 번역 종료
    }; // 장면 종료
} // 함수 종료

const STORY: StoryScene[] = // 대표 작품의 전체 장면
[ // 작품 시작
    scene( // 첫 장면
        "forest-gate", "달빛 숲 입구", "Moonlit Forest Gate", // 장면 이름
        "은빛 안개 너머에서 낡은 등불이 희미하게 빛난다.", // 이전 저장과 같은 첫 서술
        "Beyond the silver mist, an old lantern glimmers faintly.", // 영어 서술
        "forest", "등불을 들고 기록관의 흔적을 찾아보세요.", "Take the lantern and find the archivist's trail.", // 그림과 목표
        "거기 누구인가요? 제 이름은 리라예요. 등불을 들어 주면, 당신에게 길을 보여 줄 수 있어요.", // 리라 대사
        "Is someone there? My name is Lyra. Lift the lantern, and I can show you the way.", // 영어 대사
        [choice("take-lantern", "달빛 등불을 든다", "Take the moon lantern", "moonlit-hall", [{ type: "add-item", itemId: "moon-lantern", quantity: 1 }]), choice("retreat", "숲 밖으로 후퇴한다", "Retreat out of the forest", "retreat-ending")], // 입구 선택
    ), // 첫 장면 종료
    scene( // 회랑
        "moonlit-hall", "폐허 회랑", "Ruined Hall", // 장면 이름
        "등불이 벽의 문양과 봉인된 서재로 이어지는 문을 드러낸다.", // 이전 저장과 같은 회랑 서술
        "The lantern reveals patterns on the wall and a door leading to the sealed study.", // 영어 서술
        "hall", "문양을 조사하거나 서재로 들어가세요.", "Examine the pattern or enter the study.", // 그림과 목표
        "사람들은 이 문을 닫으면 숲도 잠잠해질 거라 믿었어요. 하지만 목소리는 문 아래에서 계속 들려왔죠.", // 리라 대사
        "They thought closing this door would silence the forest. But the voices kept coming from beneath it.", // 영어 대사
        [choice("inspect-seal", "벽의 문양을 조사한다", "Examine the pattern on the wall", "sealed-study", [{ type: "change-stat", stat: "sanity", amount: -5 }, { type: "start-quest", questId: "voices-below" }]), choice("enter-study", "봉인된 서재로 간다", "Go to the sealed study", "sealed-study", [{ type: "start-quest", questId: "voices-below" }])], // 회랑 선택
    ), // 회랑 종료
    scene( // 서재
        "sealed-study", "봉인된 서재", "Sealed Study", // 장면 이름
        "리라가 남긴 기록은 숲 아래 목소리가 구조 신호였음을 보여 준다.", // 이전 저장과 같은 서재 서술
        "The records Lyra left behind show that the voices beneath the forest were a call for help.", // 영어 서술
        "study", "기록을 해독해 구조 신호의 출처를 찾으세요.", "Decode the records to trace the call for help.", // 그림과 목표
        "여기까지 적은 건 기억나요. 그런데 그다음 장이 없어요. 제가 왜 돌아오지 못했는지도 그곳에 있을 거예요.", // 리라 대사
        "I remember writing this far. The next page is missing. It may explain why I never came back.", // 영어 대사
        [choice("decode-records", "기록을 해독한다", "Decode the records", "caretaker-letter", [{ type: "add-item", itemId: "record-fragment", quantity: 1 }])], // 기록 획득
    ), // 서재 종료
    scene( // 편지
        "caretaker-letter", "기록관의 편지", "The Archivist's Letter", // 장면 이름
        "책등 사이에서 접힌 편지가 떨어진다. 누군가 남긴 마지막 문장은 공포가 아니라 부탁이었다. 등불의 불꽃이 두 갈래 길이 그려진 지도를 비춘다.", // 서술
        "A folded letter slips from between the books. Its final lines are a plea, not a warning. The lantern lights a map of two branching paths.", // 영어 서술
        "study", "편지의 지도를 따라 뿌리 갈림길로 가세요.", "Follow the letter's map to the root crossing.", // 그림과 목표
        "아래에 남은 사람을 데려오겠다고 약속했어요. 혼자 가지 않겠다는 약속은, 그때 하지 못했네요.", // 리라 대사
        "I promised to bring back whoever was still below. I wish I had also promised not to go alone.", // 영어 대사
        [choice("follow-map", "편지의 지도를 따라간다", "Follow the letter's map", "root-crossing")], // 지도 선택
    ), // 편지 종료
    scene( // 갈림길
        "root-crossing", "뿌리 갈림길", "Root Crossing", // 장면 이름
        "갈라진 나무뿌리가 서쪽 호수와 동쪽 종탑을 가리킨다. 호수에서는 같은 물결이 반복되고, 종탑에서는 소리 없는 종이 흔들린다. 두 길 모두 우물 아래 기록고로 이어진다.", // 서술
        "Split roots point west to a lake and east to a bell tower. The same ripple repeats on the water; a silent bell sways in the tower. Both paths lead to the archive beneath the well.", // 영어 서술
        "forest", "호수의 기억 또는 종탑의 신호를 조사하세요.", "Investigate the lake's memory or the tower's signal.", // 그림과 목표
        "물은 사람의 목소리를 기억하고, 종은 그 목소리가 갈 곳을 알려 줘요. 어느 쪽을 믿을지는 당신이 정해 주세요.", // 리라 대사
        "Water remembers a voice. The bell tells it where to go. You can choose which path we trust.", // 영어 대사
        [choice("follow-lake", "호수에 남은 기억을 따라간다", "Follow the memory at the lake", "mirror-lake"), choice("climb-tower", "종탑의 신호를 조사한다", "Investigate the bell tower", "bell-tower")], // 두 탐색 경로
    ), // 갈림길 종료
    scene( // 호수
        "mirror-lake", "거울 호수", "Mirror Lake", // 장면 이름
        "물이 당신이 아닌 오래전의 하늘을 비춘다. 빈 나룻배에서 흘러나온 은빛 실이 수면에 길을 긋는다. 그 끝에는 젖지 않은 발자국이 남아 있다.", // 서술
        "The water reflects a sky from long ago. A silver thread unwinds from an empty boat and draws a path across the surface, ending in footprints that never get wet.", // 영어 서술
        "lake", "수면의 흔적을 관찰해 기억을 확인하세요.", "Study the traces on the water.", // 그림과 목표
        "이 배를 기억해요. 빈 배를 보면서도 누군가 타고 있다고 생각했어요. 그게 첫 번째 신호였군요.", // 리라 대사
        "I remember this boat. It looked empty, yet I felt someone was aboard. That was the first signal.", // 영어 대사
        [choice("read-water", "수면에 남은 발자국을 읽는다", "Read the footprints on the water", "ferryman-memory")], // 호수 조사
    ), // 호수 종료
    scene( // 호수 기억
        "ferryman-memory", "물 위의 기억", "Memory on the Water", // 장면 이름
        "등불을 낮추자 은빛 실이 손목에 가볍게 감긴다. 물속 기록관들은 떠난 사람을 부르는 대신 자신들의 이름을 기억해 달라고 부탁하고 있었다.", // 서술
        "As you lower the lantern, silver thread curls lightly around your wrist. The lost archivists were not calling the departed back. They were asking for their names to be remembered.", // 영어 서술
        "lake", "은빛 실을 받아 우물의 계단으로 가세요.", "Take the silver thread to the well's stairway.", // 그림과 목표
        "목소리를 가두는 건 보호가 아니었어요. 잊히지 않게 해 달라는 말을, 제가 너무 늦게 알아들었네요.", // 리라 대사
        "Keeping a voice trapped was never protection. I understood their wish to be remembered far too late.", // 영어 대사
        [choice("take-thread", "은빛 실을 받아 계단으로 간다", "Take the silver thread and find the stairs", "sunken-stairs", [{ type: "add-item", itemId: "silver-thread", quantity: 1 }, { type: "trigger-event", eventId: "lake-memory" }])], // 호수 단서 획득
    ), // 호수 기억 종료
    scene( // 종탑
        "bell-tower", "무너진 종탑", "Fallen Bell Tower", // 장면 이름
        "휘어진 계단 끝에 금 간 종이 매달려 있다. 바람이 불어도 종은 울리지 않는다. 종추 아래 작은 열쇠가 같은 박자로 미세하게 떨린다.", // 서술
        "A cracked bell hangs above a twisted stair. Wind passes through without a sound. A small key beneath the clapper trembles to a steady rhythm.", // 영어 서술
        "tower", "종이 내지 못하는 마지막 소리를 찾아보세요.", "Find the final note the bell cannot sound.", // 그림과 목표
        "처음엔 고장 난 줄 알았어요. 이제 보니 아래에서 오는 대답을 기다리고 있었어요.", // 리라 대사
        "I thought it was broken. Now I see it was waiting for an answer from below.", // 영어 대사
        [choice("listen-bell", "종의 떨림에 귀를 기울인다", "Listen to the bell's vibration", "bell-echo")], // 종 조사
    ), // 종탑 종료
    scene( // 종탑 기억
        "bell-echo", "마지막 종소리", "The Last Bell Note", // 장면 이름
        "금속에 손을 대자 들리지 않던 울림이 손바닥으로 전해진다. 목소리는 구조 신호를 보냈고, 종은 그 신호를 마을에 전하려 했다. 당신은 작은 공명 열쇠를 집어 든다.", // 서술
        "Touching the metal, you feel the missing note through your palm. The voices sent a call for help, and the bell tried to carry it to the village. You lift the small resonance key.", // 영어 서술
        "tower", "공명 열쇠를 받아 우물의 계단으로 가세요.", "Take the resonance key to the well's stairway.", // 그림과 목표
        "숲이 우리를 겁주려던 게 아니었어요. 도와 달라는 말을, 우리가 경고라고 받아들였던 거예요.", // 리라 대사
        "The forest was never trying to frighten us. We mistook its call for help for a warning.", // 영어 대사
        [choice("take-key", "공명 열쇠를 들고 계단으로 간다", "Take the resonance key and find the stairs", "sunken-stairs", [{ type: "add-item", itemId: "resonance-key", quantity: 1 }, { type: "trigger-event", eventId: "tower-memory" }])], // 종탑 단서 획득
    ), // 종탑 기억 종료
    scene( // 계단
        "sunken-stairs", "잠긴 계단", "The Hidden Stairway", // 장면 이름
        "마른 우물 안쪽으로 내려가는 계단이 나타난다. 뿌리 사이의 불빛은 당신이 가진 단서에 응답한다. 아래에서는 여러 목소리가 한 문장을 번갈아 말한다.", // 서술
        "A stairway emerges inside the dry well. Light between the roots responds to the clue you carry. Below, several voices take turns speaking a single sentence.", // 영어 서술
        "stairs", "계단을 따라 기록고 문까지 내려가세요.", "Descend to the archive door.", // 그림과 목표
        "이번에는 당신의 발소리도 들려요. 더는 혼자 내려가는 게 아니라서, 조금 덜 무서워요.", // 리라 대사
        "This time I can hear your footsteps too. Going down feels less frightening when I am not alone.", // 영어 대사
        [choice("descend", "등불을 앞세워 내려간다", "Descend with the lantern", "archive-door")], // 계단 이동
    ), // 계단 종료
    scene( // 기록고 문
        "archive-door", "기록고의 문", "Archive Door", // 장면 이름
        "문에는 열쇠 구멍과 가느다란 틈이 나란히 있다. 틈 사이에서 목소리가 새어 나온다. 문을 부수기보다 신호를 돌려보내면 열릴 것 같다.", // 서술
        "A keyhole sits beside a narrow seam in the door. Voices slip through the gap. Returning their signal may open it without force.", // 영어 서술
        "archive", "가진 단서를 사용하거나 목소리에 답하세요.", "Use your clue, or answer the voices.", // 그림과 목표
        "열쇠는 잠금을 열고, 실은 끊어진 기억을 이어요. 아무것도 없더라도, 우리가 듣고 있다고 말해 줄 수 있어요.", // 리라 대사
        "The key opens a lock; the thread joins a memory. Even without either, we can tell them we are listening.", // 영어 대사
        [choice("use-key", "공명 열쇠로 문을 연다", "Open the door with the resonance key", "under-archive", [], "resonance-key"), choice("use-thread", "은빛 실로 끊어진 문양을 잇는다", "Join the broken pattern with silver thread", "under-archive", [], "silver-thread"), choice("answer-voices", "목소리에 듣고 있다고 답한다", "Tell the voices you are listening", "under-archive")], // 단서별 선택과 안전한 대체 경로
    ), // 기록고 문 종료
    scene( // 기록고
        "under-archive", "지하 기록고", "Underground Archive", // 장면 이름
        "책장들이 나무뿌리에 기대어 서 있다. 지워진 이름마다 빈 자리가 남았고, 리라의 마지막 장이 그 사이에 끼워져 있다. 당신의 등불이 기록을 한 줄씩 되살린다.", // 서술
        "Shelves lean against living roots. Every erased name has left a gap. Lyra's final page rests among them, and the lantern brings its lines back one by one.", // 영어 서술
        "archive", "사라진 마지막 장에서 리라의 기억을 확인하세요.", "Read the missing page of Lyra's memory.", // 그림과 목표
        "이건 제가 남긴 명단이에요. 구조를 기다리던 사람들… 마지막 줄에 제 이름도 있네요.", // 리라 대사
        "This is the list I wrote of those awaiting rescue. My own name is on the final line.", // 영어 대사
        [choice("read-last-page", "리라의 마지막 기록을 읽는다", "Read Lyra's final record", "lyra-memory")], // 기록 조사
    ), // 기록고 종료
    scene( // 리라 기억
        "lyra-memory", "리라의 기억", "Lyra's Memory", // 장면 이름
        "기록 속 리라는 무너진 길에서 돌아오지 못했다. 숲은 사람들의 마지막 기억을 지키려 했지만, 누구에게 전해야 할지는 알지 못했다. 희미한 목소리가 처음으로 당신의 이름을 묻는다.", // 서술
        "The record reveals that Lyra never escaped the fallen passage. The forest protected the last memories of the lost, but did not know whom to give them to. The faint voice asks your name for the first time.", // 영어 서술
        "archive", "기억을 지키던 숲의 심장으로 가세요.", "Find the forest heart that guarded these memories.", // 그림과 목표
        "돌아갈 몸이 없다는 걸 이제 알겠어요. 그래도 제 이야기가 누군가에게 닿을 수 있다면, 그걸 돌아간다고 불러도 될까요?", // 리라 대사
        "Now I know why I cannot return in person. If my story reaches someone, may I call that coming home?", // 영어 대사
        [choice("walk-with-lyra", "리라와 함께 숲의 심장으로 간다", "Walk with Lyra to the forest heart", "heart-root")], // 기억 동행
    ), // 리라 기억 종료
    scene( // 숲 심장
        "heart-root", "숲의 심장", "The Forest Heart", // 장면 이름
        "뿌리의 중심에서 작은 결정이 숨을 쉬듯 빛난다. 힘으로 봉인을 깨면 기억까지 사라질 수 있다. 당신은 등불을 가까이 대고 기록을 한 장씩 맞춘다.", // 서술
        "A small crystal glows like a slow heartbeat among the roots. Breaking the seal by force could destroy the memories too. You raise the lantern and align the pages carefully.", // 영어 서술
        "heart", "봉인을 해치지 않고 기록을 정리하세요.", "Arrange the records without damaging the seal.", // 그림과 목표
        "누구를 잊을지 정하지 말아 주세요. 끝까지 들을 수 있는 이름부터, 하나씩 읽어 주세요.", // 리라 대사
        "Please do not choose who should be forgotten. Read the names you can hear, one at a time.", // 영어 대사
        [choice("align-records", "흩어진 이름을 차례로 맞춘다", "Put the scattered names in order", "final-seal")], // 봉인 준비
    ), // 숲 심장 종료
    scene( // 마지막 선택
        "final-seal", "마지막 봉인", "The Final Seal", // 장면 이름
        "이름들이 제자리를 찾자 숲이 조용해진다. 이제 기록을 밖으로 가져가거나, 봉인을 지킨 채 돌아갈 수 있다. 어느 선택도 기억을 없애지는 않지만, 전할 사람은 당신뿐이다.", // 서술
        "As the names find their places, the forest falls quiet. You can carry the records outside, or leave the seal intact and return. Neither choice erases the memories, but only you can share them.", // 영어 서술
        "heart", "기록을 세상에 전할지 결정하세요.", "Decide whether to carry the records into the world.", // 그림과 목표
        "당신에게 약속을 강요하고 싶진 않아요. 다만 돌아간다면, 여기 누군가 있었다는 것만은 기억해 주세요.", // 리라 대사
        "I will not demand a promise. Whatever you choose, please remember that someone was here.", // 영어 대사
        [choice("carry-records", "기록을 밖으로 가져간다", "Carry the records outside", "record-return"), choice("keep-seal", "봉인을 지키고 돌아간다", "Leave the seal intact and return", "retreat-ending")], // 엔딩 분기
    ), // 마지막 선택 종료
    scene( // 귀환
        "record-return", "기록을 돌려주는 길", "The Records' Way Home", // 장면 이름
        "돌아오는 길은 더 이상 같은 자리로 이어지지 않는다. 등불의 빛이 옅어지는 대신 품에 안은 기록이 따뜻해진다. 숲 밖에서 첫 새소리가 들린다.", // 서술
        "The way back no longer turns in circles. As the lantern fades, the records in your arms grow warm. Beyond the forest, the first bird begins to sing.", // 영어 서술
        "truth", "숲 밖에서 기록을 읽어 약속을 마무리하세요.", "Read the records beyond the forest to finish your promise.", // 그림과 목표
        "제 목소리가 사라져도 놀라지 마세요. 이제 종이가 당신에게 같은 이야기를 들려줄 테니까요.", // 리라 대사
        "Do not be afraid when my voice fades. The pages will tell you the same story now.", // 영어 대사
        [choice("share-records", "사라진 이름들을 세상에 전한다", "Share the lost names with the world", "truth-ending", [{ type: "complete-quest", questId: "voices-below" }, { type: "trigger-event", eventId: "truth-revealed" }])], // 진실 완결
    ), // 귀환 종료
    scene( // 진실 엔딩
        "truth-ending", "기록의 진실", "The Truth of the Records", // 장면 이름
        "당신은 기록을 세상에 돌려주고 숲의 오래된 오해를 끝낸다. 사람들은 처음으로 사라진 이들의 이름을 부른다. 새벽빛 속에서 등불은 꺼지지만, 빈 서재의 창은 열려 있다.", // 엔딩 서술
        "You return the records to the world and end the forest's old misunderstanding. People speak the lost names for the first time. The lantern goes dark at dawn, but the empty study's window stands open.", // 영어 서술
        "truth", "기록을 전했습니다. 이야기가 끝났습니다.", "The records have been shared. Your story is complete.", // 그림과 목표
        "고마워요. 이제 제 이야기는, 당신이 기억하는 만큼 계속될 거예요.", // 마지막 대사
        "Thank you. My story will last for as long as you remember it.", // 영어 대사
        [], "truth-ending", // 진실 엔딩
    ), // 진실 엔딩 종료
    scene( // 귀환 엔딩
        "retreat-ending", "돌아가는 길", "The Way Back", // 장면 이름
        "당신은 숲을 떠났지만 희미한 목소리는 밤마다 다시 들려온다. 경계의 돌 위에 놓인 등불은 아직 따뜻하다. 오늘의 선택은 끝났지만, 돌아갈 길은 사라지지 않았다.", // 엔딩 서술
        "You leave the forest, but faint voices return each night. The lantern on the boundary stone is still warm. Today's choice is over, yet the way back has not disappeared.", // 영어 서술
        "retreat", "숲에서 돌아왔습니다. 다시 시작해 다른 선택을 살펴보세요.", "You have returned. Start over to explore another choice.", // 그림과 목표
        "멈추는 것도 선택이에요. 다음에 이 길을 찾게 된다면, 저는 당신의 발소리를 기억할게요.", // 마지막 대사
        "Stopping is a choice too. If you find this path again, I will remember your footsteps.", // 영어 대사
        [], "retreat-ending", // 귀환 엔딩
    ), // 귀환 엔딩 종료
]; // 작품 종료

export const MOONLIT_SCENES: TextPlayScene[] = STORY.map(({ english, ...entry }) => // 표시 언어와 진행 규칙 분리
{ // 변환 시작
    void english; // 별도 번역 필드 제외
    return { ...entry, choices: entry.choices.map(({ englishLabel, ...entryChoice }) => // 선택 규칙 변환
    { // 선택 변환 시작
        void englishLabel; // 별도 영어 문구 제외
        return entryChoice; // 선택 규칙 반환
    }) }; // 장면 반환
}); // 변환 종료
export const MOONLIT_ENGLISH_SCENES: Record<string, SceneText> = Object.fromEntries(STORY.map((entry) => [entry.id, entry.english])); // 장면별 영어판
