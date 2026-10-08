import { isTextPlayDownloadAvailable, type TextPlayRelease } from "@chatbot/features/text-play/release-config"; // 배포 설정 도구
import styles from "@chatbot/features/text-play/TextPlayScreen.module.css"; // 화면 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

export interface DownloadActionProps // 다운로드 속성
{ // 구조 시작
    release: TextPlayRelease; // 배포 정보
} // 구조 종료

export function DownloadAction({ release }: DownloadActionProps) // 다운로드 동작
{ // 함수 시작
    const available = isTextPlayDownloadAvailable(release) && release.downloadUrl !== null; // 다운로드 가능 상태
    if (!available || release.downloadUrl === null) // 비활성 상태 검사
    { // 조건 시작
        return ( // 비활성 화면 반환
            <div className={styles.downloadAction}> {/* 다운로드 동작 영역 */}
                <button type="button" className={styles.downloadButton} disabled>{t("다운로드 준비 중")}</button> {/* 비활성 다운로드 버튼 */}
                <p className={styles.downloadHint}>{t("실제 설치 파일과 배포 URL이 등록되면 버튼이 활성화됩니다.")}</p> {/* 준비 안내 */}
            </div> // 동작 영역 종료
        ); // 반환 종료
    } // 조건 종료
    return ( // 활성 화면 반환
        <div className={styles.downloadAction}> {/* 다운로드 동작 영역 */}
            <a className={styles.downloadButton} href={release.downloadUrl} download={release.fileName ?? undefined} rel="noopener">{t("Windows용 다운로드")}</a> {/* 다운로드 링크 */}
            <p className={styles.downloadHint}>{t("다운로드가 시작되지 않으면 배포 상태와 인터넷 연결을 확인해 주세요.")}</p> {/* 실패 대응 안내 */}
        </div> // 동작 영역 종료
    ); // 반환 종료
} // 함수 종료
