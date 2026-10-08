// 영어 사전: 한국어 화면 글자 → 영어. 화면 묶음별 파일을 하나로 합친다.
import { ai } from "@chatbot/lib/i18n/en/ai"; // 연습용 AI가 만드는 내용
import { character } from "@chatbot/lib/i18n/en/character"; // 캐릭터 상세·편집기
import { data } from "@chatbot/lib/i18n/en/data"; // 저장된 값의 표시 이름
import { chat } from "@chatbot/lib/i18n/en/chat"; // 채팅 화면
import { discovery } from "@chatbot/lib/i18n/en/discovery"; // 메인·탐색·성인 인증·대화 목록
import { more } from "@chatbot/lib/i18n/en/more"; // 이미지 스튜디오·보관함·초대·출석과 미션·스토리 모드·Text-Play
import { settings } from "@chatbot/lib/i18n/en/settings"; // 설정 페이지·고객 지원
import { shell } from "@chatbot/lib/i18n/en/shell"; // 공통 메뉴·기본 화면

export const en: Record<string, string> = { ...shell, ...discovery, ...character, ...chat, ...settings, ...more, ...data, ...ai }; // 영어 사전
