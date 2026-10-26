export const MOONLIT_LAKE_CONTINUATION = // 서재 해독 이후 실제 호수 경로
[ // 경로 시작
    ["follow-map", "편지의 지도를 따라간다"], // 갈림길 이동
    ["follow-lake", "호수에 남은 기억을 따라간다"], // 호수 선택
    ["read-water", "수면에 남은 발자국을 읽는다"], // 기억 조사
    ["take-thread", "은빛 실을 받아 계단으로 간다"], // 단서 획득
    ["descend", "등불을 앞세워 내려간다"], // 기록고 문 이동
    ["use-thread", "은빛 실로 끊어진 문양을 잇는다"], // 단서 사용
    ["read-last-page", "리라의 마지막 기록을 읽는다"], // 마지막 기록
    ["walk-with-lyra", "리라와 함께 숲의 심장으로 간다"], // 심장 이동
    ["align-records", "흩어진 이름을 차례로 맞춘다"], // 봉인 준비
    ["carry-records", "기록을 밖으로 가져간다"], // 기록 귀환
    ["share-records", "사라진 이름들을 세상에 전한다"], // 진실 엔딩
] as const; // 경로 종료
