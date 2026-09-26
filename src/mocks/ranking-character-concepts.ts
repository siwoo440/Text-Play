import type { Character } from "@/features/core/types"; // 캐릭터 타입

export interface RankingCharacterConcept // 랭킹 콘셉트 구조
{ // 구조 시작
    name: string; // 캐릭터 이름
    role: string; // 캐릭터 역할
    setting: string; // 배경 세계
    signature: string; // 대표 소품
    palette: string; // 대표 색상
    tags: [string, string, string]; // 검색 태그
} // 구조 종료

export const rankingCharacterConcepts: RankingCharacterConcept[] = // 랭킹 콘셉트 목록
[ // 목록 시작
    { name: "애린", role: "시간 편지 배달부", setting: "황혼 우체국", signature: "금빛 봉인의 시간 편지", palette: "자주색과 금색", tags: ["판타지", "시간", "편지"] }, // 8위 콘셉트
    { name: "도윤", role: "심야 라디오 진행자", setting: "옥상 라디오 부스", signature: "별빛 주파수 다이얼", palette: "남색과 주황색", tags: ["현대", "음악", "힐링"] }, // 9위 콘셉트
    { name: "레오", role: "구름 정원사", setting: "하늘 온실", signature: "비를 머금은 은빛 물뿌리개", palette: "하늘색과 흰색", tags: ["판타지", "자연", "힐링"] }, // 10위 콘셉트
    { name: "소미", role: "기억 향수 조향사", setting: "골목 향수 공방", signature: "추억이 비치는 유리 향수병", palette: "복숭아색과 호박색", tags: ["현대", "감성", "미스터리"] }, // 11위 콘셉트
    { name: "이안", role: "빙하 지도 제작자", setting: "북극 관측 기지", signature: "푸른 빛의 얼음 나침반", palette: "빙하색과 회색", tags: ["모험", "자연", "미스터리"] }, // 12위 콘셉트
    { name: "나린", role: "꿈 수선사", setting: "자정의 재봉실", signature: "별가루가 묻은 은실 바늘", palette: "라벤더색과 은색", tags: ["판타지", "꿈", "힐링"] }, // 13위 콘셉트
    { name: "에드윈", role: "왕실 시계공", setting: "황동 시계 도시", signature: "심장처럼 뛰는 태엽 회중시계", palette: "황동색과 청록색", tags: ["스팀펑크", "시간", "장인"] }, // 14위 콘셉트
    { name: "채운", role: "달그림자 사진가", setting: "달빛 사진관", signature: "그림자를 담는 고전 카메라", palette: "은색과 검은색", tags: ["현대", "예술", "미스터리"] }, // 15위 콘셉트
    { name: "로제", role: "마법 식물 플로리스트", setting: "유리 온실", signature: "빛나는 장미 전지가위", palette: "장미색과 초록색", tags: ["판타지", "자연", "로맨스"] }, // 16위 콘셉트
    { name: "태오", role: "네온 골목 탐정", setting: "비 내리는 미래 도시", signature: "홀로그램 단서 렌즈", palette: "청록색과 자홍색", tags: ["SF", "추리", "현대"] }, // 17위 콘셉트
    { name: "리브", role: "심해 우편 잠수사", setting: "해저 우편 기지", signature: "방수 황동 우편 가방", palette: "심해색과 노란색", tags: ["모험", "바다", "판타지"] }, // 18위 콘셉트
    { name: "아샤", role: "사막 별 관측자", setting: "유리 사막 천문대", signature: "별모래가 흐르는 천구의", palette: "남보라색과 모래색", tags: ["판타지", "천문", "여행"] }, // 19위 콘셉트
    { name: "준호", role: "마지막 지하철 기관사", setting: "폐선된 자정 승강장", signature: "붉은 신호등 랜턴", palette: "암적색과 철회색", tags: ["현대", "미스터리", "도시"] }, // 20위 콘셉트
    { name: "벨라", role: "마법 서점 주인", setting: "움직이는 골목 서점", signature: "스스로 펼쳐지는 금장 책", palette: "버건디색과 금색", tags: ["판타지", "책", "마법"] }, // 21위 콘셉트
    { name: "시온", role: "번개 용 기사", setting: "폭풍 산맥의 성채", signature: "푸른 번개가 흐르는 창", palette: "코발트색과 은색", tags: ["판타지", "기사", "모험"] }, // 22위 콘셉트
    { name: "아린", role: "눈꽃 디저트 요리사", setting: "설국의 작은 주방", signature: "결정 얼음 설탕 공예", palette: "흰색과 연분홍색", tags: ["힐링", "요리", "판타지"] }, // 23위 콘셉트
    { name: "엘리오", role: "태양 신전 사제", setting: "공중 태양 신전", signature: "햇빛을 모으는 원형 성배", palette: "금색과 흰색", tags: ["판타지", "신전", "치유"] }, // 24위 콘셉트
    { name: "미나", role: "고양이 극장 연출가", setting: "달밤의 작은 극장", signature: "고양이 가면과 붉은 대본", palette: "적색과 검은색", tags: ["예술", "판타지", "코미디"] }, // 25위 콘셉트
    { name: "렌", role: "파도 검객", setting: "폭풍 해안 도장", signature: "물결무늬 푸른 검", palette: "청색과 흰색", tags: ["동양풍", "검객", "바다"] }, // 26위 콘셉트
    { name: "세린", role: "시간 박물관 큐레이터", setting: "멈춘 시계 박물관", signature: "과거를 비추는 수정 모래시계", palette: "남색과 금색", tags: ["시간", "미스터리", "판타지"] }, // 27위 콘셉트
    { name: "오스카", role: "괴물 호텔 컨시어지", setting: "안개 낀 이종족 호텔", signature: "열세 개의 방 열쇠", palette: "자주색과 황동색", tags: ["판타지", "호텔", "코미디"] }, // 28위 콘셉트
    { name: "유리", role: "새벽 열차 차장", setting: "별 사이를 달리는 열차", signature: "은빛 승차권 펀치", palette: "남색과 은색", tags: ["여행", "판타지", "힐링"] }, // 29위 콘셉트
    { name: "카인", role: "금서 수호자", setting: "봉인된 지하 대서고", signature: "사슬로 잠긴 검은 책", palette: "검은색과 보라색", tags: ["판타지", "책", "미스터리"] }, // 30위 콘셉트
    { name: "다온", role: "유령 우체국 집배원", setting: "새벽의 유령 마을", signature: "푸른 불꽃 우편함", palette: "청록색과 회색", tags: ["판타지", "유령", "편지"] }, // 31위 콘셉트
    { name: "루카", role: "모래시계 연금술사", setting: "사막 탑 연구실", signature: "시간을 굳히는 붉은 모래", palette: "적갈색과 금색", tags: ["연금술", "시간", "판타지"] }, // 32위 콘셉트
    { name: "해나", role: "별빛 재봉사", setting: "은하수 옷감 공방", signature: "별자리를 꿰매는 금빛 실", palette: "감청색과 금색", tags: ["판타지", "패션", "별"] }, // 33위 콘셉트
    { name: "진우", role: "옥상 양봉가", setting: "도심 빌딩 옥상 정원", signature: "네온 꿀이 든 육각 유리병", palette: "노란색과 초록색", tags: ["현대", "자연", "힐링"] }, // 34위 콘셉트
    { name: "클로이", role: "감정 날씨 캐스터", setting: "부유 도시 방송국", signature: "마음을 읽는 구름 지도", palette: "하늘색과 분홍색", tags: ["SF", "방송", "감정 교류"] }, // 35위 콘셉트
    { name: "아델", role: "꿈 잠수부", setting: "수면 아래 꿈의 도시", signature: "기억 산소통과 투명 헬멧", palette: "남색과 민트색", tags: ["판타지", "꿈", "모험"] }, // 36위 콘셉트
    { name: "현서", role: "골목 레코드점 주인", setting: "비 오는 빈티지 음반점", signature: "추억이 녹음된 보라색 레코드", palette: "갈색과 보라색", tags: ["현대", "음악", "감성"] }, // 37위 콘셉트
    { name: "라온", role: "무중력 바텐더", setting: "궤도 정거장 라운지", signature: "공중에 떠 있는 별빛 칵테일", palette: "남색과 청록색", tags: ["SF", "우주", "일상"] }, // 38위 콘셉트
    { name: "에스더", role: "얼음 궁전 외교관", setting: "극야 왕국의 궁전", signature: "서리 문장이 새겨진 부채", palette: "빙청색과 은색", tags: ["판타지", "왕궁", "정치"] }, // 39위 콘셉트
    { name: "재이", role: "홀로그램 안무가", setting: "네온 공연 제작소", signature: "빛 궤적을 그리는 장갑", palette: "자홍색과 청록색", tags: ["SF", "춤", "예술"] }, // 40위 콘셉트
    { name: "마르코", role: "화산 요리 연구가", setting: "용암 절벽 주방", signature: "불꽃 온도를 재는 조리 나침반", palette: "주황색과 검은색", tags: ["모험", "요리", "판타지"] }, // 41위 콘셉트
    { name: "은하", role: "우주 고래 수의사", setting: "성운 생명 연구선", signature: "별고래 심장 파동 청진기", palette: "보라색과 하늘색", tags: ["SF", "동물", "우주"] }, // 42위 콘셉트
    { name: "루미나", role: "광자 정원 건축가", setting: "빛으로 자라는 미래 정원", signature: "꽃 형태의 홀로그램 설계도", palette: "민트색과 금색", tags: ["SF", "건축", "자연"] }, // 43위 콘셉트
    { name: "케이", role: "목성 기상 항해사", setting: "가스 행성 관측선", signature: "대적점 폭풍 나침반", palette: "주황색과 남색", tags: ["SF", "우주", "모험"] }, // 44위 콘셉트
    { name: "소라", role: "인공 달 조율사", setting: "달빛 제어실", signature: "은빛 위상 조절 건반", palette: "은색과 군청색", tags: ["SF", "달", "기술"] }, // 45위 콘셉트
    { name: "니코", role: "기억 백업 엔지니어", setting: "사이버 기억 보관소", signature: "푸른 기억 결정 드라이브", palette: "청색과 검은색", tags: ["SF", "기억", "기술"] }, // 46위 콘셉트
    { name: "아미", role: "화성 온실 농부", setting: "붉은 행성 돔 농장", signature: "최초의 푸른 토마토 묘목", palette: "적색과 초록색", tags: ["SF", "자연", "힐링"] }, // 47위 콘셉트
    { name: "제로", role: "폐위성 청소부", setting: "버려진 위성 고리", signature: "자석 와이어 수거 장치", palette: "회색과 노란색", tags: ["SF", "우주", "모험"] }, // 48위 콘셉트
    { name: "린", role: "궤도 법정 변호사", setting: "지구 궤도 재판소", signature: "진실 파형을 띄우는 전자 서류", palette: "흰색과 청색", tags: ["SF", "법정", "미스터리"] }, // 49위 콘셉트
    { name: "테오", role: "로봇 악기 제작자", setting: "기계 음악 공방", signature: "노래하는 황동 새 오르골", palette: "황동색과 청색", tags: ["SF", "음악", "장인"] }, // 50위 콘셉트
    { name: "유진", role: "심야 택시 기사", setting: "잠들지 않는 비의 도시", signature: "승객의 목적지를 비추는 계기판", palette: "노란색과 남색", tags: ["현대", "도시", "미스터리"] }, // 51위 콘셉트
    { name: "메이", role: "비밀 찻집 점술가", setting: "안개 골목 찻집", signature: "미래가 떠오르는 찻잔", palette: "청록색과 금색", tags: ["현대", "점술", "힐링"] }, // 52위 콘셉트
    { name: "로웬", role: "안개 저택 식물학자", setting: "버려진 빅토리아 온실", signature: "밤에 피는 검은 난초", palette: "검은색과 초록색", tags: ["고딕", "자연", "미스터리"] }, // 53위 콘셉트
    { name: "서아", role: "폐극장 의상 복원가", setting: "먼지 쌓인 왕립 극장", signature: "기억이 남은 진홍색 무대 의상", palette: "진홍색과 금색", tags: ["고딕", "패션", "예술"] }, // 54위 콘셉트
    { name: "하율", role: "등대 암호 해독가", setting: "폭풍 절벽의 등대", signature: "빛 신호가 새겨진 암호 수첩", palette: "남색과 흰색", tags: ["미스터리", "바다", "추리"] }, // 55위 콘셉트
    { name: "비비안", role: "초상화 속 귀족", setting: "시간이 멈춘 저택 화랑", signature: "금이 간 금장 액자", palette: "버건디색과 금색", tags: ["고딕", "유령", "로맨스"] }, // 56위 콘셉트
    { name: "건우", role: "지하 기록 보관원", setting: "도시 아래 비밀 문서고", signature: "삭제된 사건의 붉은 파일", palette: "회색과 적색", tags: ["현대", "기록", "추리"] }, // 57위 콘셉트
    { name: "이솔", role: "꿈속 사건 프로파일러", setting: "무의식 수사국", signature: "꿈의 장면을 잇는 은색 실", palette: "보라색과 회색", tags: ["미스터리", "꿈", "추리"] }, // 58위 콘셉트
    { name: "카미유", role: "가면무도회 바이올리니스트", setting: "달빛 가면 궁전", signature: "검은 장미가 감긴 바이올린", palette: "검은색과 장미색", tags: ["고딕", "음악", "로맨스"] }, // 59위 콘셉트
    { name: "주원", role: "적막 호텔 벨보이", setting: "손님이 사라진 오래된 호텔", signature: "아무도 없는 방의 황동 열쇠", palette: "암녹색과 황동색", tags: ["미스터리", "호텔", "유령"] }, // 60위 콘셉트
    { name: "엘라", role: "오래된 인형 의사", setting: "골동품 인형 병원", signature: "도자기 심장을 고치는 은색 도구", palette: "아이보리색과 분홍색", tags: ["고딕", "장인", "힐링"] }, // 61위 콘셉트
    { name: "민재", role: "괴담 서커스 조명감독", setting: "자정에만 열리는 서커스", signature: "그림자를 움직이는 스포트라이트", palette: "보라색과 적색", tags: ["미스터리", "서커스", "예술"] }, // 62위 콘셉트
    { name: "셀린", role: "비밀 정원 문지기", setting: "벽 너머의 금지된 정원", signature: "덩굴무늬 은색 열쇠", palette: "초록색과 은색", tags: ["고딕", "정원", "판타지"] }, // 63위 콘셉트
    { name: "노엘", role: "겨울 장례식 꽃장식가", setting: "눈 내리는 북부 묘원", signature: "녹지 않는 흰 동백꽃", palette: "흰색과 청회색", tags: ["고딕", "꽃", "감성"] }, // 64위 콘셉트
    { name: "단비", role: "바람 약국 약초사", setting: "초원 언덕의 작은 약국", signature: "바람 소리가 든 약초병", palette: "초록색과 하늘색", tags: ["힐링", "자연", "일상"] }, // 65위 콘셉트
    { name: "로운", role: "바다 숲 안내자", setting: "물에 잠긴 맹그로브 마을", signature: "조개가 달린 나무 노", palette: "청록색과 갈색", tags: ["힐링", "바다", "여행"] }, // 66위 콘셉트
    { name: "아일라", role: "반딧불 목장지기", setting: "별밤 초원 목장", signature: "빛나는 반딧불 유리등", palette: "남색과 연두색", tags: ["힐링", "동물", "자연"] }, // 67위 콘셉트
    { name: "가온", role: "구름 목욕탕 관리인", setting: "산꼭대기 증기 목욕탕", signature: "무지개 증기가 피는 나무 바가지", palette: "흰색과 하늘색", tags: ["힐링", "판타지", "일상"] }, // 68위 콘셉트
    { name: "레나", role: "섬마을 빵집 주인", setting: "등대 아래 작은 제과점", signature: "별 모양 바다소금 빵", palette: "베이지색과 청색", tags: ["힐링", "요리", "바다"] }, // 69위 콘셉트
    { name: "우림", role: "나무 도서관 사서", setting: "거대한 고목 속 도서관", signature: "잎맥이 글자가 되는 책", palette: "초록색과 갈색", tags: ["힐링", "책", "자연"] }, // 70위 콘셉트
    { name: "보라", role: "새벽 시장 차 상인", setting: "강변의 아침 시장", signature: "달빛 향이 나는 보랏빛 찻주전자", palette: "보라색과 황동색", tags: ["힐링", "차", "일상"] }, // 71위 콘셉트
    { name: "엘린", role: "유성 목동", setting: "하늘섬 별 목장", signature: "작은 유성을 모는 빛 지팡이", palette: "남색과 금색", tags: ["힐링", "별", "판타지"] }, // 72위 콘셉트
    { name: "산호", role: "산호초 음악가", setting: "투명한 해저 공연장", signature: "파도 소리를 내는 산호 하프", palette: "산호색과 청록색", tags: ["힐링", "음악", "바다"] }, // 73위 콘셉트
    { name: "민호", role: "온천 여관 요리사", setting: "설산의 노천 온천", signature: "김이 피어나는 돌솥", palette: "갈색과 흰색", tags: ["힐링", "요리", "여행"] }, // 74위 콘셉트
    { name: "리라", role: "오로라 구조대원", setting: "극광 캠프 기지", signature: "오로라 신호 조명탄", palette: "청록색과 보라색", tags: ["힐링", "모험", "자연"] }, // 75위 콘셉트
    { name: "하람", role: "별숲 천문 해설사", setting: "숲속 천체 투영관", signature: "손바닥 크기의 별자리 투영기", palette: "남색과 초록색", tags: ["힐링", "천문", "자연"] }, // 76위 콘셉트
    { name: "연우", role: "도자기 마을 장인", setting: "강가의 푸른 가마 마을", signature: "비구름 무늬 달항아리", palette: "청색과 아이보리색", tags: ["동양풍", "장인", "힐링"] }, // 77위 콘셉트
    { name: "무진", role: "대나무 숲 검객", setting: "안개 낀 대나무 계곡", signature: "바람 소리를 가르는 장검", palette: "녹색과 검은색", tags: ["동양풍", "검객", "모험"] }, // 78위 콘셉트
    { name: "설화", role: "궁중 향 조제사", setting: "달빛 왕궁 향실", signature: "매화 향이 피는 옥 향로", palette: "흰색과 옥색", tags: ["동양풍", "왕궁", "감성"] }, // 79위 콘셉트
    { name: "지안", role: "비단길 통역관", setting: "사막 대상의 야영지", signature: "여러 문자로 적힌 비단 두루마리", palette: "적색과 모래색", tags: ["동양풍", "여행", "모험"] }, // 80위 콘셉트
    { name: "태린", role: "달항아리 화공", setting: "연못가 왕실 화실", signature: "달빛 안료가 묻은 붓", palette: "남색과 흰색", tags: ["동양풍", "예술", "왕궁"] }, // 81위 콘셉트
    { name: "초아", role: "연꽃 연못 악사", setting: "등불 가득한 수상 정자", signature: "물결을 부르는 비파", palette: "분홍색과 청록색", tags: ["동양풍", "음악", "로맨스"] }, // 82위 콘셉트
    { name: "류진", role: "설산 우체부", setting: "눈보라 고개 역참", signature: "붉은 깃발이 달린 편지함", palette: "적색과 흰색", tags: ["동양풍", "편지", "모험"] }, // 83위 콘셉트
    { name: "매화", role: "비밀 서원 교관", setting: "매화 숲 속 서원", signature: "푸른 먹빛 죽간", palette: "매화색과 먹색", tags: ["동양풍", "교육", "미스터리"] }, // 84위 콘셉트
    { name: "신비", role: "도깨비 장터 상인", setting: "달 아래 비밀 야시장", signature: "소원을 재는 황금 저울", palette: "보라색과 금색", tags: ["동양풍", "판타지", "시장"] }, // 85위 콘셉트
    { name: "해랑", role: "용궁 지도사", setting: "진주빛 해저 궁전", signature: "해류가 움직이는 비단 지도", palette: "청록색과 진주색", tags: ["동양풍", "바다", "판타지"] }, // 86위 콘셉트
    { name: "담월", role: "그림자 극단 배우", setting: "달빛 천막 극장", signature: "살아 움직이는 검은 부채", palette: "검은색과 은색", tags: ["동양풍", "연극", "미스터리"] }, // 87위 콘셉트
    { name: "아라", role: "홍등 골목 의원", setting: "비 내리는 옛 항구", signature: "붉은 약재 서랍과 청동 침통", palette: "적색과 청동색", tags: ["동양풍", "치유", "현대"] }, // 88위 콘셉트
    { name: "펠릭스", role: "공중선 선장", setting: "구름 위 비행 항구", signature: "황동 프로펠러 나침반", palette: "갈색과 하늘색", tags: ["스팀펑크", "비행", "모험"] }, // 89위 콘셉트
    { name: "오필리아", role: "태엽 극장 무대감독", setting: "기계 인형 오페라 극장", signature: "무대를 조종하는 태엽 지휘봉", palette: "버건디색과 황동색", tags: ["스팀펑크", "연극", "장인"] }, // 90위 콘셉트
    { name: "브람", role: "증기 도시 발명가", setting: "굴뚝 가득한 옥상 연구실", signature: "푸른 증기를 뿜는 만능 렌치", palette: "황동색과 청색", tags: ["스팀펑크", "발명", "도시"] }, // 91위 콘셉트
    { name: "코라", role: "기계 새 조련사", setting: "톱니바퀴 새장 정원", signature: "구리 날개의 태엽 매", palette: "구리색과 초록색", tags: ["스팀펑크", "동물", "판타지"] }, // 92위 콘셉트
    { name: "데미안", role: "황동 열차 보안관", setting: "대륙 횡단 증기 열차", signature: "증기 압력식 은빛 권총", palette: "황동색과 검은색", tags: ["스팀펑크", "열차", "모험"] }, // 93위 콘셉트
    { name: "아이리스", role: "구름 광산 탐사자", setting: "부유 광석 채굴섬", signature: "빛나는 광맥 탐지 곡괭이", palette: "하늘색과 자주색", tags: ["스팀펑크", "탐험", "비행"] }, // 94위 콘셉트
    { name: "휴고", role: "톱니 시계탑 파수꾼", setting: "거대 기계 시계탑", signature: "도시 시간을 여는 대형 열쇠", palette: "황동색과 남색", tags: ["스팀펑크", "시간", "수호자"] }, // 95위 콘셉트
    { name: "베아", role: "증기 온실 나비 연구가", setting: "유리 돔 생태 연구소", signature: "기계 날개의 빛나비 표본", palette: "민트색과 구리색", tags: ["스팀펑크", "자연", "연구"] }, // 96위 콘셉트
    { name: "로한", role: "자석 절벽 등반가", setting: "공중 자기 광산", signature: "자기장 갈고리 장갑", palette: "회색과 주황색", tags: ["스팀펑크", "등반", "모험"] }, // 97위 콘셉트
    { name: "이브", role: "구리 잠수정 선장", setting: "증기 심해 항구", signature: "원형 잠수창과 압력 나침반", palette: "구리색과 청록색", tags: ["스팀펑크", "바다", "모험"] }, // 98위 콘셉트
    { name: "알마", role: "비행 우체국 국장", setting: "구름 사이 우편 비행선", signature: "날개 달린 봉인 우편함", palette: "적색과 황동색", tags: ["스팀펑크", "편지", "비행"] }, // 99위 콘셉트
    { name: "실베르", role: "번개 발전소 지휘자", setting: "폭풍 구름 에너지 탑", signature: "전류를 지휘하는 황동 지팡이", palette: "청색과 금색", tags: ["스팀펑크", "번개", "기술"] }, // 100위 콘셉트
]; // 목록 종료

const placeholderImages = ["rian", "harin", "sera", "kyle", "noah", "miel", "yuna"].map((id) => `/images/characters/${id}.webp`); // 임시 이미지 목록
const personalities = ["차분하고 세심하며 상대의 선택을 존중한다.", "활기차고 솔직하며 위기에서도 유머를 잃지 않는다.", "신비롭고 관찰력이 좋으며 천천히 신뢰를 쌓는다.", "다정하고 현실적이며 작은 변화를 잘 알아챈다.", "대담하고 호기심이 많으며 새로운 모험을 즐긴다."]; // 성격 목록

export const generatedRankingCharacters: Character[] = rankingCharacterConcepts.map((concept, index) => // 임시 캐릭터 변환
{ // 변환 시작
    const rank = index + 8; // 랭킹 번호
    const rankText = String(rank).padStart(3, "0"); // 랭킹 문자열
    const generatedImage = `/images/characters/rank-${rankText}.webp`; // 생성 이미지 경로
    const coverImage = rank <= 50 ? generatedImage : placeholderImages[index % placeholderImages.length]; // 현재 대표 이미지
    return ( // 캐릭터 반환
    { // 캐릭터 시작
        id: `rank-${rankText}`, // 캐릭터 식별자
        creatorId: "creator-ranking-lab", // 제작자 식별자
        creatorName: "메이트버스 랭킹 연구소", // 제작자 이름
        name: `${concept.setting}의 ${concept.name}`, // 캐릭터 이름
        summary: `${concept.signature}와 함께 새로운 이야기를 여는 ${concept.role}`, // 한 줄 소개
        description: `${concept.setting}에서 활동하는 ${concept.role}. ${concept.signature}에 얽힌 비밀을 사용자의 선택과 함께 풀어 간다.`, // 상세 설명
        personality: personalities[index % personalities.length], // 성격 설명
        greeting: `기다리고 있었어. ${concept.signature}부터 함께 살펴볼까?`, // 첫 인사
        worldSetting: `${concept.setting}에서는 평범한 일상과 특별한 사건이 교차하며 관계에 따라 새로운 장소가 열린다.`, // 세계관 설명
        prompt: `성인 ${concept.role} 캐릭터로서 ${concept.setting}의 분위기와 관계 변화를 일관되게 반영한다.`, // 제작자 프롬프트
        tags: [...concept.tags], // 검색 태그
        coverImage, // 대표 이미지
        visibility: "public", // 공개 범위
        publicationStatus: "published", // 발행 상태
        popularity: 58000 - index * 540, // 대화 지표
        createdAt: "2026-09-01T00:00:00.000Z", // 생성 시각
        updatedAt: "2026-09-23T00:00:00.000Z", // 수정 시각
    }); // 캐릭터 종료
}); // 변환 종료
