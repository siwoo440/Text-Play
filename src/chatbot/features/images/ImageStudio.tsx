"use client"; // 클라이언트 컴포넌트

import type { Route } from "@/desktop/next-compat/route"; // 경로 타입
import Image from "@/desktop/next-compat/image"; // 최적화 이미지
import Link from "@/desktop/next-compat/link"; // 내부 링크
import { useState } from "react"; // 리액트 상태
import { canViewMatureContent, contentRatingLabels } from "@chatbot/features/adult/adult-access"; // 19세 판정·등급 문구
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import type { ContentRating, GeneratedImage, ImageAspect, ImageStyle } from "@chatbot/features/core/types"; // 도메인 타입
import { checkImageRequest, createGeneratedImage, getImageSize, IMAGE_PROMPT_LIMIT, imageAspectLabels, imageStyleLabels } from "@chatbot/features/images/image-model"; // 이미지 모델
import { getStoryCandidates } from "@chatbot/features/story/story-validation"; // 참고 캐릭터 후보
import { getRegionPolicy, getServiceRegion } from "@chatbot/lib/config/service-region"; // 지역 정책
import { tokenCosts, trySpend } from "@chatbot/lib/story/token-policy"; // 토큰 비용
import styles from "@chatbot/features/images/ImageStudio.module.css"; // 스튜디오 스타일

type GalleryFilter = "all" | "favorite"; // 갤러리 필터

const ratingShortLabels: Record<ContentRating, string> = { all: "전체", teen: "15+", mature: "19+" }; // 등급 짧은 표시
const exposureLabels = { none: "", covered: "가림 처리", uncovered: "가림 없음" } as const; // 가림 처리 표시
const studioCost = tokenCosts["studio-image"]; // 생성 비용

export function ImageStudio() // 이미지 스튜디오
{ // 함수 시작
    const { state, dispatch, createBackup } = useAppStore(); // 앱 상태
    const [prompt, setPrompt] = useState(""); // 장면 설명
    const [style, setStyle] = useState<ImageStyle>("anime"); // 그림체
    const [aspect, setAspect] = useState<ImageAspect>("portrait"); // 비율
    const [rating, setRating] = useState<ContentRating>("all"); // 이용 등급
    const [referenceId, setReferenceId] = useState(""); // 참고 캐릭터
    const [notice, setNotice] = useState(""); // 성공 안내
    const [error, setError] = useState(""); // 오류 안내
    const [latestId, setLatestId] = useState<string | null>(null); // 방금 만든 이미지
    const [filter, setFilter] = useState<GalleryFilter>("all"); // 갤러리 필터
    const [deleteTarget, setDeleteTarget] = useState<GeneratedImage | null>(null); // 삭제 대상
    const showMature = canViewMatureContent(state, new Date()); // 19+ 표시 여부
    const policy = getRegionPolicy(); // 지역 정책
    const candidates = getStoryCandidates(state, showMature); // 참고 캐릭터 후보
    const latest = latestId === null ? undefined : state.images.find((image) => image.id === latestId); // 방금 만든 이미지
    const visibleImages = filter === "favorite" ? state.images.filter((image) => image.favorite) : state.images; // 필터 결과
    const generate = () => // 이미지 만들기
    { // 함수 시작
        setNotice(""); // 안내 초기화
        const check = checkImageRequest({ prompt, contentRating: rating }); // 금지 검사
        if (!check.ok) // 거부 판정
        { // 조건 시작
            setError(check.message); // 거부 이유
            return; // 생성 중단
        } // 조건 종료
        if (rating === "mature" && !showMature) // 19세 권한 판정
        { // 조건 시작
            setError("19세 이미지는 성인 인증 후 19+를 켜야 만들 수 있어요."); // 권한 오류
            return; // 생성 중단
        } // 조건 종료
        const now = new Date().toISOString(); // 생성 시각
        const spending = trySpend(state.wallet, "studio-image", now); // 토큰 차감
        if (!spending.ok) // 잔액 부족 판정
        { // 조건 시작
            setError(`토큰이 부족해요. 남은 토큰 ${state.wallet.balance}개, 필요한 토큰 ${studioCost}개입니다.`); // 부족 안내
            return; // 생성 중단
        } // 조건 종료
        const id = `image-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; // 이미지 식별자
        const image = createGeneratedImage({ prompt, style, aspect, referenceCharacterId: referenceId.length === 0 ? null : referenceId, contentRating: rating }, getServiceRegion(), now, id); // 이미지 생성(Mock)
        dispatch({ type: "add-image", image, wallet: spending.wallet }); // 저장과 차감
        dispatch({ type: "add-notification", notification: { id: `notice-${id}`, kind: "image", title: "이미지가 완성됐어요", body: prompt.trim().slice(0, 60), href: "/images", read: false, createdAt: now } }); // 알림함에 완성 알림
        setLatestId(id); // 결과 표시
        setError(""); // 오류 지우기
        setNotice("이미지를 만들어 내 이미지에 저장했어요."); // 성공 안내
    }; // 함수 종료
    const remove = () => // 이미지 삭제
    { // 함수 시작
        if (deleteTarget === null) // 대상 부재 판정
        { // 조건 시작
            return; // 삭제 중단
        } // 조건 종료
        setDeleteTarget(null); // 대화상자 닫기
        if (!createBackup("image-delete")) // 백업 실패 판정
        { // 조건 시작
            return; // 삭제 중단(저장소 오류 안내는 공통 틀이 표시)
        } // 조건 종료
        dispatch({ type: "delete-image", imageId: deleteTarget.id }); // 이미지 삭제
    }; // 함수 종료
    return ( // 화면 반환
        <main className={styles.page} data-surface="light"> {/* 이미지 스튜디오 */}
            <header className={styles.header}> {/* 머리말 */}
                <div> {/* 머리말 문구 */}
                    <span className={styles.eyebrow}>IMAGE STUDIO</span> {/* 표제 */}
                    <h1>이미지 <span className={styles.titleHighlight}>스튜디오</span></h1> {/* 제목 */}
                    <p>장면을 글로 설명하면 이미지를 만들어 내 이미지에 저장해요. 만든 이미지는 캐릭터 대표 이미지, 스토리 표지, 대화 장면으로 쓸 수 있어요.</p> {/* 설명 */}
                </div> {/* 문구 종료 */}
                <span className={styles.balance}>남은 토큰 <strong>{state.wallet.balance}</strong></span> {/* 잔액 */}
            </header> {/* 머리말 종료 */}
            <div className={styles.workspace}> {/* 작업 영역 */}
                <form className={styles.form} onSubmit={(event) => { event.preventDefault(); generate(); }}> {/* 생성 양식 */}
                    <label className={styles.field}>장면 설명<textarea value={prompt} maxLength={IMAGE_PROMPT_LIMIT} rows={4} placeholder="예: 비 그친 밤, 기록관 창가에서 책을 펼친 사서" onChange={(event) => setPrompt(event.target.value)} /></label> {/* 설명 입력 */}
                    <span className={styles.counter} aria-hidden="true">{prompt.length}/{IMAGE_PROMPT_LIMIT}</span> {/* 글자 수 */}
                    <fieldset className={styles.chips}> {/* 그림체 */}
                        <legend>그림체</legend> {/* 그림체 제목 */}
                        {(Object.keys(imageStyleLabels) as ImageStyle[]).map((item) => <label key={item} data-selected={style === item ? "true" : undefined}><input type="radio" name="image-style" value={item} checked={style === item} onChange={() => setStyle(item)} />{imageStyleLabels[item]}</label>)} {/* 그림체 선택 */}
                    </fieldset> {/* 그림체 종료 */}
                    <fieldset className={styles.chips}> {/* 비율 */}
                        <legend>비율</legend> {/* 비율 제목 */}
                        {(Object.keys(imageAspectLabels) as ImageAspect[]).map((item) => <label key={item} data-selected={aspect === item ? "true" : undefined}><input type="radio" name="image-aspect" value={item} checked={aspect === item} onChange={() => setAspect(item)} />{imageAspectLabels[item]}</label>)} {/* 비율 선택 */}
                    </fieldset> {/* 비율 종료 */}
                    <div className={styles.row}> {/* 선택 줄 */}
                        <label className={styles.field}>참고 캐릭터<select value={referenceId} onChange={(event) => setReferenceId(event.target.value)}><option value="">선택 안 함</option>{candidates.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label> {/* 참고 캐릭터 */}
                        <label className={styles.field}>이용 등급<select value={rating} onChange={(event) => setRating(event.target.value as ContentRating)}><option value="all">{contentRatingLabels.all}</option><option value="teen">{contentRatingLabels.teen}</option><option value="mature" disabled={!showMature}>{contentRatingLabels.mature}</option></select></label> {/* 이용 등급 */}
                    </div> {/* 선택 줄 종료 */}
                    <div className={styles.rules} role="note" aria-label="이미지 생성 규칙"> {/* 생성 규칙 */}
                        <strong>{policy.label}</strong> {/* 지역 */}
                        <p>{policy.notice}</p> {/* 지역 정책 */}
                        <ul> {/* 금지 항목 */}
                            <li>미성년자로 보이는 인물은 19세 이미지로 만들 수 없어요.</li> {/* 미성년자 */}
                            <li>실존 인물을 그리거나 사진·얼굴을 합성할 수 없어요.</li> {/* 실존 인물 */}
                        </ul> {/* 목록 종료 */}
                        {showMature ? null : <p className={styles.muted}>19세 이용가는 성인 인증 후 헤더의 19+를 켜면 고를 수 있어요.</p>} {/* 19세 안내 */}
                    </div> {/* 규칙 종료 */}
                    <button type="submit" className={styles.generate}>이미지 만들기 · {studioCost} 토큰</button> {/* 생성 버튼 */}
                    {error.length === 0 ? null : <p className={styles.error} role="alert">{error}</p>} {/* 오류 안내 */}
                    <p className={styles.notice} role="status" aria-label="생성 상태">{notice}</p> {/* 성공 안내 */}
                </form> {/* 양식 종료 */}
                <section className={styles.result} aria-label="방금 만든 이미지"> {/* 결과 */}
                    {latest === undefined ? <div className={styles.placeholder}><strong>아직 만든 이미지가 없어요</strong><p>왼쪽에 장면을 적고 이미지 만들기를 눌러 보세요. 지금은 Mock 단계라 실제 그림 대신 설명에 맞춘 견본 그림이 나와요.</p></div> : <ImageCard image={latest} locked={false} large onFavorite={() => dispatch({ type: "toggle-image-favorite", imageId: latest.id })} onDelete={() => setDeleteTarget(latest)} />} {/* 결과 카드 */}
                </section> {/* 결과 종료 */}
            </div> {/* 작업 영역 종료 */}
            <section className={styles.gallery} aria-label="내 이미지"> {/* 갤러리 */}
                <div className={styles.galleryHead}> {/* 갤러리 머리 */}
                    <h2>내 이미지 <span>{state.images.length}</span></h2> {/* 제목 */}
                    <div className={styles.tabs} role="tablist" aria-label="내 이미지 보기"> {/* 필터 */}
                        <button type="button" role="tab" aria-label="전체" aria-selected={filter === "all"} onClick={() => setFilter("all")}>전체 {state.images.length}</button> {/* 전체 */}
                        <button type="button" role="tab" aria-label="즐겨찾기" aria-selected={filter === "favorite"} onClick={() => setFilter("favorite")}>즐겨찾기 {state.images.filter((image) => image.favorite).length}</button> {/* 즐겨찾기 */}
                    </div> {/* 필터 종료 */}
                </div> {/* 머리 종료 */}
                {visibleImages.length === 0 ? <p className={styles.empty}>{filter === "favorite" ? "즐겨찾기한 이미지가 없어요." : "만든 이미지가 여기에 모여요."}</p> : <div className={styles.grid}>{visibleImages.map((image) => <ImageCard key={image.id} image={image} locked={image.contentRating === "mature" && !showMature} onFavorite={() => dispatch({ type: "toggle-image-favorite", imageId: image.id })} onDelete={() => setDeleteTarget(image)} />)}</div>} {/* 이미지 목록 */}
            </section> {/* 갤러리 종료 */}
            {deleteTarget === null ? null : ( // 삭제 대화상자 판정
                <div className={styles.dialogBackdrop}> {/* 배경 */}
                    <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="image-delete-title"> {/* 삭제 대화상자 */}
                        <h2 id="image-delete-title">이미지 삭제</h2> {/* 제목 */}
                        <p>‘{deleteTarget.prompt}’ 이미지를 내 이미지에서 지웁니다. 캐릭터·스토리 표지나 대화 장면에 이미 쓴 이미지는 그대로 남아요. 삭제 전에 백업을 만듭니다.</p> {/* 안내 */}
                        <div><button type="button" onClick={() => setDeleteTarget(null)}>취소</button><button type="button" className={styles.danger} onClick={remove}>이미지 삭제 확인</button></div> {/* 동작 */}
                    </section> {/* 대화상자 종료 */}
                </div> // 배경 종료
            )} {/* 삭제 판정 종료 */}
        </main> // 화면 종료
    ); // 반환 종료
} // 함수 종료

function ImageCard({ image, locked, large = false, onFavorite, onDelete }: { image: GeneratedImage; locked: boolean; large?: boolean; onFavorite(): void; onDelete(): void }) // 이미지 카드
{ // 함수 시작
    const size = getImageSize(image.aspect); // 이미지 크기
    const exposure = exposureLabels[image.exposure]; // 가림 처리 표시
    const name = locked ? "19세 이미지" : image.prompt; // 버튼 이름(잠긴 이미지는 설명을 숨김)
    return ( // 카드 반환
        <article className={styles.card} data-locked={locked ? "true" : undefined} data-large={large ? "true" : undefined}> {/* 카드 */}
            <div className={styles.media}> {/* 그림 */}
                <Image src={image.src} alt={locked ? "19세 이미지(잠김)" : image.prompt} width={size.width} height={size.height} unoptimized /> {/* 이미지 */}
                <span className={styles.rating} data-rating={image.contentRating}>{ratingShortLabels[image.contentRating]}{exposure.length === 0 ? "" : ` · ${exposure}`}</span> {/* 등급·가림 처리 */}
                {locked ? <span className={styles.lockText}>19+를 켜면 볼 수 있어요</span> : null} {/* 잠금 안내 */}
            </div> {/* 그림 종료 */}
            <div className={styles.cardBody}> {/* 본문 */}
                <p className={styles.prompt}>{locked ? "19세 이미지" : image.prompt}</p> {/* 설명 */}
                <small>{imageStyleLabels[image.style]} · {imageAspectLabels[image.aspect]} · {new Date(image.createdAt).toLocaleDateString("ko-KR")}</small> {/* 옵션 */}
                <div className={styles.cardActions}> {/* 동작 */}
                    <button type="button" aria-label={`${name} 즐겨찾기`} aria-pressed={image.favorite} onClick={onFavorite}>{image.favorite ? "★" : "☆"}</button> {/* 즐겨찾기 */}
                    {locked ? null : <Link href={`/characters/new?image=${encodeURIComponent(image.id)}` as Route} aria-label="캐릭터 대표 이미지로 쓰기">캐릭터로 쓰기</Link>} {/* 캐릭터 활용 */}
                    {locked ? null : <Link href={`/stories/new?image=${encodeURIComponent(image.id)}` as Route} aria-label="스토리 표지로 쓰기">스토리로 쓰기</Link>} {/* 스토리 활용 */}
                    <button type="button" className={styles.deleteButton} aria-label={`${name} 삭제`} onClick={onDelete}>삭제</button> {/* 삭제 */}
                </div> {/* 동작 종료 */}
            </div> {/* 본문 종료 */}
        </article> // 카드 종료
    ); // 반환 종료
} // 함수 종료
