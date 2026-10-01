import type { CharacterStartPreset, UserProfile } from "@chatbot/features/core/types"; // 도메인 타입
import styles from "@chatbot/features/character/CharacterDetail.module.css"; // 상세 화면 스타일

interface ConversationSetupProps // 시작 설정 속성
{ // 구조 시작
    profile: UserProfile; // 사용자 프로필
    presets: CharacterStartPreset[]; // 시작 프리셋 목록
    selectedProfileId: string; // 선택 프로필 식별자
    selectedPresetId: string; // 선택 프리셋 식별자
    onProfileChange(profileId: string): void; // 프로필 변경 처리
    onPresetChange(presetId: string): void; // 프리셋 변경 처리
} // 구조 종료

export function ConversationSetup({ profile, presets, selectedProfileId, selectedPresetId, onProfileChange, onPresetChange }: ConversationSetupProps) // 대화 시작 설정
{ // 함수 시작
    return ( // 설정 반환
        <section className={styles.setupSection} aria-labelledby="conversation-setup-title"> {/* 설정 영역 */}
            <div className={styles.sectionHeading}> {/* 설정 제목 영역 */}
                <span className={styles.eyebrow}>START YOUR STORY</span> {/* 영문 표제 */}
                <h2 id="conversation-setup-title">대화 시작 설정</h2> {/* 설정 제목 */}
                <p>프로필과 첫 장면을 고르면 선택한 분위기로 새로운 이야기가 시작됩니다.</p> {/* 설정 안내 */}
            </div> {/* 제목 영역 종료 */}
            <div className={styles.setupGrid}> {/* 설정 격자 */}
                <label className={styles.profileField}> {/* 프로필 입력 */}
                    <span>대화 프로필</span> {/* 입력 표제 */}
                    <select value={selectedProfileId} onChange={(event) => onProfileChange(event.target.value)}> {/* 프로필 선택 */}
                        <option value={profile.id}>{profile.nickname}</option> {/* 현재 프로필 */}
                    </select> {/* 선택 종료 */}
                    <small>이 프로필의 이름과 설정으로 대화에 참여합니다.</small> {/* 프로필 안내 */}
                </label> {/* 프로필 입력 종료 */}
                <div className={styles.presetField}> {/* 프리셋 입력 */}
                    <span>시작 설정</span> {/* 입력 표제 */}
                    <div className={styles.presetList} role="radiogroup" aria-label="대화 시작 설정"> {/* 프리셋 목록 */}
                        {presets.map((preset, index) => ( // 프리셋 순회
                            <button key={preset.id} type="button" role="radio" aria-checked={selectedPresetId === preset.id} onClick={() => onPresetChange(preset.id)}> {/* 프리셋 버튼 */}
                                <span>{String(index + 1).padStart(2, "0")}</span> {/* 프리셋 번호 */}
                                <strong>{preset.name}</strong> {/* 프리셋 이름 */}
                                <small>{preset.description}</small> {/* 프리셋 설명 */}
                            </button> // 프리셋 버튼 종료
                        ))} {/* 순회 종료 */}
                    </div> {/* 목록 종료 */}
                </div> {/* 프리셋 입력 종료 */}
            </div> {/* 설정 격자 종료 */}
        </section> // 설정 영역 종료
    ); // 반환 종료
} // 함수 종료
