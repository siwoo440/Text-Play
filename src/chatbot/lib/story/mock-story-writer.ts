import type { Message, StoryCastMember } from "@chatbot/features/core/types"; // 도메인 타입
import { formatStoryLine, getMentionedCastMember, STORY_CONTINUE_TEXT, STORY_NARRATOR_LABEL } from "@chatbot/features/story/story-model"; // 스토리 형식

export interface StoryPromptContext // 스토리 응답 문맥(실제 LLM 연결 때 프롬프트로 사용)
{ // 구조 시작
    title: string; // 스토리 제목
    synopsis: string; // 줄거리·세계관
    userRole: string; // 사용자 역할
    cast: StoryCastMember[]; // 등장인물
} // 구조 종료

export interface StoryReplyInput // Mock 스토리 응답 입력
{ // 구조 시작
    story: StoryPromptContext; // 스토리 문맥
    messages: Message[]; // 지금까지의 메시지
    seed: number; // 결정 시드
} // 구조 종료

const narrations = // 내레이션 문장
[ // 목록 시작
    "잠시 정적이 흐르고, 모두의 시선이 한곳으로 모인다.", // 정적
    "어디선가 낮은 소리가 들려와 분위기가 조금 달라진다.", // 소리
    "작은 바람이 스치며 주변의 공기가 한층 가라앉는다.", // 바람
    "누군가 숨을 고르는 소리가 또렷하게 들린다.", // 숨소리
    "희미한 빛이 흔들리며 다음 장면을 예고한다.", // 빛
    "모두가 같은 곳을 바라보며 잠시 말을 고른다.", // 침묵
]; // 목록 종료

const continueNarrations = // 이야기 진행 내레이션
[ // 목록 시작
    "시간이 조금 흐르고, 장면이 천천히 다음으로 넘어간다.", // 시간 흐름
    "예상하지 못한 일이 벌어지며 이야기가 한 걸음 나아간다.", // 사건 발생
    "멀리서 들려온 신호에 모두가 동시에 고개를 든다.", // 신호
]; // 목록 종료

const characterLines = // 인물 대사
[ // 목록 시작
    "그 말, 조금 더 자세히 들려줄래?", // 질문
    "좋아, 그럼 내가 먼저 움직여 볼게.", // 행동
    "잠깐, 방금 그 소리 들었어?", // 경계
    "네가 와 줘서 다행이야. 혼자였으면 여기까지 못 왔을 거야.", // 안도
    "서두르지 말자. 단서는 생각보다 가까이 있을지도 몰라.", // 신중
    "그 선택, 나쁘지 않은데? 끝까지 같이 가 보자.", // 동의
    "솔직히 조금 무섭지만… 그래도 궁금해.", // 긴장
]; // 목록 종료

const addressedLines = // 지목받았을 때 대사
[ // 목록 시작
    "나한테 묻는 거야? 음… 내 생각엔 우리가 놓친 게 하나 있어.", // 단서
    "좋은 질문이야. 대답하기 전에 하나만 확인해도 될까?", // 확인
    "그렇게 물어봐 줘서 고마워. 사실 나도 같은 걸 생각하고 있었어.", // 공감
]; // 목록 종료

function hash(value: string): number // 문자열 해시
{ // 함수 시작
    return [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 7); // 해시 반환
} // 함수 종료

function pick<T>(items: readonly T[], key: number): T // 결정적 선택
{ // 함수 시작
    return items[key % items.length]; // 항목 반환
} // 함수 종료

export function composeStoryReply(input: StoryReplyInput): string // Mock 스토리 응답 만들기
{ // 함수 시작
    const { cast } = input.story; // 등장인물
    if (cast.length === 0) // 등장인물 부재 판정
    { // 조건 시작
        return formatStoryLine(STORY_NARRATOR_LABEL, pick(narrations, input.seed)); // 내레이션만 반환
    } // 조건 종료
    const lastUser = [...input.messages].reverse().find((message) => message.role === "user")?.content.trim() ?? ""; // 마지막 사용자 입력
    const continuing = lastUser === STORY_CONTINUE_TEXT; // 이야기 진행 판정
    const key = hash(`${input.story.title}|${lastUser}|${input.messages.length}|${input.seed}`); // 결정 키
    const mentioned = getMentionedCastMember(lastUser, cast); // 지목 인물
    const first = mentioned ?? pick(cast, key); // 먼저 말할 인물
    const lines = [formatStoryLine(STORY_NARRATOR_LABEL, pick(continuing ? continueNarrations : narrations, key >>> 2))]; // 내레이션
    lines.push(formatStoryLine(first.displayName, mentioned === null ? pick(characterLines, key >>> 4) : pick(addressedLines, key >>> 4))); // 첫 대사
    const others = cast.filter((member) => member.characterId !== first.characterId); // 다른 인물
    if (others.length > 0 && (continuing || (key >>> 6) % 2 === 0)) // 둘째 화자 판정
    { // 조건 시작
        const second = pick(others, key >>> 8); // 둘째 인물
        const reply = (key >>> 10) % 2 === 0 ? `${first.displayName}, 너는 어떻게 생각해?` : pick(characterLines, (key >>> 12) + 1); // 둘째 대사
        lines.push(formatStoryLine(second.displayName, reply)); // 둘째 대사 추가
    } // 조건 종료
    return lines.join("\n"); // 응답 반환
} // 함수 종료
