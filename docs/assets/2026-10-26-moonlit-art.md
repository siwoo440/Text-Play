---
# 달빛 숲의 기록 — 장면 이미지 제작 기록

2026-10-26에 내장 `image_gen` 도구로 새로 생성한 그림 10개입니다. 저장소의 `public/images/text-play/moonlit/`에 PNG 원본을 복사했습니다. 실행 중 이미지 생성 서버를 호출하지 않으며 웹·EXE에 같은 파일을 포함합니다. SVG나 벡터 파일이 아닌 배경용 래스터 이미지입니다.

---
## 파일과 사용 장면

| 파일 | 용도 | 생성 원본 파일명 |
| --- | --- | --- |
| forest.png | 숲 입구·뿌리 갈림길·작품 표지 | exec-a6f72f5a-1a2f-47b1-9839-809c2eba8e54.png |
| hall.png | 폐허 회랑 | exec-60f685d7-941b-4a6d-804a-fd910c1cb7fd.png |
| study.png | 봉인된 서재·기록관의 편지 | exec-0a0a8e86-d2ad-48b8-b93e-1288bfedd2e6.png |
| lake.png | 거울 호수·물 위의 기억 | exec-c757b6ae-3232-40b7-b3c2-9a0550d52320.png |
| tower.png | 무너진 종탑·마지막 종소리 | exec-038a921f-c498-4fbc-8c59-f4ee2d616cda.png |
| stairs.png | 잠긴 계단·기록고 문 | exec-9a714882-04e0-4733-9e3a-6770af973569.png |
| archive.png | 지하 기록고·리라의 기억 | exec-a63c0832-0b36-48c5-9ba8-cd0ef4e616de.png |
| heart.png | 숲의 심장·마지막 봉인 | exec-bb547b1a-09f8-4cc6-a8fb-86632a412eba.png |
| truth.png | 기록 귀환·진실 엔딩 | exec-41e7564a-651d-46e1-95af-20f76e080468.png |
| retreat.png | 돌아가는 길 엔딩 | exec-6ff227cd-b14e-42ef-88e5-3974d4390779.png |

생성 원본 폴더는 `C:/Users/user/.codex/generated_images/01a0e195-3b0e-7f43-9c96-a47a213d2d4f`입니다. 이 폴더는 작업한 PC에만 존재하며 다른 컴퓨터에서는 저장소의 PNG를 사용합니다. 각 파일은 1672×941이며 전체 용량은 약 32MB입니다. 생성 도구가 모델 식별자를 반환하지 않아 모델명은 기록하지 않습니다.

---
## 공통 프롬프트

> Use case: stylized-concept. Asset type: finished wide 16:9 visual-novel fantasy mystery game background for Moonlit Forest Records. Detailed painterly cinematic environment, delicate anime background influence, believable weathered stone and organic bark textures. Consistent restrained indigo, teal, silver and warm amber palette; subtle magical moonlight. Main action area in upper two-thirds; lower quarter quiet for a translucent story box. No people, no letters, no text, no UI, no panels, no border, no watermark. One coherent landscape scene, not a collage.

---
## 장면별 지시 요약과 확인

숲과 폐허 회랑에는 은빛 안개·고목·등불, 서재에는 먼지 낀 책과 문서를 배치했습니다. 호수에는 빈 배·반사되는 달·은빛 실, 종탑에는 오래된 청동 종·공명 열쇠를 지시했습니다. 계단에는 우물 아래의 나선 통로, 기록고에는 나무뿌리와 지하 서가, 숲의 심장에는 뿌리 사이 결정과 빛을 사용했습니다. 진실 엔딩은 따뜻한 새벽·열린 기록, 귀환 엔딩은 숲 경계·닫힌 기록으로 구분했습니다.

10개 생성 결과를 직접 열어 색감·문자나 UI 혼입·배경 용도를 확인했습니다. 분기 그림의 실제 로딩과 저장 후 과거 턴 이미지 복원은 브라우저 종단 테스트로 별도 확인합니다. 원본 생성 파일을 삭제하거나 외부 검색 이미지를 사용하지 않았습니다.
