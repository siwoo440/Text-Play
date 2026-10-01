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
            return text === undefined ? scene : { ...scene, title: text.title, narration: text.narration, choices: scene.choices.map((choice) => ({ ...choice, label: text.choices[choice.id] ?? choice.label })) }; // 장면 글 바꾸기
        }), // 변환 종료
        endings: packageData.endings.map((ending) => ({ ...ending, ...(translation.endings[ending.id] ?? {}) })), // 엔딩 글 바꾸기
    }; // 작품 종료
} // 함수 종료

export function createTextTranslator(packageData: TextPlayPackage, language: AppLanguage): (text: string) => string // 원문 장면 서술·선택지 문구를 언어판으로 바꾸는 함수(저장 기록용)
{ // 함수 시작
    const localized = localizeTextPlayPackage(packageData, language); // 언어판 작품
    const pairs = new Map<string, string>(); // 원문 → 언어판
    packageData.scenes.forEach((scene, index) => // 장면 순회
    { // 순회 시작
        const target = localized.scenes[index]; // 언어판 장면
        pairs.set(scene.narration, target.narration); // 서술
        scene.choices.forEach((choice, choiceIndex) => pairs.set(choice.label, target.choices[choiceIndex].label)); // 선택지
    }); // 순회 종료
    return (text) => pairs.get(text) ?? text; // 바꾼 글 반환(모르는 글은 그대로)
} // 함수 종료
