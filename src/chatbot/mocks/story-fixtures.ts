import { withWorkDefaults, type WorkExtras } from "@chatbot/features/core/defaults"; // 기본값 도우미
import type { Story } from "@chatbot/features/core/types"; // 스토리 타입

type BaseStory = Omit<Story, keyof WorkExtras>; // 추가 필드 전 스토리

const baseStories: BaseStory[] = // 기본 예시 스토리(추가 필드 전)
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
    createStudioStory( // 네 인물 코미디 스토리
    { // 내용 시작
        id: "story-monster-hotel", // 스토리 식별자
        title: "괴물 호텔의 열세 번째 손님", // 제목
        summary: "안개 낀 호텔에 예약 명부에 없는 손님이 도착했다. 정체를 밝히기 전에 아침이 온다.", // 한 줄 소개
        synopsis: "이종족만 묵는 안개 호텔에는 방이 딱 열두 개뿐이다. 그런데 오늘 밤 열세 번째 열쇠가 프런트에 놓였다. 컨시어지 오스카, 고양이 극장 연출가 미나, 마법 플로리스트 로제, 서점 주인 벨라가 손님의 정체와 사라진 방을 함께 찾는다.", // 줄거리
        opening: "자정을 알리는 괘종시계가 열세 번 울린다. 프런트 위 은쟁반에 처음 보는 열쇠 하나가 놓여 있다.", // 시작 장면
        userRole: "오늘 처음 출근한 야간 벨보이", // 사용자 역할
        cast: // 등장인물
        [ // 등장인물 시작
            { characterId: "rank-028", displayName: "오스카", role: "호텔 컨시어지. 열두 개의 방 열쇠를 외우고 있다.", firstLine: "신입, 그 열쇠 만지지 마. 우리 호텔엔 13호실이 없거든." }, // 오스카
            { characterId: "rank-025", displayName: "미나", role: "로비 극장의 고양이 연출가. 모든 소동을 공연으로 만든다.", firstLine: "어머, 오늘 밤 공연 제목이 정해졌네." }, // 미나
            { characterId: "rank-016", displayName: "로제", role: "온실 담당 플로리스트. 꽃으로 손님의 기분을 읽는다.", firstLine: "로비 장미가 전부 고개를 돌렸어. 누가 들어온 거야." }, // 로제
            { characterId: "rank-021", displayName: "벨라", role: "호텔 지하 서점 주인. 투숙객 명부를 관리한다.", firstLine: "명부에 잉크가 저절로 번지고 있어요. 이름 하나가 새로 쓰이는 중이에요." }, // 벨라
        ], // 등장인물 종료
        tags: ["판타지", "코미디", "호텔"], // 태그
        coverImage: "/images/characters/rank-028.webp", // 대표 이미지
        contentRating: "all", // 이용 등급
        popularity: 46000, // 이용 지표
        createdAt: "2026-09-20T00:00:00.000Z", // 생성 시각
    }), // 네 인물 코미디 스토리 종료
    createStudioStory( // 세 인물 힐링 스토리
    { // 내용 시작
        id: "story-dawn-star-train", // 스토리 식별자
        title: "새벽 열차는 별 사이를 달린다", // 제목
        summary: "잠들지 못한 밤, 별 사이를 달리는 열차에 올라 세 사람과 종착역까지 간다.", // 한 줄 소개
        synopsis: "새벽 세 시, 잠들지 못한 사람에게만 보이는 열차가 있다. 차장 유리는 승객의 마음이 가벼워질 때까지 열차를 멈추지 않는다. 사막 별 관측자 아샤와 우주 고래 수의사 은하가 같은 칸에 탔다. 종착역에 닿기 전에 당신이 내려놓을 짐은 무엇일까.", // 줄거리
        opening: "창밖으로 은하수가 강물처럼 흐른다. 승차권 펀치 소리가 조용한 객실에 또각, 울린다.", // 시작 장면
        userRole: "잠들지 못해 열차에 오른 승객", // 사용자 역할
        cast: // 등장인물
        [ // 등장인물 시작
            { characterId: "rank-029", displayName: "유리", role: "새벽 열차 차장. 승객의 표정으로 목적지를 안다.", firstLine: "승차권 보여 주세요. …아, 목적지가 아직 비어 있네요." }, // 유리
            { characterId: "rank-019", displayName: "아샤", role: "사막 별 관측자. 별자리로 사람의 길을 읽는다.", firstLine: "여기 앉아. 지금 지나는 별자리가 네 별자리야." }, // 아샤
            { characterId: "rank-042", displayName: "은하", role: "우주 고래 수의사. 다친 별고래를 돌보러 가는 길이다.", firstLine: "쉿, 창밖 봐. 별고래가 따라오고 있어." }, // 은하
        ], // 등장인물 종료
        tags: ["힐링", "여행", "판타지"], // 태그
        coverImage: "/images/characters/rank-029.webp", // 대표 이미지
        contentRating: "all", // 이용 등급
        popularity: 44000, // 이용 지표
        createdAt: "2026-09-21T00:00:00.000Z", // 생성 시각
    }), // 세 인물 힐링 스토리 종료
    createStudioStory( // 세 인물 현대 스토리
    { // 내용 시작
        id: "story-rooftop-radio", // 스토리 식별자
        title: "옥상 라디오, 마지막 사연", // 제목
        summary: "폐국을 앞둔 심야 라디오의 마지막 방송. 도착한 마지막 사연의 주인을 찾아야 한다.", // 한 줄 소개
        synopsis: "옥상 라디오 부스에서 7년을 이어 온 심야 방송이 오늘 끝난다. 마지막 곡을 틀기 직전, 보낸 사람 이름이 없는 사연 하나가 도착한다. 진행자 도윤, 옥상 밴드 리더 유나, 레코드점 주인 현서와 함께 방송이 끝나기 전에 사연의 주인을 찾는다.", // 줄거리
        opening: "ON AIR 불빛이 깜박인다. 마지막 방송까지 남은 시간은 47분, 책상 위에는 이름 없는 엽서 한 장이 놓여 있다.", // 시작 장면
        userRole: "라디오 부스의 막내 작가", // 사용자 역할
        cast: // 등장인물
        [ // 등장인물 시작
            { characterId: "rank-009", displayName: "도윤", role: "심야 라디오 진행자. 마지막 방송을 덤덤하게 준비한다.", firstLine: "작가님, 이 엽서… 오늘 방송에서 읽어도 될까요?" }, // 도윤
            { characterId: "yuna", displayName: "유나", role: "옥상 밴드 리더. 마지막 곡을 라이브로 부르러 왔다.", firstLine: "마지막 곡은 내가 부를게. 대신 사연 주인도 꼭 듣게 해 줘." }, // 유나
            { characterId: "rank-037", displayName: "현서", role: "골목 레코드점 주인. 방송 곡을 7년째 골라 왔다.", firstLine: "이 글씨, 어디서 봤더라. 우리 가게 단골 같은데." }, // 현서
        ], // 등장인물 종료
        tags: ["현대", "음악", "힐링"], // 태그
        coverImage: "/images/characters/rank-009.webp", // 대표 이미지
        contentRating: "all", // 이용 등급
        popularity: 39000, // 이용 지표
        createdAt: "2026-09-22T00:00:00.000Z", // 생성 시각
    }), // 세 인물 현대 스토리 종료
    createStudioStory( // 네 인물 미스터리 스토리
    { // 내용 시작
        id: "story-stopped-clock-museum", // 스토리 식별자
        title: "멈춘 시계 박물관의 도난 사건", // 제목
        summary: "모든 시계가 멈춘 박물관에서 '어제'가 담긴 모래시계가 사라졌다.", // 한 줄 소개
        synopsis: "시간을 전시하는 박물관에서 과거를 비추는 수정 모래시계가 도난당했다. 그 순간부터 박물관 안 시계가 전부 멈췄다. 큐레이터 세린, 왕실 시계공 에드윈, 모래시계 연금술사 루카, 문장을 읽는 튜터 세라가 용의자이자 조사관이다.", // 줄거리
        opening: "초침이 모두 같은 자리에 멈춰 있다. 빈 진열장 유리에는 손가락 자국 대신 모래 몇 알이 붙어 있다.", // 시작 장면
        userRole: "보험 회사에서 파견된 조사원", // 사용자 역할
        cast: // 등장인물
        [ // 등장인물 시작
            { characterId: "rank-027", displayName: "세린", role: "시간 박물관 큐레이터. 도난 직전 마지막으로 진열장을 확인했다.", firstLine: "조사원님, 시계가 멈춘 시각부터 말씀드릴게요. 오후 4시 44분이에요." }, // 세린
            { characterId: "rank-014", displayName: "에드윈", role: "왕실 시계공. 멈춘 시계를 다시 움직일 수 있는 유일한 사람.", firstLine: "시계를 다시 돌리면 범인의 흔적도 사라집니다. 순서를 정하시죠." }, // 에드윈
            { characterId: "rank-032", displayName: "루카", role: "모래시계 연금술사. 도난품을 만든 장본인이다.", firstLine: "그 모래, 내 공방 모래야. 하지만 난 훔치지 않았어." }, // 루카
            { characterId: "sera", displayName: "세라", role: "전시 해설문을 쓴 문학 튜터. 해설문 한 줄이 바뀐 것을 알아챘다.", firstLine: "해설문 마지막 문장이 어제와 달라요. 누가 고쳐 썼어요." }, // 세라
        ], // 등장인물 종료
        tags: ["미스터리", "시간", "판타지"], // 태그
        coverImage: "/images/characters/rank-027.webp", // 대표 이미지
        contentRating: "teen", // 이용 등급(세라 15세 기준)
        popularity: 36000, // 이용 지표
        createdAt: "2026-09-23T00:00:00.000Z", // 생성 시각
    }), // 네 인물 미스터리 스토리 종료
    createStudioStory( // 두 인물 판타지 스토리
    { // 내용 시작
        id: "story-dream-tailor", // 스토리 식별자
        title: "자정의 재봉실, 찢어진 꿈 수선", // 제목
        summary: "같은 악몽이 일주일째 반복된다. 꿈 수선사와 꿈 잠수부가 찢어진 꿈을 기우러 간다.", // 한 줄 소개
        synopsis: "자정에만 문을 여는 재봉실에서는 찢어진 꿈을 은실로 꿰맨다. 일주일째 같은 악몽을 꾸는 당신이 찾아오자, 꿈 수선사 나린은 꿈 잠수부 아델을 부른다. 둘은 당신의 꿈속으로 들어가 처음 찢어진 자리를 찾는다.", // 줄거리
        opening: "재봉틀이 멈추고 별가루가 공중에 떠오른다. 탁자 위에 펼쳐진 당신의 꿈 한가운데가 길게 찢어져 있다.", // 시작 장면
        userRole: "같은 악몽을 꾸는 의뢰인", // 사용자 역할
        cast: // 등장인물
        [ // 등장인물 시작
            { characterId: "rank-013", displayName: "나린", role: "꿈 수선사. 은실 바늘로 찢어진 꿈을 꿰맨다.", firstLine: "많이 피곤했겠어요. 찢어진 자리가 생각보다 깊네요." }, // 나린
            { characterId: "rank-036", displayName: "아델", role: "꿈 잠수부. 남의 꿈속 깊은 곳까지 들어갈 수 있다.", firstLine: "산소통 확인 끝. 손 잡아, 꿈속은 생각보다 물살이 세." }, // 아델
        ], // 등장인물 종료
        tags: ["판타지", "꿈", "힐링"], // 태그
        coverImage: "/images/characters/rank-013.webp", // 대표 이미지
        contentRating: "all", // 이용 등급
        popularity: 33000, // 이용 지표
        createdAt: "2026-09-24T00:00:00.000Z", // 생성 시각
    }), // 두 인물 판타지 스토리 종료
    createStudioStory( // 한 인물 힐링 스토리
    { // 내용 시작
        id: "story-forest-clinic", // 스토리 식별자
        title: "숲의 진료소에서 하룻밤", // 제목
        summary: "길을 잃고 들어간 숲속 진료소. 치료사 미엘과 단둘이 폭풍이 지나가기를 기다린다.", // 한 줄 소개
        synopsis: "산책로를 벗어난 당신은 폭풍을 피해 숲속 작은 진료소에 들어선다. 치료사 미엘은 다친 새와 여우를 돌보면서 당신에게도 따뜻한 차를 건넨다. 한 사람과 천천히 이야기를 나누는 상황극이다.", // 줄거리
        opening: "창밖에서 나뭇가지가 거세게 흔들린다. 벽난로 옆 바구니에서 작은 여우가 귀를 쫑긋 세운다.", // 시작 장면
        userRole: "폭풍 속에 길을 잃은 여행자", // 사용자 역할
        cast: // 등장인물
        [ // 등장인물 시작
            { characterId: "miel", displayName: "미엘", role: "숲의 치료사. 사람과 동물을 가리지 않고 돌본다.", firstLine: "젖은 외투는 거기 걸어 두세요. 차는 꿀을 넣을까요?" }, // 미엘
        ], // 등장인물 종료
        tags: ["힐링", "자연", "판타지"], // 태그
        coverImage: "/images/characters/miel.webp", // 대표 이미지
        contentRating: "all", // 이용 등급
        popularity: 31000, // 이용 지표
        createdAt: "2026-09-25T00:00:00.000Z", // 생성 시각
    }), // 한 인물 힐링 스토리 종료
    createStudioStory( // 두 인물 19세 스토리
    { // 내용 시작
        id: "story-last-subway", // 스토리 식별자
        title: "자정 승강장, 사라진 막차", // 제목
        summary: "폐선된 승강장에 오지 않아야 할 막차가 들어온다. 탄 사람은 돌아오지 않았다.", // 한 줄 소개
        synopsis: "폐선된 지 10년 된 지하철역에서 자정마다 막차 불빛이 보인다는 제보가 이어진다. 그 열차를 탄 사람들은 아무도 돌아오지 않았다. 마지막 기관사 준호와 유령 마을 집배원 다온이 실종자의 마지막 편지를 들고 승강장으로 내려간다. 공포 연출과 실종 소재가 있는 19세 이용가 이야기다.", // 줄거리
        opening: "끊긴 선로 끝에서 붉은 신호등이 켜진다. 아무도 없는 승강장에 열차 도착 안내 방송이 흘러나온다.", // 시작 장면
        userRole: "실종된 친구를 찾으러 온 사람", // 사용자 역할
        cast: // 등장인물
        [ // 등장인물 시작
            { characterId: "rank-020", displayName: "준호", role: "폐선된 노선의 마지막 기관사. 막차의 비밀을 알고 있다.", firstLine: "노란 선 밖으로 나오지 마. 저 열차는 승객을 고르지 않아." }, // 준호
            { characterId: "rank-031", displayName: "다온", role: "유령 마을 집배원. 실종자들이 남긴 편지를 배달한다.", firstLine: "편지가 한 통 더 왔어요. 받는 사람… 당신 이름이에요." }, // 다온
        ], // 등장인물 종료
        tags: ["미스터리", "공포", "도시"], // 태그
        coverImage: "/images/characters/rank-020.webp", // 대표 이미지
        contentRating: "mature", // 이용 등급(준호 19세 기준)
        popularity: 30000, // 이용 지표
        createdAt: "2026-09-26T00:00:00.000Z", // 생성 시각
    }), // 두 인물 19세 스토리 종료
    createStudioStory( // 세 인물 19세 SF 스토리
    { // 내용 시작
        id: "story-neon-alley", // 스토리 식별자
        title: "네온 골목 실종 사건", // 제목
        summary: "비 내리는 미래 도시에서 기억 백업이 통째로 사라진 사람을 찾는다.", // 한 줄 소개
        synopsis: "비가 그치지 않는 미래 도시의 뒷골목에서 한 사람의 기억 백업이 흔적 없이 지워졌다. 네온 골목 탐정 태오, 궤도 법정 변호사 린, 기억 백업 엔지니어 니코가 의뢰인인 당신과 함께 지워진 기억의 행방을 쫓는다. 범죄 수사와 폭력 묘사가 있는 19세 이용가 이야기다.", // 줄거리
        opening: "홀로그램 간판이 빗물에 일그러진다. 사무실 단말기에 '기억 기록 없음'이라는 붉은 글자가 깜박인다.", // 시작 장면
        userRole: "지워진 기억을 되찾고 싶은 의뢰인", // 사용자 역할
        cast: // 등장인물
        [ // 등장인물 시작
            { characterId: "rank-017", displayName: "태오", role: "네온 골목 탐정. 홀로그램 렌즈로 단서를 읽는다.", firstLine: "기억이 지워진 사람치고는 눈빛이 너무 또렷한데." }, // 태오
            { characterId: "rank-049", displayName: "린", role: "궤도 법정 변호사. 기억 삭제가 합법인지 따진다.", firstLine: "이 계약서에 서명한 기억, 정말 없어요?" }, // 린
            { characterId: "rank-046", displayName: "니코", role: "기억 백업 엔지니어. 지워진 기록의 조각을 복원한다.", firstLine: "완전히 지운 건 아니야. 누군가 일부러 조각을 남겨 뒀어." }, // 니코
        ], // 등장인물 종료
        tags: ["SF", "추리", "범죄"], // 태그
        coverImage: "/images/characters/rank-017.webp", // 대표 이미지
        contentRating: "mature", // 이용 등급(태오 19세 기준)
        popularity: 27000, // 이용 지표
        createdAt: "2026-09-27T00:00:00.000Z", // 생성 시각
    }), // 세 인물 19세 SF 스토리 종료
]; // 목록 종료

interface StudioStoryInput // 스튜디오 예시 스토리 입력
{ // 구조 시작
    id: string; // 스토리 식별자
    title: string; // 제목
    summary: string; // 한 줄 소개
    synopsis: string; // 줄거리
    opening: string; // 시작 장면
    userRole: string; // 사용자 역할
    cast: Story["cast"]; // 등장인물
    tags: string[]; // 태그
    coverImage: string; // 대표 이미지
    contentRating: Story["contentRating"]; // 이용 등급
    popularity: number; // 이용 지표
    createdAt: string; // 생성 시각
} // 구조 종료

function createStudioStory(input: StudioStoryInput): BaseStory // 스튜디오 공개 스토리 만들기
{ // 함수 시작
    return { ...input, creatorId: "creator-mateverse-story", creatorName: "메이트버스 스토리 연구소", visibility: "public", publicationStatus: "published", updatedAt: input.createdAt }; // 공통 값을 채운 스토리 반환
} // 함수 종료

export const mockStories: Story[] = baseStories.map(withWorkDefaults); // 기본 필드를 채운 예시 스토리
