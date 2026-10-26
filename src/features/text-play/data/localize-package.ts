import type { TextPlayPackage } from "@/features/text-play/core/types"; // 작품 계약
import type { AppLanguage } from "@/features/text-play/preferences/text-play-preferences"; // 앱 언어

export function localizeTextPlayPackage(packageData: TextPlayPackage, language: AppLanguage): TextPlayPackage // 고른 언어의 작품(글만 바꾸고 식별자·규칙은 그대로)
{ // 함수 시작
    const translation = language === "en" ? packageData.translations?.en : undefined; // 언어판
    if (translation === undefined) // 언어판 없음 확인
    { // 조건 시작
        return packageData; // 원문 반환
    } // 조건 종료
    return { // 언어판 작품 반환
        ...packageData, // 식별자·규칙 유지
        title: translation.title, // 제목
        description: translation.description, // 설명
        glossary: translation.glossary, // 용어
        scenes: packageData.scenes.map((scene) => // 장면 순회
        { // 변환 시작
            const text = translation.scenes[scene.id]; // 장면 언어판
            return text === undefined ? scene : { ...scene, title: text.title, narration: text.narration, dialogue: text.dialogue ?? scene.dialogue, objective: text.objective ?? scene.objective, observation: text.observation ?? scene.observation, freeActions: text.freeActions ?? scene.freeActions, choices: scene.choices.map((choice) => ({ ...choice, label: text.choices[choice.id] ?? choice.label })) }; // 장면별 표시 언어 적용
        }), // 변환 종료
        endings: packageData.endings.map((ending) => ({ ...ending, ...(translation.endings[ending.id] ?? {}) })), // 엔딩 글 바꾸기
    }; // 작품 종료
} // 함수 종료

export function createTextTranslator(packageData: TextPlayPackage, language: AppLanguage): (text: string) => string // 원문 장면 서술·선택지 문구를 언어판으로 바꾸는 함수(저장 기록용)
{ // 함수 시작
    const localized = localizeTextPlayPackage(packageData, language); // 언어판 작품
    const pairs = new Map<string, string>(); // 원문 → 언어판
    for (const source of [packageData, localizeTextPlayPackage(packageData, "en")]) // 모든 고정 언어판 순회
    { // 순회 시작
        source.scenes.forEach((scene, index) => // 같은 순서의 장면 순회
        { // 장면 순회 시작
            const target = localized.scenes[index]; // 목표 언어 장면
            pairs.set(scene.narration, target.narration); // 양방향 서술 변환
            if (scene.observation !== undefined && target.observation !== undefined) // 관찰 번역 확인
            { // 조건 시작
                pairs.set(scene.observation, target.observation); // 양방향 임시 AI 관찰 변환
            } // 조건 종료
            if (scene.dialogue !== undefined && target.dialogue !== undefined) // 고정 대사 번역 확인
            { // 조건 시작
                pairs.set(scene.dialogue.content, target.dialogue.content); // 양방향 고정 대사 변환
            } // 조건 종료
            scene.freeActions?.forEach((action, actionIndex) => pairs.set(action, target.freeActions?.[actionIndex] ?? action)); // 고정 추천 행동 번역
            scene.choices.forEach((choice, choiceIndex) => pairs.set(choice.label, target.choices[choiceIndex].label)); // 선택지 번역
        }); // 장면 순회 종료
    } // 언어판 순회 종료
    for (const legacy of packageData.legacyLogTranslations ?? []) // 이전 저장의 고정 문구
    { // 호환 순회 시작
        pairs.set(legacy.ko, legacy[language]); // 이전 한국어 기록 변환
        pairs.set(legacy.en, legacy[language]); // 이전 영어 기록 변환
    } // 호환 순회 종료
    return (text) => pairs.get(text) ?? text; // 바꾼 글 반환(모르는 글은 그대로)
} // 함수 종료

export function createSpeakerNamer(packageData: TextPlayPackage, language: AppLanguage): (speaker: string) => string // 기록 속 발화자(식별자·어느 언어 이름이든)를 고른 언어 이름으로 바꾸는 함수
{ // 함수 시작
    const localized = localizeTextPlayPackage(packageData, language); // 언어판 작품
    const names = [packageData, packageData.translations?.en].map((source) => source?.glossary?.characters ?? {}); // 모든 언어의 인물 이름
    return (speaker) => // 발화자 이름 변환
    { // 변환 시작
        const id = packageData.characterIds.find((candidate) => candidate === speaker || names.some((characters) => characters[candidate]?.name === speaker)); // 식별자나 이름으로 인물 찾기
        return id === undefined ? speaker : localized.glossary?.characters[id]?.name ?? id; // 고른 언어 이름 반환(모르는 이름은 그대로)
    }; // 변환 종료
} // 함수 종료
