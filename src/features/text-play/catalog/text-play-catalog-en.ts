export interface EnglishWorkText // 작품 카드 영어 글
{ // 구조 시작
    title: string; // 작품 제목
    leadName: string; // 주요 등장인물
    summary: string; // 한 줄 소개
    description: string; // 상세 소개
} // 구조 종료

export const ENGLISH_TAGS: Readonly<Record<string, string>> = // 한국어 태그 → 영어 태그(작품 50개 공통)
{ // 태그 시작
    "감정 교류": "Emotional bond", 판타지: "Fantasy", 도서관: "Library", 일상: "Slice of life", 힐링: "Healing", 로맨스: "Romance", // 기본 장르
    현대: "Modern", 미스터리: "Mystery", SF: "SF", 모험: "Adventure", 동료: "Companions", 감성: "Sentimental", 음악: "Music", // 분위기
    시간: "Time", 편지: "Letters", 자연: "Nature", 꿈: "Dreams", 스팀펑크: "Steampunk", 장인: "Craftsmanship", 예술: "Art", // 소재
    추리: "Detective", 바다: "Sea", 천문: "Astronomy", 여행: "Travel", 도시: "City", 책: "Books", 마법: "Magic", 기사: "Knights", // 소재
    요리: "Cooking", 신전: "Temple", 치유: "Recovery", 코미디: "Comedy", 동양풍: "Eastern", 검객: "Swordplay", 호텔: "Hotel", 유령: "Ghosts", // 소재
    연금술: "Alchemy", 패션: "Fashion", 별: "Stars", 방송: "Broadcasting", 우주: "Space", 왕궁: "Royal court", 정치: "Politics", 춤: "Dance", // 소재
    동물: "Animals", 건축: "Architecture", 달: "Moon", 기술: "Technology", 기억: "Memory", 법정: "Courtroom", 기록: "Records", // 소재
}; // 태그 종료

const BASE_WORKS: Readonly<Record<string, EnglishWorkText>> = // 기본 캐릭터 작품 7개
{ // 목록 시작
    "work-rian": { title: "Memories of the Dawn Library", leadName: "Rian", summary: "A librarian who records fading memories and keeps a page just for you", description: "The librarian of a memory library that opens only at dawn, keeping the feelings visitors never want to forget as sentences. After the city falls asleep, the forgotten memories of its people gather as books in the dawn library." }, // 리안
    "work-harin": { title: "A Promise at the Café on the Way Home", leadName: "Harin", summary: "A barista who notices your expression first, at the same time every day", description: "A barista at a small café on rainy evenings who serves the drink that suits each guest's day. The café in the alley on the way home is a small refuge where tired people stop to rest for a while." }, // 하린
    "work-sera": { title: "After School in a Rainy Classroom", leadName: "Sera", summary: "A literature tutor waiting for a promise between you two in a frozen after-school hour", description: "Sera, an adult literature tutor, searches for the reason behind an old promise in an empty classroom still filled with the sound of rain. In the evening classroom where time flows slowly, a new clue appears whenever the rain stops." }, // 세라
    "work-kyle": { title: "Coordinates of a Lost Star", leadName: "Kyle", summary: "A navigator who searches with you for the coordinates of a lost star", description: "A navigator who reads the routes of the stars and travels the universe to recover the constellation of a vanished home. Tour unknown interstellar cities with a star map that responds to feelings." }, // 카일
    "work-noah": { title: "Letters from the Moonlit Archive", leadName: "Noah", summary: "A moonlight archivist who keeps unspoken feelings as sentences", description: "Noah alone guards the moonlit archive, where feelings that were never spoken remain as glass records. On every full-moon night, emotions turn into transparent record cards in this vast archive." }, // 노아
    "work-miel": { title: "The Forest Clinic", leadName: "Miel", summary: "A forest healer who slowly restores the warmth of a tiring day", description: "An adult healer who helps plants and people recover in a greenhouse that glows after the rain. In this glass greenhouse deep in the forest, the light and scent of herbs change with the state of your heart." }, // 미엘
    "work-yuna": { title: "The Rooftop Band's Unfinished Song", leadName: "Yuna", summary: "A rooftop band leader who plays an unfinished song only for you", description: "A band leader who uses the city sunset as a stage and wants to finish an untitled song with you. In this downtown rooftop studio, music changes real feelings only at sunset." }, // 유나
}; // 목록 종료

type ConceptRow = [id: string, title: string, place: string, name: string, role: string, item: string]; // 콘셉트 작품 한 줄(장소 문구·인물·역할·핵심 물건)

const CONCEPT_WORKS: readonly ConceptRow[] = // 랭킹 콘셉트 작품 43개
[ // 목록 시작
    ["work-rank-008", "Twilight Post Office", "the Twilight Post Office", "Aerin", "a time-letter courier", "time letters with golden seals"], // 애린
    ["work-rank-009", "Rooftop Radio Booth", "a rooftop radio booth", "Doyun", "a late-night radio host", "starlight frequency dial"], // 도윤
    ["work-rank-010", "Sky Greenhouse", "the Sky Greenhouse", "Leo", "a cloud gardener", "silver watering can full of rain"], // 레오
    ["work-rank-011", "Alley Perfume Workshop", "an alley perfume workshop", "Somi", "a memory perfumer", "glass perfume bottle that reflects memories"], // 소미
    ["work-rank-012", "Arctic Observation Base", "an Arctic observation base", "Ian", "a glacier cartographer", "glowing blue ice compass"], // 이안
    ["work-rank-013", "Midnight Sewing Room", "the Midnight Sewing Room", "Narin", "a dream mender", "silver needle dusted with stardust"], // 나린
    ["work-rank-014", "Brass Clock City", "Brass Clock City", "Edwin", "a royal clockmaker", "clockwork pocket watch that beats like a heart"], // 에드윈
    ["work-rank-015", "Moonlight Photo Studio", "the Moonlight Photo Studio", "Chaeun", "a moon-shadow photographer", "vintage camera that captures shadows"], // 채운
    ["work-rank-016", "Glass Greenhouse", "a glass greenhouse", "Rose", "a magical-plant florist", "glowing rose pruning shears"], // 로제
    ["work-rank-017", "Rainy Future City", "a rainy future city", "Taeo", "a neon-alley detective", "holographic clue lens"], // 태오
    ["work-rank-018", "Undersea Mail Base", "an undersea mail base", "Liv", "a deep-sea mail diver", "waterproof brass mailbag"], // 리브
    ["work-rank-019", "Glass Desert Observatory", "the Glass Desert Observatory", "Asha", "a desert stargazer", "celestial globe flowing with star sand"], // 아샤
    ["work-rank-020", "Abandoned Midnight Platform", "an abandoned midnight platform", "Junho", "the last subway driver", "red signal lantern"], // 준호
    ["work-rank-021", "The Moving Alley Bookshop", "the moving alley bookshop", "Bella", "a magic bookshop owner", "gilded book that opens by itself"], // 벨라
    ["work-rank-022", "Fortress of the Storm Mountains", "the fortress of the Storm Mountains", "Sion", "a lightning dragon knight", "spear crackling with blue lightning"], // 시온
    ["work-rank-023", "Little Kitchen in the Snow Country", "a little kitchen in the snow country", "Arin", "a snowflake dessert chef", "crystal ice sugar sculpture"], // 아린
    ["work-rank-024", "Floating Sun Temple", "the floating Sun Temple", "Elio", "a priest of the sun temple", "round chalice that gathers sunlight"], // 엘리오
    ["work-rank-025", "Little Theater on a Moonlit Night", "a little theater on a moonlit night", "Mina", "a cat theater director", "cat mask and red script"], // 미나
    ["work-rank-026", "Stormy Coast Dojo", "a dojo on the stormy coast", "Ren", "a wave swordsman", "blue sword with a ripple pattern"], // 렌
    ["work-rank-027", "Museum of Stopped Clocks", "the Museum of Stopped Clocks", "Serin", "a time museum curator", "crystal hourglass that reflects the past"], // 세린
    ["work-rank-028", "Misty Hotel for Other Races", "a misty hotel for other races", "Oscar", "a monster hotel concierge", "thirteen room keys"], // 오스카
    ["work-rank-029", "Train Running Between Stars", "a train running between the stars", "Yuri", "a dawn train conductor", "silver ticket punch"], // 유리
    ["work-rank-030", "Sealed Underground Archive", "a sealed underground archive", "Kain", "a guardian of forbidden books", "black book locked with chains"], // 카인
    ["work-rank-031", "Ghost Village at Dawn", "a ghost village at dawn", "Daon", "a ghost post office mail carrier", "mailbox of blue flames"], // 다온
    ["work-rank-032", "Desert Tower Laboratory", "a desert tower laboratory", "Luca", "an hourglass alchemist", "red sand that freezes time"], // 루카
    ["work-rank-033", "Milky Way Textile Workshop", "the Milky Way textile workshop", "Hanna", "a starlight tailor", "golden thread that stitches constellations"], // 해나
    ["work-rank-034", "Downtown Rooftop Garden", "a downtown rooftop garden", "Jinwoo", "a rooftop beekeeper", "hexagonal glass jar of neon honey"], // 진우
    ["work-rank-035", "Floating City Broadcast Station", "a floating city broadcast station", "Chloe", "an emotion weather caster", "cloud map that reads hearts"], // 클로이
    ["work-rank-036", "Dream City Beneath the Water", "a dream city beneath the water", "Adele", "a dream diver", "memory air tank and clear helmet"], // 아델
    ["work-rank-037", "Rainy Vintage Record Shop", "a rainy vintage record shop", "Hyeonseo", "an alley record shop owner", "purple record of recorded memories"], // 현서
    ["work-rank-038", "Orbital Station Lounge", "an orbital station lounge", "Raon", "a zero-gravity bartender", "starlight cocktail floating in the air"], // 라온
    ["work-rank-039", "Palace of the Polar Night Kingdom", "the palace of the polar night kingdom", "Esther", "an ice palace diplomat", "fan engraved with a frost crest"], // 에스더
    ["work-rank-040", "Neon Performance Studio", "a neon performance studio", "Jay", "a hologram choreographer", "gloves that draw trails of light"], // 재이
    ["work-rank-041", "Lava Cliff Kitchen", "a kitchen on the lava cliffs", "Marco", "a volcanic cuisine researcher", "cooking compass that measures flame heat"], // 마르코
    ["work-rank-042", "Nebula Life Research Ship", "a nebula life research ship", "Eunha", "a space whale veterinarian", "star-whale heartbeat stethoscope"], // 은하
    ["work-rank-043", "Future Garden Grown by Light", "a future garden grown by light", "Lumina", "a photon garden architect", "flower-shaped holographic blueprint"], // 루미나
    ["work-rank-044", "Gas Giant Observation Ship", "a gas giant observation ship", "Kay", "a Jupiter weather navigator", "Great Red Spot storm compass"], // 케이
    ["work-rank-045", "Moonlight Control Room", "the moonlight control room", "Sora", "an artificial moon tuner", "silver phase-tuning keys"], // 소라
    ["work-rank-046", "Cyber Memory Vault", "a cyber memory vault", "Niko", "a memory backup engineer", "blue memory crystal drive"], // 니코
    ["work-rank-047", "Red Planet Dome Farm", "a dome farm on the red planet", "Ami", "a Martian greenhouse farmer", "first blue tomato seedling"], // 아미
    ["work-rank-048", "Abandoned Satellite Ring", "an abandoned satellite ring", "Zero", "a derelict satellite cleaner", "magnetic wire collector"], // 제로
    ["work-rank-049", "Earth Orbit Court", "the Earth orbit court", "Rin", "an orbital court lawyer", "electronic file that shows truth waveforms"], // 린
    ["work-rank-050", "Mechanical Music Workshop", "a mechanical music workshop", "Teo", "a robot instrument maker", "singing brass bird music box"], // 테오
]; // 목록 종료

function capitalize(text: string): string // 문장 첫 글자 대문자
{ // 함수 시작
    return text.charAt(0).toUpperCase() + text.slice(1); // 변환 반환
} // 함수 종료

export const ENGLISH_CATALOG_WORKS: Readonly<Record<string, EnglishWorkText>> = // 작품 식별자 → 영어 글(샘플 작품 제외 50개)
{ // 목록 시작
    ...BASE_WORKS, // 기본 캐릭터 작품
    ...Object.fromEntries(CONCEPT_WORKS.map(([id, title, place, name, role, item]) => [id, // 콘셉트 작품 문장 만들기
    { // 영어판 시작
        title, // 작품 제목
        leadName: name, // 주요 등장인물
        summary: `Chase the secret of the ${item} with ${name}, ${role}`, // 한 줄 소개
        description: `${capitalize(`in ${place}`)}, you meet ${name}, ${role}, and unravel the events surrounding the ${item} through choices and your own words.`, // 상세 소개
    }])), // 콘셉트 종료
}; // 목록 종료
