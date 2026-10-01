import type { Story } from "@chatbot/features/core/types"; // 스토리 타입

export const mockStories: Story[] = // 기본 예시 스토리
[ // 목록 시작
    { // 여러 인물 스토리 시작
        id: "story-moonlit-archive", // 스토리 식별자
        creatorId: "creator-mateverse-story", // 제작자 식별자
        creatorName: "메이트버스 스토리 연구소", // 제작자 이름
        title: "비 그친 밤의 기록관", // 제목
        summary: "사라진 마지막 문장을 찾아 세 사람과 함께 밤의 기록관을 뒤진다.", // 한 줄 소개
        synopsis: "비가 그친 밤, 학교 뒤편의 오래된 기록관에는 사람들이 잊고 싶지 않은 감정이 문장으로 보관되어 있다. 오늘 밤 그중 한 권에서 마지막 문장이 사라졌다. 사서 리안, 문학 튜터 세라, 달빛 기록자 노아가 새로 온 당신과 함께 그 문장을 찾아 나선다.", // 줄거리
        opening: "빗물이 마르지 않은 창틀 너머로 달빛이 번진다. 기록관 중앙 책상 위, 펼쳐진 책의 마지막 페이지가 하얗게 비어 있다.", // 시작 장면
        userRole: "오늘 처음 기록관 문을 연 전학생", // 사용자 역할
        cast: // 등장인물
        [ // 등장인물 시작
            { characterId: "rian", displayName: "리안", role: "기록관의 사서. 사라진 문장을 가장 먼저 알아챘다.", firstLine: "왔구나. 마침 손이 하나 더 필요했어." }, // 리안
            { characterId: "sera", displayName: "세라", role: "방과 후 문학 튜터. 문장의 결을 읽는 데 능하다.", firstLine: "이 페이지, 누가 일부러 지운 것 같아." }, // 세라
            { characterId: "noah", displayName: "노아", role: "달빛 기록자. 말하지 못한 마음을 기록해 왔다.", firstLine: "…달이 지기 전에 찾아야 해." }, // 노아
        ], // 등장인물 종료
        tags: ["미스터리", "판타지", "도서관"], // 태그
        coverImage: "/images/scenes/moon-library.svg", // 대표 이미지
        visibility: "public", // 공개 범위
        contentRating: "teen", // 이용 등급(세라 15세 기준)
        publicationStatus: "published", // 발행 상태
        popularity: 52000, // 이용 지표
        createdAt: "2026-09-25T00:00:00.000Z", // 생성 시각
        updatedAt: "2026-09-28T00:00:00.000Z", // 수정 시각
    }, // 여러 인물 스토리 종료
    { // 두 인물 스토리 시작
        id: "story-closing-cafe", // 스토리 식별자
        creatorId: "creator-mateverse-story", // 제작자 식별자
        creatorName: "메이트버스 스토리 연구소", // 제작자 이름
        title: "마감 10분 전, 비 오는 카페", // 제목
        summary: "셔터를 내리려던 순간, 비에 젖은 밴드 리더가 문을 연다.", // 한 줄 소개
        synopsis: "골목 끝 작은 카페는 매일 밤 10시에 문을 닫는다. 단골인 당신이 마지막 잔을 비우던 그때, 옥상 밴드의 리더 유나가 젖은 기타를 안고 뛰어 들어온다. 바리스타 하린은 셔터를 다시 올릴지 고민한다.", // 줄거리
        opening: "마감 10분 전, 셔터를 반쯤 내린 카페 안으로 빗소리가 스며든다. 그때 문에 달린 종이 다시 울린다.", // 시작 장면
        userRole: "카페의 오랜 단골손님", // 사용자 역할
        cast: // 등장인물
        [ // 등장인물 시작
            { characterId: "harin", displayName: "하린", role: "카페 주인이자 바리스타. 손님의 표정을 먼저 읽는다.", firstLine: "어서 와요. 마침 마지막 한 잔이 남았어요." }, // 하린
            { characterId: "yuna", displayName: "유나", role: "옥상 밴드 리더. 비에 젖은 기타를 지키려고 뛰어 들어왔다.", firstLine: "잠깐만 비 좀 피해도 될까? 기타가 젖으면 안 되거든." }, // 유나
        ], // 등장인물 종료
        tags: ["힐링", "현대", "음악"], // 태그
        coverImage: "/images/scenes/rainy-classroom.svg", // 대표 이미지
        visibility: "public", // 공개 범위
        contentRating: "all", // 이용 등급
        publicationStatus: "published", // 발행 상태
        popularity: 41000, // 이용 지표
        createdAt: "2026-09-26T00:00:00.000Z", // 생성 시각
        updatedAt: "2026-09-29T00:00:00.000Z", // 수정 시각
    }, // 두 인물 스토리 종료
    { // 한 인물 스토리 시작
        id: "story-star-signal", // 스토리 식별자
        creatorId: "creator-mateverse-story", // 제작자 식별자
        creatorName: "메이트버스 스토리 연구소", // 제작자 이름
        title: "별빛 구조 신호", // 제목
        summary: "잡음 섞인 구조 신호를 따라 항해사 카일과 미지의 궤도로 향한다.", // 한 줄 소개
        synopsis: "낡은 탐사선의 부조종사가 된 당신. 지도에 없는 궤도에서 반복되는 구조 신호가 들려온다. 별 항해사 카일은 위험을 알면서도 신호를 따라가기로 한다. 한 사람과 함께 펼치는 상황극이다.", // 줄거리
        opening: "경보등이 붉게 깜박이는 조종실. 잡음 섞인 구조 신호가 세 번째로 반복된다.", // 시작 장면
        userRole: "카일의 새 부조종사", // 사용자 역할
        cast: // 등장인물
        [ // 등장인물 시작
            { characterId: "kyle", displayName: "카일", role: "구조 신호를 쫓는 별 항해사.", firstLine: "신호가 또 들렸어. 이번엔 네 좌석 쪽 스피커에서." }, // 카일
        ], // 등장인물 종료
        tags: ["SF", "모험"], // 태그
        coverImage: "/images/scenes/dawn-letter.svg", // 대표 이미지
        visibility: "public", // 공개 범위
        contentRating: "all", // 이용 등급
        publicationStatus: "published", // 발행 상태
        popularity: 28000, // 이용 지표
        createdAt: "2026-09-27T00:00:00.000Z", // 생성 시각
        updatedAt: "2026-09-30T00:00:00.000Z", // 수정 시각
    }, // 한 인물 스토리 종료
]; // 목록 종료
