// 앱 데이터를 조각으로 나누기: 서버에 올릴 때 통째로 보내지 않고, 바뀐 조각만 보내려고 나눈다. 조각은 기본 정보(core), 작품(works), 그림(images), 대화마다 하나(c:<대화 식별자>)다.
export const PART_FORMAT = "mv-parts-2"; // 조각 목록의 형식 이름(예전에 통째로 올린 저장본과 구별)
export const WHOLE_PART = "all"; // 나눌 수 없는 내용을 통째로 두는 조각 이름
const CONVERSATION_PREFIX = "c:"; // 대화 조각 이름의 앞부분

type Json = Record<string, unknown>; // JSON 객체
interface ConversationPart // 대화 조각의 내용
{ // 구조 시작
    conversationVersions: unknown[]; // 그 대화의 버전
    messages: unknown[]; // 그 대화의 메시지
} // 구조 종료

function isRecord(value: unknown): value is Json // 객체인지
{ // 함수 시작
    return typeof value === "object" && value !== null && !Array.isArray(value); // 객체 판정
} // 함수 종료

function conversationIdOf(item: unknown): string // 항목이 속한 대화(없으면 빈 글)
{ // 함수 시작
    return isRecord(item) && typeof item.conversationId === "string" ? item.conversationId : ""; // 대화 식별자
} // 함수 종료

export function splitState(stateJson: string): Record<string, string> // 앱 데이터(JSON 글)를 조각으로 나누기(조각 이름 → 조각 내용. 앱 데이터 모양이 아니면 통째로 한 조각)
{ // 함수 시작
    let state: unknown; // 해석한 값
    try // 해석 시도
    { // 시도 시작
        state = JSON.parse(stateJson); // 해석
    } // 시도 종료
    catch // JSON이 아님
    { // 실패 시작
        return { [WHOLE_PART]: stateJson }; // 통째로
    } // 실패 종료
    if (!isRecord(state) || !Array.isArray(state.conversations) || !Array.isArray(state.conversationVersions) || !Array.isArray(state.messages) || !Array.isArray(state.characters) || !Array.isArray(state.stories) || !Array.isArray(state.images)) // 앱 데이터 모양이 아님
    { // 조건 시작
        return { [WHOLE_PART]: stateJson }; // 통째로
    } // 조건 종료
    const conversations = new Map<string, ConversationPart>(); // 대화별 내용
    const partOf = (id: string): ConversationPart => // 그 대화의 조각(없으면 만듦)
    { // 함수 시작
        const found = conversations.get(id) ?? { conversationVersions: [], messages: [] }; // 조각
        conversations.set(id, found); // 보관
        return found; // 조각 반환
    }; // 함수 종료
    state.conversations.forEach((conversation) => partOf(isRecord(conversation) && typeof conversation.id === "string" ? conversation.id : "")); // 대화 목록의 대화마다 조각 하나(내용이 비어도 만듦)
    state.conversationVersions.forEach((version) => partOf(conversationIdOf(version)).conversationVersions.push(version)); // 버전을 대화별로(목록에 없는 대화도 잃지 않음)
    state.messages.forEach((message) => partOf(conversationIdOf(message)).messages.push(message)); // 메시지를 대화별로
    const parts: Record<string, string> = { // 조각
        core: JSON.stringify({ ...state, characters: [], stories: [], images: [], conversationVersions: [], messages: [] }), // 기본 정보(큰 목록은 비움. 항목 순서는 그대로)
        works: JSON.stringify({ characters: state.characters, stories: state.stories }), // 작품
        images: JSON.stringify({ images: state.images }), // 그림
    }; // 조각 종료
    conversations.forEach((part, id) => { parts[`${CONVERSATION_PREFIX}${id}`] = JSON.stringify(part); }); // 대화 조각
    return parts; // 조각 반환
} // 함수 종료

export function mergeParts(parts: Record<string, string>): string // 조각을 앱 데이터(JSON 글)로 합치기(splitState의 반대)
{ // 함수 시작
    if (parts[WHOLE_PART] !== undefined) // 통째로 둔 내용
    { // 조건 시작
        return parts[WHOLE_PART]; // 그대로
    } // 조건 종료
    const core = JSON.parse(parts.core) as Json; // 기본 정보
    const works = JSON.parse(parts.works ?? "{}") as Json; // 작품
    const images = JSON.parse(parts.images ?? "{}") as Json; // 그림
    const listed = (Array.isArray(core.conversations) ? core.conversations : []).map((conversation) => `${CONVERSATION_PREFIX}${isRecord(conversation) && typeof conversation.id === "string" ? conversation.id : ""}`); // 대화 목록 순서의 조각 이름
    const others = Object.keys(parts).filter((name) => name.startsWith(CONVERSATION_PREFIX) && !listed.includes(name)).sort(); // 목록에 없는 대화의 조각(이름순)
    const ordered = [...new Set(listed), ...others].flatMap((name) => parts[name] === undefined ? [] : [JSON.parse(parts[name]) as Partial<ConversationPart>]); // 합칠 순서의 대화 조각
    core.characters = Array.isArray(works.characters) ? works.characters : []; // 캐릭터
    core.stories = Array.isArray(works.stories) ? works.stories : []; // 스토리
    core.images = Array.isArray(images.images) ? images.images : []; // 그림
    core.conversationVersions = ordered.flatMap((part) => part.conversationVersions ?? []); // 대화 버전(대화 순서대로)
    core.messages = ordered.flatMap((part) => part.messages ?? []); // 메시지(대화 순서대로)
    return JSON.stringify(core); // 앱 데이터 반환
} // 함수 종료

export async function hashBody(body: string): Promise<string> // 조각 내용의 지문(SHA-256. 같은 내용이면 같은 값이라 서버에 이미 있는지 가리는 데 씀)
{ // 함수 시작
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body))); // 지문 계산
    return btoa(String.fromCharCode(...digest)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); // 주소에 넣을 수 있는 글자로
} // 함수 종료

export function stringifyManifest(parts: Record<string, string>): string // 조각 목록(조각 이름 → 지문)을 글로
{ // 함수 시작
    return JSON.stringify({ format: PART_FORMAT, parts }); // 형식 이름과 목록
} // 함수 종료

export function parseManifest(text: string): Record<string, string> | null // 글을 조각 목록으로(목록이 아니면 없음. 예전에 통째로 올린 앱 데이터가 여기에 해당)
{ // 함수 시작
    try // 해석 시도
    { // 시도 시작
        const value = JSON.parse(text) as unknown; // 해석
        if (!isRecord(value) || value.format !== PART_FORMAT || !isRecord(value.parts) || !Object.values(value.parts).every((hash) => typeof hash === "string" && hash.length > 0)) // 목록 모양이 아님
        { // 조건 시작
            return null; // 없음
        } // 조건 종료
        return value.parts as Record<string, string>; // 조각 목록
    } // 시도 종료
    catch // JSON이 아님
    { // 실패 시작
        return null; // 없음
    } // 실패 종료
} // 함수 종료
