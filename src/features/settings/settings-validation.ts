export interface ProfileSettingsDraft // 프로필 초안 구조
{ // 구조 시작
    nickname: string; // 닉네임 값
    avatar: string; // 이미지 값
} // 구조 종료

export interface NotificationSettingsDraft // 알림 초안 구조
{ // 구조 시작
    startTime: string; // 시작 시각
    endTime: string; // 종료 시각
    dailyLimit: number; // 일일 횟수
} // 구조 종료

export type ProfileSettingsErrors = Partial<Record<keyof ProfileSettingsDraft, string>>; // 프로필 오류 구조
export type NotificationSettingsErrors = Partial<Record<keyof NotificationSettingsDraft, string>>; // 알림 오류 구조

export function validateProfileSettings(draft: ProfileSettingsDraft): ProfileSettingsErrors // 프로필 검증 함수
{ // 함수 시작
    const nickname = draft.nickname.trim(); // 닉네임 공백 정리
    if (nickname.length === 0) // 빈 이름 확인
    { // 조건 시작
        return { nickname: "닉네임을 입력해 주세요." }; // 필수 오류 반환
    } // 조건 종료
    if (nickname.length > 20) // 이름 길이 확인
    { // 조건 시작
        return { nickname: "닉네임은 20자 이하로 입력해 주세요." }; // 길이 오류 반환
    } // 조건 종료
    if (draft.avatar.trim().length === 0) // 빈 이미지 확인
    { // 조건 시작
        return { avatar: "프로필 이미지를 입력해 주세요." }; // 이미지 오류 반환
    } // 조건 종료
    return {}; // 정상 결과 반환
} // 함수 종료

export function validateNotificationSettings(draft: NotificationSettingsDraft): NotificationSettingsErrors // 알림 검증 함수
{ // 함수 시작
    if (!/^\d{2}:\d{2}$/.test(draft.startTime)) // 시작 형식 확인
    { // 조건 시작
        return { startTime: "시작 시각을 입력해 주세요." }; // 시작 오류 반환
    } // 조건 종료
    if (!/^\d{2}:\d{2}$/.test(draft.endTime)) // 종료 형식 확인
    { // 조건 시작
        return { endTime: "종료 시각을 입력해 주세요." }; // 종료 오류 반환
    } // 조건 종료
    if (draft.endTime <= draft.startTime) // 시간 순서 확인
    { // 조건 시작
        return { endTime: "종료 시각은 시작 시각보다 늦어야 합니다." }; // 순서 오류 반환
    } // 조건 종료
    if (!Number.isInteger(draft.dailyLimit) || draft.dailyLimit < 0 || draft.dailyLimit > 10) // 횟수 범위 확인
    { // 조건 시작
        return { dailyLimit: "일일 알림은 0~10회로 설정해 주세요." }; // 횟수 오류 반환
    } // 조건 종료
    return {}; // 정상 결과 반환
} // 함수 종료
