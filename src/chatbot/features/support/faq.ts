// 자주 묻는 질문: 주제로 나누고 검색어(초성 포함)로 찾는다.
import { matchesKoreanText } from "@chatbot/features/conversation/conversation-list-model"; // 초성 포함 검색
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export type FaqTopic = "data" | "token" | "chat" | "create" | "etc"; // 질문 주제

export interface FaqEntry // 질문 한 개
{ // 구조 시작
    topic: FaqTopic; // 주제
    question: string; // 질문
    answer: string; // 답
} // 구조 종료

export const faqTopics: Array<{ id: FaqTopic; label: string }> = [{ id: "data", label: "저장과 데이터" }, { id: "token", label: "토큰" }, { id: "chat", label: "대화" }, { id: "create", label: "만들기" }, { id: "etc", label: "기타" }]; // 주제 목록

export const faqs: readonly FaqEntry[] = [ // 자주 묻는 질문
    { topic: "data", question: "대화와 캐릭터는 어디에 저장되나요?", answer: "모두 지금 사용하는 브라우저에만 저장됩니다. 다른 기기로 옮기려면 개인정보 및 보안의 데이터 관리에서 JSON으로 내보낸 뒤 새 기기에서 가져오세요." }, // 저장 질문
    { topic: "data", question: "AI가 기억하는 내용을 보거나 지울 수 있나요?", answer: "개인정보 및 보안의 요약 메모리에서 대화방별로 모아 보고 지울 수 있습니다. 내용을 고치려면 그 대화방의 채팅방 설정에서 요약 메모리를 여세요." }, // 메모리 질문
    { topic: "token", question: "응답을 멈추거나 다시 생성하면 토큰이 쓰이나요?", answer: "응답을 중간에 멈춰도 요청 1회로 계산되고, 재시도와 다시 생성은 각각 새 요청으로 계산됩니다. 항목별 비용은 토큰 이용 내역에서 확인할 수 있습니다." }, // 토큰 질문
    { topic: "token", question: "토큰은 어떻게 받나요?", answer: "출석과 미션에서 매일 출석하고 미션을 채우면 토큰을 받습니다. 친구 초대 링크로 들어온 사람도 보너스를 받습니다. 받은 내역과 쓴 내역은 토큰 이용 내역에 남습니다." }, // 받기 질문
    { topic: "chat", question: "보낸 메시지를 고치면 원래 대화는 사라지나요?", answer: "사라지지 않습니다. 메시지를 고치면 그 지점부터 새 버전이 만들어지고, 이전·다음 버튼으로 원래 대화와 오갈 수 있습니다." }, // 버전 질문
    { topic: "chat", question: "채팅방 설정이 화면을 가려요. 위치를 바꿀 수 있나요?", answer: "화면 레이아웃에서 서랍형, 옆 열 좁게, 옆 열 넓게 가운데 고를 수 있습니다. 휴대폰처럼 좁은 화면에서는 항상 서랍형으로 보입니다." }, // 레이아웃 질문
    { topic: "chat", question: "캐릭터가 먼저 말을 걸어 오나요?", answer: "알림과 선제 메시지에서 허용 시간과 하루 횟수를 정할 수 있습니다. 지금은 설정만 저장되고 실제 발송은 발송 서버가 연결된 뒤 제공됩니다." }, // 선제 메시지 질문
    { topic: "create", question: "내가 만든 캐릭터는 어디서 관리하나요?", answer: "내 캐릭터와 작품(보관함)에서 수정, 공개·임시 저장 전환, 삭제를 할 수 있습니다." }, // 캐릭터 질문
    { topic: "create", question: "만들던 작품을 저장하기 전에 시험해 볼 수 있나요?", answer: "편집 화면 아래의 시험 대화로 지금 내용 그대로 대화해 볼 수 있습니다. 토큰을 쓰지 않고 기록도 남지 않으며 10턴까지 가능합니다." }, // 시험 대화 질문
    { topic: "create", question: "세계관 설정이 길어요. 어떻게 넣나요?", answer: "키워드 설정집에 장소·인물·규칙을 나눠 적어 두면, 대화에 키워드가 나올 때만 AI에게 알려 줍니다. 말투는 예시 대화로 보여 줄 수 있습니다." }, // 설정집 질문
    { topic: "etc", question: "Text-Play는 무엇인가요?", answer: "선택지와 자유 입력으로 텍스트 게임을 플레이하는 Windows 프로그램입니다. 상단 메뉴의 Text-Play 다운로드에서 소개와 배포 상태를 확인할 수 있습니다." }, // Text-Play 질문
]; // 목록 종료

export function filterFaqs(query: string, topic: FaqTopic | "all", entries: readonly FaqEntry[] = faqs): FaqEntry[] // 주제와 검색어로 질문 고르기
{ // 함수 시작
    return entries.filter((entry) => (topic === "all" || entry.topic === topic) && [entry.question, entry.answer, t(entry.question), t(entry.answer)].some((text) => matchesKoreanText(text, query))); // 조건에 맞는 질문(지금 화면 언어의 글자로도 찾음)
} // 함수 종료
