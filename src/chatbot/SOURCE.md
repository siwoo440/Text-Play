---
# ChatBot 원본 기록

이 폴더는 `scripts/sync-chatbot.mjs`가 [siwoo440/ChatBot](https://github.com/siwoo440/ChatBot)의 커밋에서 만든 소스 사본입니다. 작업 폴더의 커밋하지 않은 수정은 가져오지 않습니다. 직접 고치지 말고 ChatBot에서 고쳐 커밋한 뒤 다시 동기화합니다.

- 원본 커밋: `0c4e7c8ff11755aebe140619723222ccb1457545` (`쓰이지 않는 파일 정리와 패키지 이름 변경`)
- 범위: `src/app`·`components`·`features`·`lib`·`mocks`·`test`, `tests/unit`·`components`·`integration`, 테스트가 쓰는 `scripts/i18n-keys.ts`(→ `tests/chatbot/scripts`), Text-Play에 없는 `public` 자산
- 변환: `@/` → `@chatbot/`, `next/link`·`next/image`·`next/navigation`·`Route` 타입 → `@/desktop/next-compat/*`, 테스트의 `../../scripts/` → `../scripts/`
- 동기화: `node scripts/sync-chatbot.mjs <ChatBot 저장소 경로> [커밋, 기본 origin/main]`
