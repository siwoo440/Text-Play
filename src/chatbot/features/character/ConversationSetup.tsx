import type { CharacterStartPreset, Persona } from "@chatbot/features/core/types"; // 도메인 타입
import styles from "@chatbot/features/character/CharacterDetail.module.css"; // 상세 화면 스타일
import { t } from "@chatbot/lib/i18n"; // 화면 글자 번역

interface ConversationSetupProps // 시작 설정 속성
{ // 구조 시작
    personas: Persona[]; // 대화 프로필 목록(채팅방 설정의 대화 프로필과 같은 목록)
    presets: CharacterStartPreset[]; // 시작 프리셋 목록
    selectedProfileId: string; // 선택 프로필 식별자
    selectedPresetId: string; // 선택 프리셋 식별자
    onProfileChange(profileId: string): void; // 프로필 변경 처리
    onPresetChange(presetId: string): void; // 프리셋 변경 처리
} // 구조 종료

export function ConversationSetup({ personas, presets, selectedProfileId, selectedPresetId, onProfileChange, onPresetChange }: ConversationSetupProps) // 대화 시작 설정
{ // 함수 시작
    return ( // 설정 반환
        <section className={styles.setupSection} aria-labelledby="conversation-setup-title"> {/* 설정 영역 */}
            <div className={styles.sectionHeading}> {/* 설정 제목 영역 */}
                <span className={styles.eyebrow}>START YOUR STORY</span> {/* 영문 표제 */}
                <h2 id="conversation-setup-title">{t("대화 시작 설정")}</h2> {/* 설정 제목 */}
                <p>{t("프로필과 첫 장면을 고르면 선택한 분위기로 새로운 이야기가 시작됩니다.")}</p> {/* 설정 안내 */}
            </div> {/* 제목 영역 종료 */}
            <div className={styles.setupGrid}> {/* 설정 격자 */}
                <label className={styles.profileField}> {/* 프로필 입력 */}
                    <span>{t("대화 프로필")}</span> {/* 입력 표제 */}
                    <select value={selectedProfileId} onChange={(event) => onProfileChange(event.target.value)}> {/* 프로필 선택 */}
                        {personas.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)} {/* 만들어 둔 대화 프로필 */}
                    </select> {/* 선택 종료 */}
                    <small>{t("이 프로필의 이름과 설정으로 대화에 참여합니다. 프로필은 채팅방 설정의 대화 프로필에서 만들고 바꿀 수 있어요.")}</small> {/* 프로필 안내 */}
                </label> {/* 프로필 입력 종료 */}
                <div className={styles.presetField}> {/* 프리셋 입력 */}
                    <span>{t("시작 설정")}</span> {/* 입력 표제 */}
                    <div className={styles.presetList} role="radiogroup" aria-label={t("대화 시작 설정")}> {/* 프리셋 목록 */}
                        {presets.map((preset, index) => ( // 프리셋 순회
                            <button key={preset.id} type="button" role="radio" aria-checked={selectedPresetId === preset.id} onClick={() => onPresetChange(preset.id)}> {/* 프리셋 버튼 */}
                                <span>{String(index + 1).padStart(2, "0")}</span> {/* 프리셋 번호 */}
                                <strong>{preset.name}</strong> {/* 프리셋 이름 */}
                                <small>{t(preset.description)}</small> {/* 프리셋 설명 */}
                            </button> // 프리셋 버튼 종료
                        ))} {/* 순회 종료 */}
                    </div> {/* 목록 종료 */}
                </div> {/* 프리셋 입력 종료 */}
            </div> {/* 설정 격자 종료 */}
        </section> // 설정 영역 종료
    ); // 반환 종료
} // 함수 종료
