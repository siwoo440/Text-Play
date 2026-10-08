// 대화 버전 삭제 확인 문구: 지우려는 버전에 딸린 하위 버전 수와 메시지 수를 알려 준다.
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export function getVersionDeleteConfirmText(versionCount: number, messageCount: number): string // 삭제 확인 문구(versionCount는 지우려는 버전 자신을 포함한 수)
{ // 함수 시작
    const children = Math.max(versionCount - 1, 0); // 하위 버전 수(자신은 뺌)
    return children === 0 ? t("현재 수정 버전과 메시지 {0}개를 삭제할까요?", [messageCount]) : t("현재 수정 버전과 하위 버전 {0}개, 메시지 {1}개를 삭제할까요?", [children, messageCount]); // 하위 버전이 없으면 그 말을 뺌
} // 함수 종료
