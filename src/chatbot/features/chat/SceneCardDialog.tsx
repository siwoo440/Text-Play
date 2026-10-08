"use client"; // 클라이언트 컴포넌트

import { useState } from "react"; // 리액트 상태
import { ChatDialog } from "@chatbot/features/chat/ChatDialog"; // 대화상자
import { SCENE_CARD_HEIGHT, SCENE_CARD_TEXT_LIMIT, SCENE_CARD_WIDTH, sceneCardFileName, toCardText, toPlainText, wrapCardLines } from "@chatbot/features/chat/review-model"; // 카드 규칙
import panels from "@chatbot/features/chat/ChatPanels.module.css"; // 대화상자 버튼 스타일
import styles from "@chatbot/features/chat/SceneCard.module.css"; // 카드 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

interface SceneCardDialogProps // 명장면 카드 속성
{ // 구조 시작
    title: string; // 작품 이름
    speaker: string; // 말한 인물(스토리는 스토리 이름)
    content: string; // 답변 내용
    image: string | null; // 배경으로 쓸 장면 그림
    onClose(): void; // 닫기
} // 구조 종료

const fontFamily = "'Pretendard Variable', Pretendard, 'Noto Sans KR', 'Malgun Gothic', system-ui, sans-serif"; // 카드 글꼴

function loadImage(src: string): Promise<HTMLImageElement | null> // 배경 그림 불러오기(실패하면 없음)
{ // 함수 시작
    return new Promise((resolve) => // 약속 생성
    { // 약속 시작
        const image = new window.Image(); // 그림 요소
        image.addEventListener("load", () => resolve(image)); // 불러옴
        image.addEventListener("error", () => resolve(null)); // 실패
        image.src = src; // 주소 지정
    }); // 약속 종료
} // 함수 종료

async function drawSceneCard(input: { title: string; speaker: string; text: string; image: string | null }): Promise<Blob | null> // 카드 이미지를 그려 파일 내용으로 만들기
{ // 함수 시작
    const canvas = document.createElement("canvas"); // 그림판
    canvas.width = SCENE_CARD_WIDTH; // 너비
    canvas.height = SCENE_CARD_HEIGHT; // 높이
    const context = canvas.getContext("2d"); // 그리기 도구
    if (context === null) // 그릴 수 없음
    { // 조건 시작
        return null; // 실패
    } // 조건 종료
    const base = context.createLinearGradient(0, 0, SCENE_CARD_WIDTH, SCENE_CARD_HEIGHT); // 기본 배경
    base.addColorStop(0, "#2a1f4d"); // 보라
    base.addColorStop(1, "#0f172a"); // 남색
    context.fillStyle = base; // 배경 색
    context.fillRect(0, 0, SCENE_CARD_WIDTH, SCENE_CARD_HEIGHT); // 배경 채움
    const picture = input.image === null ? null : await loadImage(input.image); // 장면 그림
    if (picture !== null && picture.naturalWidth > 0) // 그림 있음
    { // 조건 시작
        const scale = Math.max(SCENE_CARD_WIDTH / picture.naturalWidth, SCENE_CARD_HEIGHT / picture.naturalHeight); // 가득 채우는 배율
        const width = picture.naturalWidth * scale; // 그릴 너비
        const height = picture.naturalHeight * scale; // 그릴 높이
        context.drawImage(picture, (SCENE_CARD_WIDTH - width) / 2, (SCENE_CARD_HEIGHT - height) / 2, width, height); // 가운데 맞춰 채움
    } // 조건 종료
    const shade = context.createLinearGradient(0, SCENE_CARD_HEIGHT * 0.28, 0, SCENE_CARD_HEIGHT); // 글자 뒤 어둠
    shade.addColorStop(0, "rgba(10, 8, 20, 0)"); // 위는 투명
    shade.addColorStop(0.55, "rgba(10, 8, 20, 0.78)"); // 가운데부터 어둡게
    shade.addColorStop(1, "rgba(10, 8, 20, 0.94)"); // 아래는 진하게
    context.fillStyle = shade; // 어둠 색
    context.fillRect(0, 0, SCENE_CARD_WIDTH, SCENE_CARD_HEIGHT); // 어둠 채움
    const margin = 84; // 좌우 여백
    context.textBaseline = "alphabetic"; // 글자 기준선
    context.fillStyle = "#ffffff"; // 흰 글자
    context.font = `600 46px ${fontFamily}`; // 본문 글꼴
    const lines = wrapCardLines(input.text, SCENE_CARD_WIDTH - margin * 2, (value) => context.measureText(value).width); // 줄 나누기
    const lineHeight = 70; // 줄 높이
    const footer = SCENE_CARD_HEIGHT - 150; // 아래 정보 자리
    let y = footer - 70 - (lines.length - 1) * lineHeight; // 첫 줄 자리(아래에서 위로 쌓음)
    context.font = `800 34px ${fontFamily}`; // 인물 글꼴
    context.fillStyle = "#d8ccff"; // 연보라 글자
    context.fillText(input.speaker, margin, y - 78); // 인물 이름
    context.font = `600 46px ${fontFamily}`; // 본문 글꼴
    context.fillStyle = "#ffffff"; // 흰 글자
    for (const line of lines) // 줄 순회
    { // 순회 시작
        context.fillText(line, margin, y); // 한 줄
        y += lineHeight; // 다음 줄
    } // 순회 종료
    context.fillStyle = "rgba(255, 255, 255, 0.28)"; // 구분선 색
    context.fillRect(margin, footer, SCENE_CARD_WIDTH - margin * 2, 2); // 구분선
    context.font = `700 30px ${fontFamily}`; // 작품 글꼴
    context.fillStyle = "rgba(255, 255, 255, 0.86)"; // 작품 글자
    context.fillText(input.title, margin, footer + 62); // 작품 이름
    context.textAlign = "right"; // 오른쪽 정렬
    context.font = `800 30px ${fontFamily}`; // 서비스 글꼴
    context.fillText("Mate Verse", SCENE_CARD_WIDTH - margin, footer + 62); // 서비스 이름
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png")); // 파일 내용 반환
} // 함수 종료

export function SceneCardDialog({ title, speaker, content, image, onClose }: SceneCardDialogProps) // 명장면 카드(장면 그림 위에 대사를 얹어 이미지로 저장)
{ // 함수 시작
    const [text, setText] = useState(() => toCardText(content)); // 카드에 넣을 글
    const [status, setStatus] = useState(""); // 안내
    const [saving, setSaving] = useState(false); // 저장 중
    const cardText = toPlainText(text); // 정리한 글
    const save = async () => // 이미지로 저장
    { // 함수 시작
        setSaving(true); // 저장 시작
        try // 저장 시도
        { // 시도 시작
            const blob = await drawSceneCard({ title, speaker, text: cardText, image }); // 카드 그리기
            if (blob === null) // 그리지 못함
            { // 조건 시작
                throw new Error("scene-card-failed"); // 실패
            } // 조건 종료
            const url = URL.createObjectURL(blob); // 임시 주소
            const anchor = document.createElement("a"); // 링크 요소
            anchor.href = url; // 주소 지정
            anchor.download = sceneCardFileName(title, new Date()); // 파일 이름
            anchor.click(); // 내려받기
            URL.revokeObjectURL(url); // 임시 주소 해제
            setStatus(t("명장면 카드를 이미지로 저장했습니다.")); // 성공 안내
        } // 시도 종료
        catch // 저장 실패
        { // 실패 시작
            setStatus(t("이미지로 저장하지 못했습니다. 글 복사를 이용해 주세요.")); // 실패 안내
        } // 실패 종료
        finally // 정리
        { // 정리 시작
            setSaving(false); // 저장 종료
        } // 정리 종료
    }; // 함수 종료
    const copy = async () => // 글 복사
    { // 함수 시작
        try // 복사 시도
        { // 시도 시작
            await navigator.clipboard.writeText(`“${cardText}”\n— ${speaker}, ${title}`); // 클립보드 쓰기
            setStatus(t("카드 글을 복사했습니다.")); // 성공 안내
        } // 시도 종료
        catch // 복사 실패
        { // 실패 시작
            setStatus(t("글을 복사하지 못했습니다.")); // 실패 안내
        } // 실패 종료
    }; // 함수 종료
    const empty = cardText.length === 0; // 빈 글
    return ( // 대화상자 반환
        <ChatDialog title={t("명장면 카드")} description={t("마음에 든 장면을 그림 한 장으로 남겨요. 글은 고칠 수 있어요.")} onClose={onClose} wide footer={<><button type="button" className={panels.secondaryButton} disabled={empty} onClick={() => void copy()}>{t("글 복사")}</button><button type="button" className={panels.primaryButton} disabled={empty || saving} onClick={() => void save()}>{t("이미지로 저장")}</button></>}> {/* 명장면 카드 */}
            <div className={styles.layout}> {/* 미리보기와 입력 */}
                <figure className={styles.card} aria-label={t("카드 미리보기")} style={image === null ? undefined : { backgroundImage: `url("${image}")` }}> {/* 카드 미리보기 */}
                    <div className={styles.cardShade}> {/* 글자 뒤 어둠 */}
                        <strong>{speaker}</strong> {/* 인물 */}
                        <p>{empty ? t("카드에 넣을 글을 적어 주세요.") : cardText}</p> {/* 대사 */}
                        <figcaption><span>{title}</span><b>Mate Verse</b></figcaption> {/* 작품과 서비스 이름 */}
                    </div> {/* 어둠 종료 */}
                </figure> {/* 미리보기 종료 */}
                <div className={styles.side}> {/* 입력 */}
                    <label className={styles.field}>{t("카드에 넣을 글")}<textarea value={text} rows={7} maxLength={SCENE_CARD_TEXT_LIMIT} onChange={(event) => { setText(event.target.value); setStatus(""); }} /></label> {/* 글 */}
                    <p className={styles.count}>{text.length}/{SCENE_CARD_TEXT_LIMIT}{t("자 · 저장 크기")} {SCENE_CARD_WIDTH}×{SCENE_CARD_HEIGHT}</p> {/* 글자 수와 크기 */}
                    {status.length === 0 ? null : <p className={styles.status} role="status" aria-label={t("카드 안내")}>{status}</p>} {/* 안내 */}
                </div> {/* 입력 종료 */}
            </div> {/* 묶음 종료 */}
        </ChatDialog> // 카드 종료
    ); // 반환 종료
} // 함수 종료
