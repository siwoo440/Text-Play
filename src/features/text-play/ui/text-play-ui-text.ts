import { defineText } from "@/features/text-play/i18n/localized-text"; // 언어별 글자 정의

export const TEXT_PLAY_UI_TEXT = defineText( // Text-Play 플레이 화면 글자
    { // 한국어 시작
        screen: // 플레이 화면
        { // 화면 시작
            backToMain: (title: string) => `메인으로 돌아가기: ${title}`, // 작품 제목 버튼
            openStatus: "상태 패널 열기", // 상태 열기
            closeStatus: "상태 패널 닫기", // 상태 닫기
            hp: "체력", // 체력
            sanity: "정신력", // 정신력
            gold: "골드", // 골드
            openSave: "저장 슬롯 열기", // 저장 창 열기
            save: "저장", // 저장
            openLoad: "불러오기 슬롯 열기", // 불러오기 창 열기
            load: "불러오기", // 불러오기
            aiConnection: "AI 연결", // AI 상태
            chooseAI: "AI 챗봇 선택", // AI 목록
            temporaryAI: "임시 인공지능", // 임시 AI
            bundledAI: "내장 AI(이 PC)", // 내장 AI
            ollamaMissing: "올라마 모델 미선택", // 올라마 미선택
            ollamaModel: (model: string) => `올라마 · ${model}`, // 올라마 모델
            openSettings: "게임 설정 열기", // 설정 열기
            settings: "설정", // 설정
            sceneStage: "장면 무대", // 장면 무대
            storyDialogue: "스토리 대화", // 이야기 상자
            currentTurn: "현재 턴", // 현재 턴
            totalTurns: "전체 턴", // 전체 턴
            previousTurn: "이전 턴 보기", // 이전 턴
            nextTurn: "다음 턴 보기", // 다음 턴
            turnList: "이야기 턴 목록", // 턴 목록
            showTurn: (turn: number) => `${turn}턴 보기`, // 턴 점
            commands: "진행 명령", // 명령 도크
            typeAction: "행동 직접 입력", // 입력 제목
            placeholder: "예: 벽의 문양을 자세히 살핀다", // 입력 예시
            send: "전송", // 전송
            stop: "응답 중지", // 중지
            systemNotice: "시스템 안내", // 안내 영역
            idleNotice: "선택하거나 행동을 입력해 이야기를 진행하세요.", // 기본 안내
            retry: "같은 입력 다시 시도", // 재시도
            memoryStorageWarning: "영구 저장소를 사용할 수 없어 현재 실행 중에만 메모리에 저장합니다.", // 메모리 저장 경고
        }, // 화면 종료
        story: // 이야기 기록
        { // 기록 시작
            log: "이야기 기록", // 기록 영역
            generating: "응답 생성 중…", // 생성 대기
            pending: "생성 중인 이야기", // 생성 중 기록
        }, // 기록 종료
        choices: // 추천 답안
        { // 추천 시작
            region: "추천 답안", // 추천 영역
            toggle: "AI 추천 답안", // 펼침 버튼
            list: "AI 추천 답안 목록", // 답안 목록
            ended: "이야기가 끝났습니다.", // 종료 안내
            freeActions: ["주변을 자세히 살핀다", "지금까지 얻은 단서를 정리한다", "숨을 고르며 주변 소리에 귀를 기울인다"], // 자유 행동 추천
        }, // 추천 종료
        status: // 상태 패널
        { // 상태 시작
            region: "게임 상태", // 상태 영역
            title: "플레이 상태", // 상태 제목
            hp: "체력", // 체력
            sanity: "정신력", // 정신력
            gold: "골드", // 골드
            relation: (name: string) => `${name} 관계`, // 관계
            inventory: "인벤토리", // 인벤토리
            noItems: "보유 아이템 없음", // 빈 인벤토리
            quests: "퀘스트", // 퀘스트
            active: "진행", // 진행 퀘스트
            completed: "완료", // 완료 퀘스트
            none: "없음", // 없음
        }, // 상태 종료
        saves: // 저장 창
        { // 저장 시작
            saveTitle: "게임 저장", // 저장 제목
            loadTitle: "게임 불러오기", // 불러오기 제목
            saveDescription: "현재 진행을 저장할 슬롯을 선택하세요.", // 저장 설명
            loadDescription: "이어서 진행할 대화를 선택하세요.", // 불러오기 설명
            slotGroup: (slot: number) => `수동 저장 슬롯 ${slot}`, // 슬롯 묶음
            slot: (slot: number) => `슬롯 ${slot}`, // 슬롯 제목
            corrupt: "저장 데이터가 손상되었습니다.", // 손상
            empty: "저장된 대화가 없습니다.", // 빈 슬롯
            playTime: (time: string) => `플레이 ${time}`, // 플레이 시간
            savedAt: (time: string) => `저장 ${time}`, // 저장 시각
            repairSave: "복구 저장", // 손상 슬롯 저장
            save: "저장", // 저장
            overwrite: "덮어쓰기", // 덮어쓰기
            corruptSlot: "손상 슬롯", // 손상 슬롯
            emptySlot: "빈 슬롯", // 빈 슬롯
            load: "불러오기", // 불러오기
            remove: "삭제", // 삭제
            confirmOverwrite: "현재 슬롯을 덮어쓸까요?", // 덮어쓰기 확인
            confirmLoad: "현재 진행을 버리고 저장한 게임을 불러올까요?", // 불러오기 확인
            confirmRemove: "저장 데이터를 삭제할까요?", // 삭제 확인
            minutesSeconds: (minutes: number, seconds: number) => `${minutes}분 ${seconds}초`, // 플레이 시간 형식
            autoSlot: "자동 저장", // 자동 슬롯 이름
            manualSlot: (slot: string) => `수동 저장 ${slot}`, // 수동 슬롯 이름
        }, // 저장 종료
        settings: // 설정 창
        { // 설정 시작
            eyebrow: "화면 및 인공지능", // 표제
            title: "게임 화면 설정", // 제목
            description: "화면 분위기와 EXE 창 크기를 선택합니다.", // 설명
            themeTitle: "UI 테마", // 테마 제목
            themeHint: "선택 즉시 플레이 화면에 적용됩니다. 밝기는 앱의 다크 모드 스위치를 따릅니다.", // 테마 안내
            themeLabel: (theme: string) => `${theme} 테마`, // 테마 입력 이름
            themes: // 테마 이름
            { // 테마 시작
                "dark-fantasy": { label: "판타지 글래스", summary: "보랏빛 유리와 금속성 룬" }, // 판타지
                "sci-fi": { label: "미니멀 SF HUD", summary: "청록 신호선과 각진 프레임" }, // SF
                "classic-novel": { label: "클래식 비주얼 노벨", summary: "따뜻한 장식과 부드러운 대화창" }, // 노벨
            }, // 테마 종료
            windowTitle: "창 크기", // 창 크기 제목
            windowHint: "EXE에서 실제 창 크기를 변경합니다.", // 창 크기 안내
            resolution: "창 해상도", // 해상도
            fit: "화면 맞춤", // 화면 맞춤
            aiTitle: "인공지능 공급자", // AI 제목
            aiHint: "임시 응답, 이 PC의 내장 AI, PC에 설치된 올라마 모델 중에서 선택합니다.", // AI 안내
            chatbot: "사용할 챗봇", // AI 선택
            temporaryAI: "임시 인공지능", // 임시 AI
            bundledAI: "내장 AI(이 PC)", // 내장 AI
            ollama: "올라마 로컬 모델", // 올라마
            webOnly: "로컬 모델은 Windows 실행 프로그램에서 사용할 수 있습니다.", // 웹 제한
            scanning: "검색 중", // 검색 중
            scan: "설치 모델 검색", // 검색
            localModel: "로컬 모델", // 로컬 모델
            chooseModel: "모델을 선택하세요", // 모델 선택
            checkingModels: "설치된 모델을 확인하고 있습니다.", // 검색 안내
            noModels: "설치된 올라마 모델이 없습니다.", // 빈 목록
            modelMissing: "선택한 모델이 설치되어 있지 않습니다.", // 삭제된 모델
            foundModels: (count: number) => `${count}개 모델을 찾았습니다.`, // 검색 완료
            ollamaOffline: "올라마가 실행 중인지 확인해 주세요.", // 연결 오류
            vram: (gigabytes: string) => `그래픽 메모리 ${gigabytes}GB 사용 중`, // 그래픽 메모리
        }, // 설정 종료
        home: // Text-Play 메인
        { // 메인 시작
            playable: "플레이 가능", // 공개 작품
            preparing: "준비 중", // 준비 작품
            plays: (count: string) => `${count} 플레이`, // 플레이 수
            newGame: "새 게임", // 새 게임
            noResume: "이어할 저장 없음", // 이어하기 없음
            resume: "이어하기", // 이어하기
            mainMenu: "주요 메뉴", // 주요 메뉴
            explore: "작품 탐색", // 탐색
            ranking: "인기 랭킹", // 랭킹
            allWorks: "전체 작품", // 전체 작품
            quickStart: "바로 시작", // 바로 시작
            quickResume: "바로 이어하기", // 바로 이어하기
            eyebrow: "선택과 직접 입력으로 이어지는 이야기", // 상단 문구
            titleBefore: "오늘, ", // 제목 앞
            titleHighlight: "어떤 이야기", // 제목 강조
            titleAfter: "를 플레이할까요?", // 제목 뒤
            lead: (count: number) => `판타지부터 미스터리까지, ${count}개의 작품이 당신의 선택을 기다리고 있어요.`, // 설명
            search: "작품과 등장인물 검색", // 검색
            genres: "작품 장르", // 장르 필터
            genreNames: { all: "전체", healing: "힐링", fantasy: "판타지", modern: "현대", romance: "로맨스", mystery: "미스터리", sf: "SF", other: "기타" }, // 장르 이름
            featured: "오늘의 작품", // 오늘의 작품
            tags: "작품 태그", // 태그
            resumeSummary: (summary: string) => `이어하기 · ${summary}`, // 이어하기 요약
            rankingLead: "지금 가장 많이 플레이하는 작품", // 랭킹 설명
            rank: (rank: number) => `${rank}위`, // 순위
            searchResults: "작품 탐색 결과", // 검색 결과
            more: "작품 더 보기", // 더 보기
            empty: "조건에 맞는 작품이 없습니다.", // 빈 결과
            leadInfo: (name: string, plays: string) => `주인공 ${name} · ${plays}`, // 상세 정보
            unavailable: "준비 중인 작품입니다", // 준비 작품 버튼
        }, // 메인 종료
        dialog: { close: "닫기" }, // 공통 대화상자
    }, // 한국어 종료
    { // 영어 시작
        screen: // 플레이 화면
        { // 화면 시작
            backToMain: (title: string) => `Back to main: ${title}`, // 작품 제목 버튼
            openStatus: "Open status panel", // 상태 열기
            closeStatus: "Close status panel", // 상태 닫기
            hp: "HP", // 체력
            sanity: "Sanity", // 정신력
            gold: "Gold", // 골드
            openSave: "Open save slots", // 저장 창 열기
            save: "Save", // 저장
            openLoad: "Open load slots", // 불러오기 창 열기
            load: "Load", // 불러오기
            aiConnection: "AI connection", // AI 상태
            chooseAI: "Choose AI chatbot", // AI 목록
            temporaryAI: "Temporary AI", // 임시 AI
            bundledAI: "Built-in AI (this PC)", // 내장 AI
            ollamaMissing: "No Ollama model selected", // 올라마 미선택
            ollamaModel: (model: string) => `Ollama · ${model}`, // 올라마 모델
            openSettings: "Open game settings", // 설정 열기
            settings: "Settings", // 설정
            sceneStage: "Scene stage", // 장면 무대
            storyDialogue: "Story dialogue", // 이야기 상자
            currentTurn: "Current turn", // 현재 턴
            totalTurns: "Total turns", // 전체 턴
            previousTurn: "Previous turn", // 이전 턴
            nextTurn: "Next turn", // 다음 턴
            turnList: "Story turns", // 턴 목록
            showTurn: (turn: number) => `Show turn ${turn}`, // 턴 점
            commands: "Commands", // 명령 도크
            typeAction: "Type an action", // 입력 제목
            placeholder: "e.g. Examine the pattern on the wall closely", // 입력 예시
            send: "Send", // 전송
            stop: "Stop response", // 중지
            systemNotice: "System notice", // 안내 영역
            idleNotice: "Choose an option or type an action to continue the story.", // 기본 안내
            retry: "Retry the same input", // 재시도
            memoryStorageWarning: "Permanent storage is unavailable, so progress is kept in memory only while the app is running.", // 메모리 저장 경고
        }, // 화면 종료
        story: // 이야기 기록
        { // 기록 시작
            log: "Story log", // 기록 영역
            generating: "Generating response…", // 생성 대기
            pending: "Story being generated", // 생성 중 기록
        }, // 기록 종료
        choices: // 추천 답안
        { // 추천 시작
            region: "Suggested answers", // 추천 영역
            toggle: "AI suggestions", // 펼침 버튼
            list: "AI suggestion list", // 답안 목록
            ended: "The story has ended.", // 종료 안내
            freeActions: ["Look around carefully", "Go over the clues found so far", "Catch your breath and listen to the sounds around you"], // 자유 행동 추천
        }, // 추천 종료
        status: // 상태 패널
        { // 상태 시작
            region: "Game status", // 상태 영역
            title: "Play status", // 상태 제목
            hp: "HP", // 체력
            sanity: "Sanity", // 정신력
            gold: "Gold", // 골드
            relation: (name: string) => `Relationship with ${name}`, // 관계
            inventory: "Inventory", // 인벤토리
            noItems: "No items", // 빈 인벤토리
            quests: "Quests", // 퀘스트
            active: "Active", // 진행 퀘스트
            completed: "Completed", // 완료 퀘스트
            none: "none", // 없음
        }, // 상태 종료
        saves: // 저장 창
        { // 저장 시작
            saveTitle: "Save game", // 저장 제목
            loadTitle: "Load game", // 불러오기 제목
            saveDescription: "Choose a slot to save your current progress.", // 저장 설명
            loadDescription: "Choose a story to continue.", // 불러오기 설명
            slotGroup: (slot: number) => `Manual save slot ${slot}`, // 슬롯 묶음
            slot: (slot: number) => `Slot ${slot}`, // 슬롯 제목
            corrupt: "This save data is damaged.", // 손상
            empty: "No saved story.", // 빈 슬롯
            playTime: (time: string) => `Played ${time}`, // 플레이 시간
            savedAt: (time: string) => `Saved ${time}`, // 저장 시각
            repairSave: "Save to repair", // 손상 슬롯 저장
            save: "Save", // 저장
            overwrite: "Overwrite", // 덮어쓰기
            corruptSlot: "Damaged slot", // 손상 슬롯
            emptySlot: "Empty slot", // 빈 슬롯
            load: "Load", // 불러오기
            remove: "Delete", // 삭제
            confirmOverwrite: "Overwrite this slot?", // 덮어쓰기 확인
            confirmLoad: "Discard current progress and load the saved game?", // 불러오기 확인
            confirmRemove: "Delete this save data?", // 삭제 확인
            minutesSeconds: (minutes: number, seconds: number) => `${minutes}m ${seconds}s`, // 플레이 시간 형식
            autoSlot: "Auto save", // 자동 슬롯 이름
            manualSlot: (slot: string) => `Manual save ${slot}`, // 수동 슬롯 이름
        }, // 저장 종료
        settings: // 설정 창
        { // 설정 시작
            eyebrow: "Screen and AI", // 표제
            title: "Game screen settings", // 제목
            description: "Choose the screen style and the EXE window size.", // 설명
            themeTitle: "UI theme", // 테마 제목
            themeHint: "Applied to the play screen right away. Brightness follows the app dark mode switch.", // 테마 안내
            themeLabel: (theme: string) => `${theme} theme`, // 테마 입력 이름
            themes: // 테마 이름
            { // 테마 시작
                "dark-fantasy": { label: "Fantasy Glass", summary: "Violet glass and metallic runes" }, // 판타지
                "sci-fi": { label: "Minimal SF HUD", summary: "Teal signal lines and angular frames" }, // SF
                "classic-novel": { label: "Classic Visual Novel", summary: "Warm ornaments and soft dialogue boxes" }, // 노벨
            }, // 테마 종료
            windowTitle: "Window size", // 창 크기 제목
            windowHint: "Changes the actual window size in the EXE.", // 창 크기 안내
            resolution: "Window resolution", // 해상도
            fit: "Fit to screen", // 화면 맞춤
            aiTitle: "AI provider", // AI 제목
            aiHint: "Choose temporary replies, this PC's built-in AI, or an Ollama model installed on this PC.", // AI 안내
            chatbot: "Chatbot to use", // AI 선택
            temporaryAI: "Temporary AI", // 임시 AI
            bundledAI: "Built-in AI (this PC)", // 내장 AI
            ollama: "Ollama local model", // 올라마
            webOnly: "Local models are available in the Windows app.", // 웹 제한
            scanning: "Searching", // 검색 중
            scan: "Find installed models", // 검색
            localModel: "Local model", // 로컬 모델
            chooseModel: "Choose a model", // 모델 선택
            checkingModels: "Checking installed models.", // 검색 안내
            noModels: "No Ollama models are installed.", // 빈 목록
            modelMissing: "The selected model is not installed.", // 삭제된 모델
            foundModels: (count: number) => `Found ${count} model${count === 1 ? "" : "s"}.`, // 검색 완료
            ollamaOffline: "Please check that Ollama is running.", // 연결 오류
            vram: (gigabytes: string) => `Using ${gigabytes}GB of graphics memory`, // 그래픽 메모리
        }, // 설정 종료
        home: // Text-Play 메인
        { // 메인 시작
            playable: "Playable", // 공개 작품
            preparing: "Coming soon", // 준비 작품
            plays: (count: string) => `${count} plays`, // 플레이 수
            newGame: "New game", // 새 게임
            noResume: "No save to continue", // 이어하기 없음
            resume: "Continue", // 이어하기
            mainMenu: "Main menu", // 주요 메뉴
            explore: "Explore works", // 탐색
            ranking: "Popular ranking", // 랭킹
            allWorks: "All works", // 전체 작품
            quickStart: "Start now", // 바로 시작
            quickResume: "Continue now", // 바로 이어하기
            eyebrow: "Stories that unfold through choices and your own words", // 상단 문구
            titleBefore: "Which ", // 제목 앞
            titleHighlight: "story", // 제목 강조
            titleAfter: " will you play today?", // 제목 뒤
            lead: (count: number) => `From fantasy to mystery, ${count} works are waiting for your choices.`, // 설명
            search: "Search works and characters", // 검색
            genres: "Genres", // 장르 필터
            genreNames: { all: "All", healing: "Healing", fantasy: "Fantasy", modern: "Modern", romance: "Romance", mystery: "Mystery", sf: "SF", other: "Other" }, // 장르 이름
            featured: "Today's pick", // 오늘의 작품
            tags: "Tags", // 태그
            resumeSummary: (summary: string) => `Continue · ${summary}`, // 이어하기 요약
            rankingLead: "Most played right now", // 랭킹 설명
            rank: (rank: number) => `#${rank}`, // 순위
            searchResults: "Search results", // 검색 결과
            more: "Show more works", // 더 보기
            empty: "No works match.", // 빈 결과
            leadInfo: (name: string, plays: string) => `Lead ${name} · ${plays}`, // 상세 정보
            unavailable: "This work is coming soon", // 준비 작품 버튼
        }, // 메인 종료
        dialog: { close: "Close" }, // 공통 대화상자
    }, // 영어 종료
); // 글자 종료
