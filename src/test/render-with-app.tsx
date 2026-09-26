import type { ReactElement } from "react"; // 리액트 요소
import { render } from "@testing-library/react"; // 렌더 도구
import { AppProvider } from "@/features/core/AppProvider"; // 앱 공급자
import { createInitialState } from "@/features/core/initial-state"; // 초기 상태
import type { AppState } from "@/features/core/types"; // 상태 타입

export function renderWithApp(ui: ReactElement, initialState: AppState = createInitialState()) // 앱 렌더 함수
{ // 함수 시작
    return render(<AppProvider initialState={initialState} repository={{ load: () => initialState, save: () => undefined }}>{ui}</AppProvider>); // 공급자 렌더링
} // 함수 종료
