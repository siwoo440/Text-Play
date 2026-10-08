"use client"; // 클라이언트 컴포넌트(화면 언어에 맞춰 글자를 바꾸려면 브라우저에서 그려야 함)

import Image from "@/desktop/next-compat/image"; // 이미지 최적화
import Link from "@/desktop/next-compat/link"; // 내부 경로 링크
import type { ReactNode } from "react"; // 자식 요소 타입
import { DownloadAction } from "@chatbot/features/text-play/DownloadAction"; // 다운로드 동작
import { getDistributionLabel, textPlayRelease } from "@chatbot/features/text-play/release-config"; // 배포 정보 도구
import styles from "@chatbot/features/text-play/TextPlayScreen.module.css"; // 화면 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

type IconName = "play" | "branch" | "save" | "memory" | "model" | "update"; // 아이콘 종류

const iconPaths: Record<IconName, ReactNode> = // 아이콘 도형
{ // 도형 시작
    play: <><rect x="3" y="4" width="18" height="14" rx="3" /><path d="M10 8.5v5l4.5-2.5Z" /></>, // 실행 아이콘
    branch: <><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="12" r="2" /><path d="M6 7v10M6 12h4a6 6 0 0 0 6-2" /></>, // 분기 아이콘
    save: <><path d="M5 3h11l3 3v15H5Z" /><path d="M8 3v5h7V3M8 21v-6h8v6" /></>, // 저장 아이콘
    memory: <><path d="M12 3l2.2 5.3L20 9l-4.4 3.8L17 19l-5-3-5 3 1.4-6.2L4 9l5.8-.7Z" /></>, // 기억 아이콘
    model: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M10 10h4v4h-4ZM9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" /></>, // 모델 아이콘
    update: <><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M5 19h14" /></>, // 업데이트 아이콘
}; // 도형 종료

function FeatureIcon({ name }: { name: IconName }) // 기능 아이콘
{ // 함수 시작
    return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{iconPaths[name]}</svg>; // 아이콘 반환
} // 함수 종료

const highlights = [ // 핵심 요약 목록
    { value: "선택 + 입력", label: "선택지와 자유 입력을 함께" }, // 입력 요약
    { value: "로컬 세이브", label: "진행을 기기에 저장" }, // 저장 요약
    { value: "장기 기억", label: "다음 실행에도 이어지는 관계" }, // 기억 요약
    { value: "같은 LLM", label: "Character Chat과 같은 모델 기준" }, // 모델 요약
] as const; // 읽기 전용 목록

const playSteps = [ // 플레이 흐름 목록
    { title: "장면을 읽고", description: "작품의 장면 묘사와 캐릭터 대사가 한 화면에 펼쳐집니다." }, // 읽기 단계
    { title: "고르거나 직접 쓰고", description: "준비된 선택지를 고르거나, 원하는 행동을 문장으로 직접 입력합니다." }, // 선택 단계
    { title: "기억으로 남깁니다", description: "선택의 결과가 게임 상태와 장기 기억에 기록되어 다음 장면에 반영됩니다." }, // 기억 단계
] as const; // 읽기 전용 목록

const features = [ // 주요 기능 목록
    { icon: "play", title: "텍스트 게임 실행", description: "다운로드한 작품을 Windows 환경에서 실행하는 런처 흐름" }, // 실행 기능
    { icon: "branch", title: "선택지와 자유 입력", description: "정해진 선택지와 직접 작성한 행동을 함께 사용해 이야기를 진행" }, // 입력 기능
    { icon: "save", title: "로컬 세이브", description: "진행 상황을 기기에 저장하고 다음 실행에서 이어서 플레이" }, // 저장 기능
    { icon: "memory", title: "상태와 장기 기억", description: "작품의 게임 상태와 장기 기억을 구분해 관리" }, // 기억 기능
    { icon: "model", title: "동일 LLM 모델 연동", description: "기존 Character Chat과 같은 LLM 모델 연결 기준" }, // 모델 기능
    { icon: "update", title: "작품 다운로드와 업데이트", description: "보유 작품을 내려받고 업데이트 상태를 한곳에서 확인" }, // 업데이트 기능
] as const satisfies readonly { icon: IconName; title: string; description: string }[]; // 읽기 전용 목록

const installationSteps = [ // 설치 단계 목록
    "설치 파일 다운로드", // 다운로드 단계
    "설치 프로그램 실행", // 실행 단계
    "Windows 보안 안내 확인", // 보안 단계
    "Mate Verse 계정 로그인", // 로그인 단계
    "Text-Play 작품 다운로드 및 실행", // 작품 실행 단계
] as const; // 읽기 전용 목록

const faqs = [ // 질문 목록
    { // 체험 안내 시작
        question: "설치 없이 체험할 수 있나요?", // 질문 문구
        answer: "현재 웹에서는 Character Chat을 이용할 수 있습니다. Windows Text-Play의 별도 웹 체험판 제공 여부는 확인 필요입니다.", // 답변 문구
    }, // 체험 안내 종료
    { // 저장 위치 시작
        question: "저장 데이터는 어디에 보관되나요?", // 질문 문구
        answer: "Windows 프로그램의 실제 저장 경로는 실행 프로그램 설계 후 확정해야 하므로 현재는 확인 필요입니다.", // 답변 문구
    }, // 저장 위치 종료
    { // 연결 안내 시작
        question: "인터넷 연결이 필요한 기능은 무엇인가요?", // 질문 문구
        answer: "계정 로그인, LLM 연동, 작품 다운로드와 업데이트에는 인터넷 연결이 필요할 예정입니다. 오프라인 지원 범위는 확인 필요입니다.", // 답변 문구
    }, // 연결 안내 종료
    { // 업데이트 안내 시작
        question: "프로그램은 어떻게 업데이트되나요?", // 질문 문구
        answer: "자동 업데이트 서버는 이번 범위에 포함되지 않습니다. 실제 업데이트 방식과 배포 채널은 확인 필요입니다.", // 답변 문구
    }, // 업데이트 안내 종료
] as const; // 읽기 전용 목록

function SectionHeading({ id, kicker, title, description }: { id: string; kicker: string; title: string; description?: string }) // 구역 제목
{ // 함수 시작
    return ( // 제목 반환
        <div className={styles.sectionHeading}> {/* 제목 영역 */}
            <p className={styles.kicker}>{kicker}</p> {/* 구역 표제 */}
            <h2 id={id}>{title}</h2> {/* 구역 제목 */}
            {description === undefined ? null : <p className={styles.sectionLead}>{description}</p>} {/* 구역 설명 */}
        </div> // 제목 영역 종료
    ); // 반환 종료
} // 함수 종료

function LauncherMockup() // 런처 화면 예시
{ // 함수 시작
    return ( // 예시 반환
        <div className={styles.window} aria-hidden="true"> {/* 예시 창 */}
            <div className={styles.titleBar}> {/* 제목 표시줄 */}
                <span className={styles.windowDots}><i /><i /><i /></span> {/* 창 버튼 */}
                <strong>MATE Text-Play</strong> {/* 프로그램 이름 */}
                <span>{t("황혼 우체국 · 1장")}</span> {/* 작품 이름 */}
            </div> {/* 제목 표시줄 종료 */}
            <div className={styles.windowBody}> {/* 창 본문 */}
                <div className={styles.storyColumn}> {/* 이야기 영역 */}
                    <div className={styles.sceneArt}> {/* 장면 그림 */}
                        <Image src="/images/text-play/twilight-post-office.svg" alt="" width={1200} height={760} priority unoptimized /> {/* 장면 이미지 */}
                    </div> {/* 장면 그림 종료 */}
                    <p className={styles.narration}>{t("마지막 배차가 떠난 뒤, 애린이 금빛 봉인이 찍힌 편지를 내밀었다.")}</p> {/* 장면 묘사 */}
                    <p className={styles.dialogue}><b>{t("애린")}</b> {t("“이 편지는 내일 아침의 당신에게서 왔어요.”")}</p> {/* 캐릭터 대사 */}
                    <ol className={styles.choices}> {/* 선택지 */}
                        <li><span>1</span>{t("봉인을 바로 뜯어 본다")}</li> {/* 첫 선택 */}
                        <li><span>2</span>{t("보낸 사람이 누구인지 묻는다")}</li> {/* 둘째 선택 */}
                    </ol> {/* 선택지 종료 */}
                    <div className={styles.freeInput}><span>{t("직접 입력")}</span>{t("편지를 노을빛에 비춰 본다")}<i /></div> {/* 자유 입력 */}
                </div> {/* 이야기 영역 종료 */}
                <div className={styles.sideColumn}> {/* 상태 영역 */}
                    <div className={styles.sideCard}><small>{t("세이브")}</small><strong>{t("슬롯 1 · 우체국 앞")}</strong></div> {/* 세이브 카드 */}
                    <div className={styles.sideCard}><small>{t("장기 기억")}</small><strong>{t("애린은 약속을 지키는 사람을 믿는다")}</strong></div> {/* 기억 카드 */}
                    <div className={styles.sideCard}><small>{t("관계")}</small><strong className={styles.meter}><i style={{ width: "62%" }} /></strong></div> {/* 관계 카드 */}
                </div> {/* 상태 영역 종료 */}
            </div> {/* 창 본문 종료 */}
            <span className={`${styles.floatingTag} ${styles.tagSave}`}>{t("자동 저장됨")}</span> {/* 저장 표시 */}
            <span className={`${styles.floatingTag} ${styles.tagMemory}`}>{t("기억 +1")}</span> {/* 기억 표시 */}
        </div> // 예시 창 종료
    ); // 반환 종료
} // 함수 종료

export function TextPlayScreen() // Text-Play 통합 화면
{ // 함수 시작
    const statusLabel = getDistributionLabel(textPlayRelease.status); // 상태 문구 조회
    return ( // 화면 반환
        <main className={styles.page} data-surface="light"> {/* Text-Play 화면 */}
            <section className={styles.hero} aria-labelledby="text-play-title"> {/* 상단 소개 */}
                <div className={styles.heroCopy}> {/* 소개 문구 */}
                    <p className={styles.eyebrow}><span aria-hidden="true" />MATE TEXT-PLAY · FOR WINDOWS</p> {/* 상단 표제 */}
                    <h1 id="text-play-title">{t("이야기를 읽는 순간에서")}<br /><span className={styles.highlight}>{t("직접 움직이는 순간으로")}</span></h1> {/* 화면 제목 */}
                    <p className={styles.lead}>{t("MATE Text-Play는 선택지와 자유 입력으로 텍스트 게임을 플레이하고, 작품·세이브·장기 기억을 한곳에서 관리하는 Windows 프로그램입니다.")}</p> {/* 화면 설명 */}
                    <div className={styles.badges}> {/* 상태 배지 */}
                        <span className={styles.platformBadge}>{t("Windows용 프로그램")}</span> {/* 플랫폼 배지 */}
                        <span className={styles.statusBadge} data-status={textPlayRelease.status}>{statusLabel}</span> {/* 배포 상태 */}
                    </div> {/* 상태 배지 종료 */}
                    <div id="text-play-download" className={styles.heroDownload}> {/* 상단 다운로드 */}
                        <DownloadAction release={textPlayRelease} /> {/* 다운로드 동작 */}
                        {textPlayRelease.status === "beta" ? <p className={styles.betaWarning} role="note">{t("베타 버전은 예기치 않은 오류와 데이터 형식 변경이 발생할 수 있습니다.")}</p> : null} {/* 베타 경고 */}
                    </div> {/* 상단 다운로드 종료 */}
                </div> {/* 소개 문구 종료 */}
                <figure className={styles.heroVisual} aria-labelledby="text-play-visual-caption"> {/* 화면 예시 */}
                    <LauncherMockup /> {/* 런처 예시 */}
                    <figcaption id="text-play-visual-caption">{t("출시 전 화면 구성 예시 · 작품 「황혼 우체국」 1장")}</figcaption> {/* 예시 설명 */}
                </figure> {/* 화면 예시 종료 */}
            </section> {/* 상단 소개 종료 */}

            <ul className={styles.highlights} aria-label={t("Text-Play 한눈에 보기")}> {/* 핵심 요약 */}
                {highlights.map((item) => <li key={item.value}><strong>{t(item.value)}</strong><span>{t(item.label)}</span></li>)} {/* 요약 항목 */}
            </ul> {/* 핵심 요약 종료 */}

            <section className={styles.section} aria-labelledby="play-flow-title"> {/* 플레이 흐름 */}
                <SectionHeading id="play-flow-title" kicker="HOW IT PLAYS" title={t("한 장면은 이렇게 진행됩니다")} description={t("읽기, 선택, 기억이 하나의 흐름으로 이어집니다.")} /> {/* 흐름 제목 */}
                <ol className={styles.flow}>{playSteps.map((step, index) => <li key={step.title}><span className={styles.flowNumber}>{index + 1}</span><h3>{t(step.title)}</h3><p>{t(step.description)}</p></li>)}</ol> {/* 흐름 단계 */}
            </section> {/* 플레이 흐름 종료 */}

            <section className={styles.section} aria-labelledby="feature-title"> {/* 기능 안내 */}
                <SectionHeading id="feature-title" kicker="PLAY SYSTEM" title={t("주요 기능")} /> {/* 기능 제목 */}
                <div className={styles.featureGrid}>{features.map((feature) => <article key={feature.title}><FeatureIcon name={feature.icon} /><h3>{t(feature.title)}</h3><p>{t(feature.description)}</p></article>)}</div> {/* 기능 그리드 */}
            </section> {/* 기능 안내 종료 */}

            <section className={styles.section} aria-labelledby="compare-title"> {/* 서비스 비교 */}
                <SectionHeading id="compare-title" kicker="WEB & WINDOWS" title={t("Character Chat과 무엇이 다른가요?")} /> {/* 비교 제목 */}
                <div className={styles.compare}> {/* 비교 카드 */}
                    <article> {/* 웹 카드 */}
                        <p className={styles.compareLabel}>{t("웹 · 지금 이용 가능")}</p> {/* 웹 표제 */}
                        <h3>Character Chat</h3> {/* 웹 제목 */}
                        <p>{t("브라우저에서 캐릭터와 자유롭게 대화하는 경험입니다. 설치 없이 바로 시작할 수 있습니다.")}</p> {/* 웹 설명 */}
                    </article> {/* 웹 카드 종료 */}
                    <article data-accent="true"> {/* 윈도우 카드 */}
                        <p className={styles.compareLabel}>Windows · {statusLabel}</p> {/* 윈도우 표제 */}
                        <h3>Text-Play</h3> {/* 윈도우 제목 */}
                        <p>{t("내려받은 텍스트 게임 작품을 실행하고, 세이브와 장기 기억 같은 로컬 상태를 함께 관리하는 프로그램입니다.")}</p> {/* 윈도우 설명 */}
                    </article> {/* 윈도우 카드 종료 */}
                </div> {/* 비교 카드 종료 */}
            </section> {/* 서비스 비교 종료 */}

            <section className={styles.section} aria-labelledby="install-title"> {/* 설치 안내 */}
                <SectionHeading id="install-title" kicker="GET STARTED" title={t("설치 순서")} /> {/* 설치 제목 */}
                <ol className={styles.stepList}>{installationSteps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{t(step)}</strong></li>)}</ol> {/* 설치 단계 목록 */}
            </section> {/* 설치 안내 종료 */}

            <section className={styles.section} aria-labelledby="faq-title"> {/* 자주 묻는 질문 */}
                <SectionHeading id="faq-title" kicker="FAQ" title={t("자주 묻는 질문")} /> {/* 질문 제목 */}
                <div className={styles.faqList}>{faqs.map((faq) => <details key={faq.question}><summary>{t(faq.question)}</summary><p>{t(faq.answer)}</p></details>)}</div> {/* 질문 목록 */}
            </section> {/* 자주 묻는 질문 종료 */}

            <section className={styles.ctaBand} aria-labelledby="cta-title"> {/* 마무리 안내 */}
                <div> {/* 안내 문구 */}
                    <h2 id="cta-title">{t("이야기의 다음 장은 직접 쓰세요")}</h2> {/* 안내 제목 */}
                    <p>{t("설치 파일이 등록되면 상단의 다운로드 버튼이 바로 활성화됩니다. 그동안 웹에서 Character Chat을 먼저 만나 보세요.")}</p> {/* 안내 설명 */}
                </div> {/* 안내 문구 종료 */}
                <div className={styles.ctaLinks}> {/* 안내 동작 */}
                    <a href="#text-play-download">{t("다운로드 버튼으로 이동")}</a> {/* 다운로드 앵커 */}
                    <Link href="/">{t("Character Chat 체험하기")}</Link> {/* 챗봇 링크 */}
                </div> {/* 안내 동작 종료 */}
            </section> {/* 마무리 안내 종료 */}

            <footer className={styles.footer}> {/* 하단 이동 */}
                <p>MATE Text-Play</p> {/* 하단 브랜드 */}
                <nav aria-label={t("Text-Play 관련 메뉴")}> {/* 하단 메뉴 */}
                    <Link href="/">Character Chat</Link> {/* 챗봇 링크 */}
                    <span aria-disabled="true">{t("개인정보처리방침 · 준비 중")}</span> {/* 개인정보 준비 상태 */}
                    <span aria-disabled="true">{t("이용약관 · 준비 중")}</span> {/* 약관 준비 상태 */}
                    <span aria-disabled="true">{t("고객지원 · 준비 중")}</span> {/* 지원 준비 상태 */}
                </nav> {/* 하단 메뉴 종료 */}
            </footer> {/* 하단 이동 종료 */}
        </main> // 화면 종료
    ); // 반환 종료
} // 함수 종료
