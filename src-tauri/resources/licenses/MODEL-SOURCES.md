---
# 내장 AI 파일 출처와 라이선스

실행 엔진은 llama.cpp b11146 (`7fe450e19305b828c199d602c23a8337aaa1f03b`) Windows Vulkan·CPU 빌드입니다. 원본 MIT 고지와 배포 압축에 포함된 LLVM OpenMP 고지를 함께 보관합니다. 모델 가중치는 설치 파일에 포함하지 않고 사용자가 AI 모델 화면에서 별도로 받습니다.

---
## 모델 배포 파일

| 앱 모델 | 공식 원본 | GGUF 배포자 | 라이선스 |
| --- | --- | --- | --- |
| 가벼움 · Mi:dm 2.0 Mini | [K-intelligence/Midm-2.0-Mini-Instruct](https://huggingface.co/K-intelligence/Midm-2.0-Mini-Instruct) | [mykor](https://huggingface.co/mykor/Midm-2.0-Mini-Instruct-gguf) | MIT, `midm-MIT.txt` |
| 표준 · Qwen3.5-4B | [Qwen/Qwen3.5-4B](https://huggingface.co/Qwen/Qwen3.5-4B) | [Unsloth](https://huggingface.co/unsloth/Qwen3.5-4B-GGUF) | Apache-2.0, `Apache-2.0.txt` |
| 고성능 · Qwen3.5-9B | [Qwen/Qwen3.5-9B](https://huggingface.co/Qwen/Qwen3.5-9B) | [Unsloth](https://huggingface.co/unsloth/Qwen3.5-9B-GGUF) | Apache-2.0, `Apache-2.0.txt` |

원본 제작사와 GGUF 배포자는 별개입니다. 세 파일 모두 Q4_K_M이며 다운로드 URL은 배포 리비전을 고정합니다. 정확한 파일 크기·SHA-256·원본·배포자·라이선스 주소는 함께 설치되는 `model-catalog.json`의 소스와 저장소 `src-tauri/resources/model-catalog.json`에 기록합니다. 모델 파일을 변경하면 카탈로그의 해시 검증을 통과하지 못합니다.

llama.cpp 출처: [고정 릴리스](https://github.com/ggml-org/llama.cpp/releases/tag/b11146), [고정 원본](https://github.com/ggml-org/llama.cpp/tree/7fe450e19305b828c199d602c23a8337aaa1f03b).
