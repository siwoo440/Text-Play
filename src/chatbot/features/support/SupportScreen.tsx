"use client"; // 클라이언트 컴포넌트

import { useState } from "react"; // 리액트 상태
import { useModelStatus } from "@chatbot/features/chat/use-model-status"; // 실제 AI 연결 상태
import { useAppStore } from "@chatbot/features/core/AppProvider"; // 앱 상태
import { describeResponseMode } from "@chatbot/features/settings/provider-summary"; // 응답 방식 안내
import { buildDiagnostics } from "@chatbot/features/settings/settings-insights"; // 진단 정보
import { SettingsPageHeader } from "@chatbot/features/settings/SettingsShell"; // 페이지 머리말
import { faqTopics, filterFaqs, type FaqTopic } from "@chatbot/features/support/faq"; // 자주 묻는 질문
import styles from "@chatbot/features/settings/SettingsScreen.module.css"; // 설정 스타일
import { localeTag, t } from "@chatbot/lib/i18n"; // 화면 글자 번역·날짜 형식
import { RELEASE_NOTE_PREVIEW, releaseNotes } from "@chatbot/features/support/release-notes"; // 업데이트 소식
import { buildInquiryText, createInquiryDraft, INQUIRY_BODY_LIMIT, INQUIRY_TITLE_LIMIT, inquiryKinds, validateInquiry, type InquiryDraft, type InquiryKind } from "@chatbot/features/support/inquiry"; // 문의 초안

const appVersion = "1.0.0"; // 앱 버전

function formatNoteDate(date: string): string // 소식 날짜 표시
{ // 함수 시작
    return new Date(`${date}T00:00:00+09:00`).toLocaleDateString(localeTag(), { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Seoul" }); // 한국 날짜 반환
} // 함수 종료

function measureStorage(): number | null // 이 서비스가 브라우저에 저장한 용량(알 수 없으면 없음)
{ // 함수 시작
    try // 읽기 시도
    { // 시도 시작
        let bytes = 0; // 합계
        for (let index = 0; index < window.localStorage.length; index += 1) // 저장 항목 순회
        { // 순회 시작
            const key = window.localStorage.key(index); // 항목 이름
            if (key !== null && key.startsWith("mateverse:")) // 이 서비스 항목
            { // 조건 시작
                bytes += new Blob([key, window.localStorage.getItem(key) ?? ""]).size; // 이름과 값 크기
            } // 조건 종료
        } // 순회 종료
        return bytes; // 합계 반환
    } // 시도 종료
    catch // 읽기 실패
    { // 실패 시작
        return null; // 알 수 없음
    } // 실패 종료
} // 함수 종료

export function SupportScreen() // 고객 지원 화면
{ // 함수 시작
    const { state } = useAppStore(); // 앱 상태 조회
    const [query, setQuery] = useState(""); // 검색어
    const [topic, setTopic] = useState<FaqTopic | "all">("all"); // 고른 주제
    const [copyStatus, setCopyStatus] = useState(""); // 복사 안내
    const [draft, setDraft] = useState<InquiryDraft>(createInquiryDraft); // 문의 초안
    const [inquiryErrors, setInquiryErrors] = useState<{ title?: string; body?: string }>({}); // 문의 오류
    const [inquiryStatus, setInquiryStatus] = useState(""); // 문의 복사 안내
    const [allNotes, setAllNotes] = useState(false); // 지난 소식까지 보기
    const notes = allNotes ? releaseNotes : releaseNotes.slice(0, RELEASE_NOTE_PREVIEW); // 보여 줄 소식
    const results = filterFaqs(query, topic); // 조건에 맞는 질문
    const responseMode = describeResponseMode(useModelStatus()); // 응답 방식(연습용인지, 어느 등급이 실제 AI인지)
    const diagnostics = buildDiagnostics({ appVersion, state, responseMode, storageBytes: typeof window === "undefined" ? null : measureStorage(), viewport: typeof window === "undefined" ? null : { width: window.innerWidth, height: window.innerHeight }, userAgent: typeof navigator === "undefined" ? null : navigator.userAgent }); // 진단 정보
    const copyText = async (text: string): Promise<boolean> => // 글 복사(성공 여부)
    { // 함수 시작
        try // 복사 시도
        { // 시도 시작
            if (navigator.clipboard?.writeText === undefined) // 클립보드 부재 확인
            { // 조건 시작
                return false; // 복사 불가
            } // 조건 종료
            await navigator.clipboard.writeText(text); // 클립보드 쓰기
            return true; // 성공
        } // 시도 종료
        catch // 복사 실패
        { // 실패 시작
            return false; // 실패
        } // 실패 종료
    }; // 함수 종료
    const copyDiagnostics = async () => // 진단 정보 복사
    { // 함수 시작
        setCopyStatus(await copyText(diagnostics) ? t("진단 정보를 복사했습니다.") : t("복사하지 못했습니다. 아래 글을 직접 선택해 복사해 주세요.")); // 결과 안내
    }; // 함수 종료
    const inquiryText = buildInquiryText(draft, diagnostics); // 복사할 문의 글
    const copyInquiry = async () => // 문의 글 복사
    { // 함수 시작
        const errors = validateInquiry(draft); // 초안 검사
        setInquiryErrors(errors); // 오류 반영
        if (errors.title !== undefined || errors.body !== undefined) // 오류 있음
        { // 조건 시작
            setInquiryStatus(""); // 안내 지움
            return; // 복사하지 않음
        } // 조건 종료
        setInquiryStatus(await copyText(inquiryText) ? t("문의 글을 복사했습니다. 접수 창구가 열리면 그대로 붙여 넣어 보내 주세요.") : t("복사하지 못했습니다. 아래 미리보기를 직접 선택해 복사해 주세요.")); // 결과 안내
    }; // 함수 종료
    return ( // 화면 반환
        <> {/* 고객 지원 화면 */}
            <SettingsPageHeader kicker="SUPPORT · HELP" title={t("고객 지원")} description={t("자주 묻는 질문을 찾아보고, 문의할 때 필요한 앱 정보를 복사할 수 있습니다.")} /> {/* 페이지 머리말 */}
            <section className={styles.card} aria-labelledby="support-faq-title"> {/* 질문 영역 */}
                <h2 id="support-faq-title">{t("자주 묻는 질문")}</h2> {/* 질문 제목 */}
                <label className={styles.field}>{t("질문 검색")}<input type="search" value={query} placeholder={t("예: 토큰, 저장, ㅌㅋ")} onChange={(event) => setQuery(event.target.value)} /></label> {/* 검색 */}
                <div className={styles.filterRow} role="group" aria-label={t("질문 주제")}> {/* 주제 */}
                    <button type="button" aria-pressed={topic === "all"} onClick={() => setTopic("all")}>{t("전체")}</button> {/* 전체 */}
                    {faqTopics.map((item) => <button key={item.id} type="button" aria-pressed={topic === item.id} onClick={() => setTopic(item.id)}>{t(item.label)}</button>)} {/* 주제 순회 */}
                </div> {/* 주제 종료 */}
                <p className={styles.resultCount} role="status" aria-label={t("찾은 질문")}>{t("질문")} {results.length}{t("개")}</p> {/* 결과 수 */}
                {results.length === 0 ? <p className={styles.note}>{t("찾는 질문이 없어요. 다른 낱말로 찾아보거나 주제를 전체로 바꿔 보세요.")}</p> : <div className={styles.faqList}>{results.map((faq) => <details key={faq.question}><summary>{t(faq.question)}</summary><p>{t(faq.answer)}</p></details>)}</div>} {/* 질문 목록 */}
            </section> {/* 질문 영역 종료 */}
            <section id="news" className={styles.card} aria-labelledby="support-news-title"> {/* 업데이트 소식 */}
                <h2 id="support-news-title">{t("업데이트 소식")}</h2> {/* 소식 제목 */}
                <ol className={styles.noteList} aria-label={t("업데이트 소식 목록")}> {/* 소식 목록 */}
                    {notes.map((note) => <li key={note.date}><time dateTime={note.date}>{formatNoteDate(note.date)}</time><h3>{t(note.title)}</h3><ul>{note.items.map((item) => <li key={item}>{t(item)}</li>)}</ul></li>)} {/* 소식 */}
                </ol> {/* 목록 종료 */}
                {allNotes || releaseNotes.length <= RELEASE_NOTE_PREVIEW ? null : <button type="button" className={styles.secondary} onClick={() => setAllNotes(true)}>{t("지난 소식 더 보기 ({0})", [releaseNotes.length - RELEASE_NOTE_PREVIEW])}</button>} {/* 더 보기 */}
            </section> {/* 업데이트 소식 종료 */}
            <section id="contact" className={styles.card} aria-labelledby="support-contact-title"> {/* 문의 영역 */}
                <h2 id="support-contact-title">{t("문의하기")}</h2> {/* 문의 제목 */}
                <p className={styles.note}>{t("문의 접수 창구는 서비스 운영 정책이 확정된 뒤 열립니다. 그동안 문의 글을 미리 써서 복사해 둘 수 있어요.")}</p> {/* 준비 안내 */}
                <label className={styles.field}>{t("문의 종류")}<select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as InquiryKind })}>{inquiryKinds.map((item) => <option key={item.id} value={item.id}>{t(item.label)}</option>)}</select></label> {/* 종류 */}
                <label className={styles.field}>{t("제목")}<input value={draft.title} maxLength={INQUIRY_TITLE_LIMIT + 1} aria-invalid={inquiryErrors.title !== undefined} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label> {/* 제목 */}
                {inquiryErrors.title === undefined ? null : <p className={styles.error} role="alert">{inquiryErrors.title}</p>} {/* 제목 오류 */}
                <label className={styles.field}>{t("내용")}<textarea className={styles.diagnostics} rows={6} value={draft.body} maxLength={INQUIRY_BODY_LIMIT + 1} aria-invalid={inquiryErrors.body !== undefined} placeholder={t("어떤 화면에서 무엇을 했을 때 어떤 일이 있었는지 적어 주세요.")} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label> {/* 내용 */}
                <p className={styles.resultCount}>{draft.body.length}/{INQUIRY_BODY_LIMIT}</p> {/* 글자 수 */}
                {inquiryErrors.body === undefined ? null : <p className={styles.error} role="alert">{inquiryErrors.body}</p>} {/* 내용 오류 */}
                <label className={styles.check}><input type="checkbox" checked={draft.includeDiagnostics} onChange={(event) => setDraft({ ...draft, includeDiagnostics: event.target.checked })} />{t("진단 정보 함께 넣기")}</label> {/* 진단 정보 포함 */}
                <details className={styles.chartTable}> {/* 미리보기 */}
                    <summary>{t("복사될 글 미리보기")}</summary> {/* 펼침 */}
                    <pre className={styles.inquiryPreview}>{inquiryText}</pre> {/* 문의 글 */}
                </details> {/* 미리보기 종료 */}
                <button type="button" className={styles.primary} onClick={() => void copyInquiry()}>{t("문의 글 복사")}</button> {/* 복사 */}
                {inquiryStatus.length === 0 ? null : <p className={styles.status} role="status" aria-label={t("문의 안내")}>{inquiryStatus}</p>} {/* 문의 안내 */}
                <h3 className={styles.subTitle}>{t("앱 정보")}</h3> {/* 앱 정보 제목 */}
                <dl className={styles.infoGrid}> {/* 앱 정보 */}
                    <div><dt>{t("앱 버전")}</dt><dd>{appVersion}</dd></div> {/* 앱 버전 */}
                    <div><dt>{t("데이터 버전")}</dt><dd>{state.schemaVersion}</dd></div> {/* 데이터 버전 */}
                    <div><dt>{t("응답 방식")}</dt><dd>{responseMode}</dd></div> {/* 응답 방식(실제 AI 연결 상태) */}
                </dl> {/* 앱 정보 종료 */}
                <label className={styles.field}>{t("진단 정보")}<textarea className={styles.diagnostics} readOnly rows={9} value={diagnostics} /></label> {/* 진단 정보 */}
                <p>{t("이름이나 대화 내용 같은 개인 정보는 들어 있지 않아요.")}</p> {/* 개인 정보 안내 */}
                <button type="button" className={styles.secondary} onClick={() => void copyDiagnostics()}>{t("진단 정보 복사")}</button> {/* 복사 */}
                {copyStatus.length === 0 ? null : <p className={styles.status} role="status" aria-label={t("복사 안내")}>{copyStatus}</p>} {/* 복사 안내 */}
            </section> {/* 문의 영역 종료 */}
        </> // 고객 지원 화면 종료
    ); // 반환 종료
} // 함수 종료
