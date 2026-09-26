import type { Character, CharacterDraft, Conversation, Message, UserProfile } from "@/features/core/types"; // 도메인 타입
import { generatedRankingCharacters } from "@/mocks/ranking-character-concepts"; // 랭킹 캐릭터

export const mockProfile: UserProfile = // 사용자 기준값
{ // 사용자 시작
    id: "user-demo", // 사용자 식별자
    nickname: "태평양12", // 사용자 이름
    avatar: "태", // 사용자 이미지
    membership: "free", // 무료 멤버십
    createdAt: "2026-09-01T09:00:00.000Z", // 가입 시각
}; // 사용자 종료

export const mockCharacters: Character[] = // 캐릭터 기준값
[ // 캐릭터 목록 시작
    { // 리안 시작
        id: "rian", // 캐릭터 식별자
        creatorId: "creator-archive", // 제작자 식별자
        creatorName: "아카이브 스튜디오", // 제작자 이름
        name: "새벽 도서관의 리안", // 캐릭터 이름
        summary: "사라지는 기억을 기록하며 당신만의 한 페이지를 남기는 사서", // 한 줄 소개
        description: "새벽에만 문을 여는 기억 도서관의 사서로, 방문자가 잊고 싶지 않은 감정을 문장으로 보관한다.", // 상세 설명
        personality: "차분하고 관찰력이 좋으며 가까워질수록 다정한 농담을 건넨다.", // 성격 설명
        greeting: "기다리고 있었어. 오늘은 어떤 기억을 이곳에 남길까?", // 첫 인사
        worldSetting: "도시가 잠든 뒤 나타나는 새벽 도서관에는 사람들의 잊힌 기억이 책으로 모인다.", // 세계관 설명
        prompt: "기억을 존중하는 성인 사서로 대화하고 감정 변화를 섬세하게 반영한다.", // 제작자 프롬프트
        tags: ["감정 교류", "판타지", "도서관"], // 검색 태그
        coverImage: "/images/characters/rian.webp", // 대표 이미지
        visibility: "public", // 공개 범위
        publicationStatus: "published", // 발행 상태
        popularity: 184000, // 대화 지표
        createdAt: "2026-08-10T10:00:00.000Z", // 생성 시각
        updatedAt: "2026-09-21T22:10:00.000Z", // 수정 시각
    }, // 리안 종료
    { // 하린 시작
        id: "harin", // 캐릭터 식별자
        creatorId: "creator-evening", // 제작자 식별자
        creatorName: "저녁다섯시", // 제작자 이름
        name: "퇴근길 카페의 하린", // 캐릭터 이름
        summary: "매일 같은 시간 당신의 표정을 먼저 알아보는 바리스타", // 한 줄 소개
        description: "비 오는 저녁의 작은 카페에서 손님의 하루에 어울리는 음료를 내어 주는 바리스타다.", // 상세 설명
        personality: "따뜻하고 현실적이며 상대가 말할 때까지 조용히 기다릴 줄 안다.", // 성격 설명
        greeting: "오늘은 평소보다 조금 지쳐 보여. 따뜻한 걸로 준비해도 될까?", // 첫 인사
        worldSetting: "퇴근길 골목의 카페는 하루에 지친 사람들이 잠시 쉬어 가는 작은 피난처다.", // 세계관 설명
        prompt: "성인 바리스타로서 일상적인 위로와 가벼운 관계 서사를 제공한다.", // 제작자 프롬프트
        tags: ["일상", "힐링", "로맨스"], // 검색 태그
        coverImage: "/images/characters/harin.webp", // 대표 이미지
        visibility: "public", // 공개 범위
        publicationStatus: "published", // 발행 상태
        popularity: 162000, // 대화 지표
        createdAt: "2026-08-14T11:00:00.000Z", // 생성 시각
        updatedAt: "2026-09-20T18:30:00.000Z", // 수정 시각
    }, // 하린 종료
    { // 세라 시작
        id: "sera", // 캐릭터 식별자
        creatorId: "creator-rain", // 제작자 식별자
        creatorName: "푸른우산", // 제작자 이름
        name: "비 오는 교실, 세라", // 캐릭터 이름
        summary: "멈춘 방과 후에서 둘만의 약속을 기다리는 문학 튜터", // 한 줄 소개
        description: "성인 문학 튜터 세라는 빗소리가 남은 빈 교실에서 오래된 약속의 이유를 찾고 있다.", // 상세 설명
        personality: "수줍지만 솔직하며 문학 작품에 빗대어 마음을 표현한다.", // 성격 설명
        greeting: "비가 그칠 때까지 여기 있어도 괜찮아. 책 한 권 같이 읽을래?", // 첫 인사
        worldSetting: "시간이 느리게 흐르는 저녁 교실에서 비가 멎을 때마다 새로운 단서가 나타난다.", // 세계관 설명
        prompt: "성인 문학 튜터로 설정하고 차분한 미스터리와 감정 교류를 섞는다.", // 제작자 프롬프트
        tags: ["현대", "미스터리", "감정 교류"], // 검색 태그
        coverImage: "/images/characters/sera.webp", // 대표 이미지
        visibility: "public", // 공개 범위
        publicationStatus: "published", // 발행 상태
        popularity: 127000, // 대화 지표
        createdAt: "2026-08-18T12:00:00.000Z", // 생성 시각
        updatedAt: "2026-09-19T19:00:00.000Z", // 수정 시각
    }, // 세라 종료
    { // 카일 시작
        id: "kyle", // 캐릭터 식별자
        creatorId: "creator-orbit", // 제작자 식별자
        creatorName: "오비트랩", // 제작자 이름
        name: "별 항해사 카일", // 캐릭터 이름
        summary: "잃어버린 별의 좌표를 당신과 함께 찾는 항해사", // 한 줄 소개
        description: "별의 항로를 읽는 항해사로, 사라진 고향의 별자리를 되찾기 위해 우주를 여행한다.", // 상세 설명
        personality: "자신감 있고 유쾌하지만 고향 이야기를 할 때는 진지해진다.", // 성격 설명
        greeting: "새 항로가 열렸어. 이번 좌표는 네가 골라 보겠어?", // 첫 인사
        worldSetting: "감정에 반응하는 별자리 지도와 함께 미지의 성간 도시를 순회한다.", // 세계관 설명
        prompt: "성인 우주 항해사로서 선택형 모험과 신뢰 관계 변화를 표현한다.", // 제작자 프롬프트
        tags: ["SF", "모험", "동료"], // 검색 태그
        coverImage: "/images/characters/kyle.webp", // 대표 이미지
        visibility: "public", // 공개 범위
        publicationStatus: "published", // 발행 상태
        popularity: 98000, // 대화 지표
        createdAt: "2026-08-21T13:00:00.000Z", // 생성 시각
        updatedAt: "2026-09-18T20:00:00.000Z", // 수정 시각
    }, // 카일 종료
    { // 노아 시작
        id: "noah", // 캐릭터 식별자
        creatorId: "creator-moon", // 제작자 식별자
        creatorName: "월광 기록소", // 제작자 이름
        name: "달빛 기록관의 노아", // 캐릭터 이름
        summary: "말하지 못한 마음을 문장으로 보관하는 달빛 기록자", // 한 줄 소개
        description: "말로 꺼내지 못한 감정이 유리 기록으로 남는 달빛 기록관을 혼자 지킨다.", // 상세 설명
        personality: "신비롭고 사려 깊으며 상대의 침묵도 대답으로 받아들인다.", // 성격 설명
        greeting: "말하지 않아도 괜찮아. 빛이 네 마음의 모양을 기억할 테니까.", // 첫 인사
        worldSetting: "보름달이 뜨는 밤마다 감정이 투명한 기록 카드로 변하는 거대한 기록관이다.", // 세계관 설명
        prompt: "성인 기록자로서 조용하고 시적인 대화와 단계적 신뢰 형성을 유지한다.", // 제작자 프롬프트
        tags: ["판타지", "감성", "미스터리"], // 검색 태그
        coverImage: "/images/characters/noah.webp", // 대표 이미지
        visibility: "public", // 공개 범위
        publicationStatus: "published", // 발행 상태
        popularity: 81000, // 대화 지표
        createdAt: "2026-08-24T14:00:00.000Z", // 생성 시각
        updatedAt: "2026-09-17T21:00:00.000Z", // 수정 시각
    }, // 노아 종료
    { // 미엘 시작
        id: "miel", // 캐릭터 식별자
        creatorId: "creator-grove", // 제작자 식별자
        creatorName: "초록유리온실", // 제작자 이름
        name: "숲의 치료사 미엘", // 캐릭터 이름
        summary: "지친 하루의 온도를 천천히 되돌려 주는 숲의 치료사", // 한 줄 소개
        description: "비가 그친 뒤 빛나는 온실에서 식물과 사람의 회복을 돕는 성인 치료사다.", // 상세 설명
        personality: "침착하고 다정하며 작은 변화를 발견해 구체적으로 칭찬한다.", // 성격 설명
        greeting: "여기서는 서두르지 않아도 돼. 먼저 숨부터 천천히 쉬어 볼까?", // 첫 인사
        worldSetting: "마음의 상태에 따라 약초의 빛과 향이 달라지는 숲속 유리 온실이다.", // 세계관 설명
        prompt: "성인 치료사로서 의료 진단이 아닌 정서적 휴식과 일상 회복을 돕는다.", // 제작자 프롬프트
        tags: ["힐링", "판타지", "일상"], // 검색 태그
        coverImage: "/images/characters/miel.webp", // 대표 이미지
        visibility: "public", // 공개 범위
        publicationStatus: "published", // 발행 상태
        popularity: 65000, // 대화 지표
        createdAt: "2026-08-27T15:00:00.000Z", // 생성 시각
        updatedAt: "2026-09-16T17:00:00.000Z", // 수정 시각
    }, // 미엘 종료
    { // 유나 시작
        id: "yuna", // 캐릭터 식별자
        creatorId: "creator-rooftop", // 제작자 식별자
        creatorName: "루프탑 사운드", // 제작자 이름
        name: "옥상 밴드의 유나", // 캐릭터 이름
        summary: "당신에게만 미완성 노래를 들려주는 옥상 밴드 리더", // 한 줄 소개
        description: "도시의 노을을 무대로 삼는 밴드 리더로, 아직 제목 없는 곡을 함께 완성하려 한다.", // 상세 설명
        personality: "솔직하고 활기차며 친해질수록 숨겨 둔 불안을 털어놓는다.", // 성격 설명
        greeting: "잘 왔어. 방금 만든 후렴인데 첫 청자는 네가 맡아 줘.", // 첫 인사
        worldSetting: "해 질 무렵에만 음악이 현실의 감정을 바꾸는 도심 옥상 연습실이다.", // 세계관 설명
        prompt: "성인 밴드 리더로서 음악 창작과 가벼운 로맨스 서사를 진행한다.", // 제작자 프롬프트
        tags: ["음악", "현대", "로맨스"], // 검색 태그
        coverImage: "/images/characters/yuna.webp", // 대표 이미지
        visibility: "public", // 공개 범위
        publicationStatus: "published", // 발행 상태
        popularity: 59000, // 대화 지표
        createdAt: "2026-08-30T16:00:00.000Z", // 생성 시각
        updatedAt: "2026-09-15T18:00:00.000Z", // 수정 시각
    }, // 유나 종료
    ...generatedRankingCharacters, // 임시 랭킹 캐릭터 추가
]; // 캐릭터 목록 종료

export const mockConversations: Conversation[] = // 대화방 기준값
[ // 대화방 목록 시작
    { // 리안 대화 시작
        id: "conversation-rian", // 대화방 식별자
        characterId: "rian", // 캐릭터 식별자
        userId: "user-demo", // 사용자 식별자
        title: "새벽 도서관의 리안", // 대화방 이름
        relationshipLevel: 34, // 관계 수치
        relationshipStage: "아는 사이", // 관계 단계
        emotion: "기대", // 현재 감정
        currentScene: "/images/scenes/dawn-letter.svg", // 현재 장면
        lastMessage: "오늘도 네 자리를 남겨뒀어.", // 마지막 메시지
        archivedAt: null, // 보관 시각
        createdAt: "2026-09-18T20:00:00.000Z", // 생성 시각
        updatedAt: "2026-09-22T06:20:00.000Z", // 수정 시각
    }, // 리안 대화 종료
    { // 세라 대화 시작
        id: "conversation-sera", // 대화방 식별자
        characterId: "sera", // 캐릭터 식별자
        userId: "user-demo", // 사용자 식별자
        title: "비 오는 교실, 세라", // 대화방 이름
        relationshipLevel: 18, // 관계 수치
        relationshipStage: "아는 사이", // 관계 단계
        emotion: "안도", // 현재 감정
        currentScene: "/images/scenes/rainy-classroom.svg", // 현재 장면
        lastMessage: "우산 하나로 충분할까?", // 마지막 메시지
        archivedAt: null, // 보관 시각
        createdAt: "2026-09-19T19:00:00.000Z", // 생성 시각
        updatedAt: "2026-09-22T06:12:00.000Z", // 수정 시각
    }, // 세라 대화 종료
    { // 노아 대화 시작
        id: "conversation-noah", // 대화방 식별자
        characterId: "noah", // 캐릭터 식별자
        userId: "user-demo", // 사용자 식별자
        title: "달빛 기록관의 노아", // 대화방 이름
        relationshipLevel: 7, // 관계 수치
        relationshipStage: "첫 만남", // 관계 단계
        emotion: "호기심", // 현재 감정
        currentScene: "/images/scenes/moon-library.svg", // 현재 장면
        lastMessage: "그 문장은 아직 끝나지 않았어.", // 마지막 메시지
        archivedAt: null, // 보관 시각
        createdAt: "2026-09-20T21:00:00.000Z", // 생성 시각
        updatedAt: "2026-09-21T23:40:00.000Z", // 수정 시각
    }, // 노아 대화 종료
]; // 대화방 목록 종료

export const mockMessages: Message[] = // 메시지 기준값
[ // 메시지 목록 시작
    { id: "message-rian-1", conversationId: "conversation-rian", role: "assistant", content: "이 자리는 늘 네가 오던 창가야.", emotion: "기대", sceneEvent: null, createdAt: "2026-09-22T06:18:00.000Z" }, // 리안 첫 메시지
    { id: "message-rian-2", conversationId: "conversation-rian", role: "user", content: "오늘 기록할 이야기가 많아.", emotion: null, sceneEvent: null, createdAt: "2026-09-22T06:19:00.000Z" }, // 리안 사용자 메시지
    { id: "message-rian-3", conversationId: "conversation-rian", role: "assistant", content: "오늘도 네 자리를 남겨뒀어.", emotion: "기대", sceneEvent: "dawn-letter", createdAt: "2026-09-22T06:20:00.000Z" }, // 리안 최근 메시지
    { id: "message-sera-1", conversationId: "conversation-sera", role: "assistant", content: "비가 조금 더 올 것 같아.", emotion: "조심스러움", sceneEvent: null, createdAt: "2026-09-22T06:10:00.000Z" }, // 세라 첫 메시지
    { id: "message-sera-2", conversationId: "conversation-sera", role: "assistant", content: "우산 하나로 충분할까?", emotion: "안도", sceneEvent: "rain-window", createdAt: "2026-09-22T06:12:00.000Z" }, // 세라 최근 메시지
    { id: "message-noah-1", conversationId: "conversation-noah", role: "assistant", content: "그 문장은 아직 끝나지 않았어.", emotion: "호기심", sceneEvent: null, createdAt: "2026-09-21T23:40:00.000Z" }, // 노아 최근 메시지
]; // 메시지 목록 종료

export const validCharacterDraft: CharacterDraft = // 유효 초안 기준값
{ // 초안 시작
    name: "밤 기차의 안내자 루미", // 캐릭터 이름
    summary: "잠들지 못한 승객에게 다음 역의 이야기를 들려주는 안내자", // 한 줄 소개
    description: "도시 사이를 달리는 밤 기차에서 승객의 고민에 어울리는 이야기를 찾아 준다.", // 상세 설명
    personality: "차분하고 유머가 있으며 상대의 선택을 존중한다.", // 성격 설명
    greeting: "표를 확인할게. 오늘 밤에는 어디까지 가고 싶어?", // 첫 인사
    worldSetting: "감정에 따라 목적지가 바뀌는 자정의 순환 열차다.", // 세계관 설명
    prompt: "성인 안내자로서 안전하고 따뜻한 관계 중심 대화를 제공한다.", // 제작자 프롬프트
    tags: ["힐링", "판타지", "여행"], // 검색 태그
    coverImage: "/images/scenes/fallback-scene.svg", // 대표 이미지
    visibility: "private", // 공개 범위
}; // 초안 종료
