"use client"; // 클라이언트 컴포넌트

import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { SettingsPageHeader } from "@chatbot/features/settings/SettingsShell"; // 페이지 머리말
import styles from "@chatbot/features/settings/SettingsScreen.module.css"; // 설정 스타일

const appVersion = "1.0.0"; // 앱 버전

const faqs = [ // 자주 묻는 질문
    { question: "대화와 캐릭터는 어디에 저장되나요?", answer: "모두 지금 사용하는 브라우저에만 저장됩니다. 다른 기기로 옮기려면 개인정보 및 보안의 데이터 관리에서 JSON으로 내보낸 뒤 새 기기에서 가져오세요." }, // 저장 질문
    { question: "응답을 멈추거나 다시 생성하면 토큰이 쓰이나요?", answer: "응답을 중간에 멈춰도 요청 1회로 계산되고, 재시도와 다시 생성은 각각 새 요청으로 계산됩니다. 항목별 비용은 토큰 이용 내역에서 확인할 수 있습니다." }, // 토큰 질문
    { question: "보낸 메시지를 고치면 원래 대화는 사라지나요?", answer: "사라지지 않습니다. 메시지를 고치면 그 지점부터 새 버전이 만들어지고, 이전·다음 버튼으로 원래 대화와 오갈 수 있습니다." }, // 버전 질문
    { question: "내가 만든 캐릭터는 어디서 관리하나요?", answer: "내 캐릭터와 작품(보관함)에서 수정, 공개·임시 저장 전환, 삭제를 할 수 있습니다." }, // 캐릭터 질문
    { question: "캐릭터가 먼저 말을 걸어 오나요?", answer: "알림과 선제 메시지에서 허용 시간과 하루 횟수를 정할 수 있습니다. 지금은 설정만 저장되고 실제 발송은 발송 서버가 연결된 뒤 제공됩니다." }, // 선제 메시지 질문
    { question: "Text-Play는 무엇인가요?", answer: "선택지와 자유 입력으로 텍스트 게임을 플레이하는 Windows 프로그램입니다. 상단 메뉴의 Text-Play 다운로드에서 소개와 배포 상태를 확인할 수 있습니다." }, // Text-Play 질문
] as const; // 읽기 전용 목록

export function SupportScreen() // 고객 지원 화면
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    return ( // 화면 반환
        <> {/* 고객 지원 화면 */}
            <SettingsPageHeader kicker="SUPPORT · HELP" title="고객 지원" description="자주 묻는 질문을 확인하고, 문의할 때 필요한 앱 정보를 볼 수 있습니다." /> {/* 페이지 머리말 */}
            <section className={styles.card} aria-labelledby="support-faq-title"> {/* 질문 영역 */}
                <h2 id="support-faq-title">자주 묻는 질문</h2> {/* 질문 제목 */}
                <div className={styles.faqList}>{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div> {/* 질문 목록 */}
            </section> {/* 질문 영역 종료 */}
            <section className={styles.card} aria-labelledby="support-contact-title"> {/* 문의 영역 */}
                <h2 id="support-contact-title">문의하기</h2> {/* 문의 제목 */}
                <p className={styles.note}>문의 접수 창구는 서비스 운영 정책이 확정된 뒤 열립니다. 그동안 아래 앱 정보를 함께 적어 두면 문제를 확인하는 데 도움이 됩니다.</p> {/* 준비 안내 */}
                <dl className={styles.infoGrid}> {/* 앱 정보 */}
                    <div><dt>앱 버전</dt><dd>{appVersion}</dd></div> {/* 앱 버전 */}
                    <div><dt>데이터 버전</dt><dd>{state.schemaVersion}</dd></div> {/* 데이터 버전 */}
                    <div><dt>응답 방식</dt><dd>{state.providerMode === "mock" ? "로컬 Mock(외부 API 없음)" : state.providerMode}</dd></div> {/* 공급자 모드 */}
                </dl> {/* 앱 정보 종료 */}
            </section> {/* 문의 영역 종료 */}
        </> // 고객 지원 화면 종료
    ); // 반환 종료
} // 함수 종료
