---
name: git-workflow
description: Ecallipse 저장소에서 코드 변경 작업을 시작하거나 진행할 때, 그리고 branch, commit, rebase, push 같은 Git 작업을 할 때 쓰는 규칙.
---

# Git Workflow

`main` 히스토리는 선형으로 깔끔하게 유지한다. PR은 쓰지 않는다.

## 커밋 메시지

- 한글로 쓴다. install, redis, WebSocket 같은 개발 용어는 억지로 번역하지 않는다.
- `feat:`, `fix:`, `refactor:`, `perf:`, `test:`, `docs:`, `chore:`, `revert:` prefix에 짧은 제목 한 줄만 쓴다. 본문은 쓰지 않는다.
- `Co-Authored-By` 같은 AI 작성자 표시는 절대 붙이지 않는다.
- 제목은 어디가 어떻게 바뀌었는지 드러나게 짧게 쓴다. 아래는 사용자가 고른 예시다. 규칙이 아니라 톤 참고용이고, 상황에 안 맞으면 자연스럽게 벗어나도 된다.
  - 경향: 명사로 끝맺음. 이유는 보통 생략(`revert`는 이유를 씀). `fix`는 사용자가 겪는 증상 위주이고, 원인이 분명하면 기술 용어로 원인을 짚기도 함. 클래스명 같은 구현 세부는 필요할 때만.
  - `feat: 통화 transcript를 바탕으로 Gemini가 Next Action 제안`
  - `feat: 통화 결과 화면에 transcript 표시`
  - `feat: 무응답 통화 30초 후 자동 종료`
  - `fix: 브라우저 통화에서 상대 음성이 들리지 않는 문제 수정`
  - `fix: 새로고침 시 통화가 종료되는 문제 수정`
  - `fix: stale SIP registration으로 INVITE가 전달되지 않는 문제 수정`
  - `refactor: Next Action 모델을 Claude에서 Gemini로 교체`
  - `refactor: NextAction을 Suggestion으로 이름 변경`
  - `perf: 통화별 Next Action 생성을 단일 실행으로 제한`
  - `test: 음성이 transcript와 Next Action까지 이어지는지 확인하는 테스트 추가`
  - `docs: README 로컬 실행 방법 갱신`
  - `chore: Postgres 비밀번호를 .env로 분리`
  - `chore: Vite 개발 서버에 HTTPS 적용` / `chore: FreeSWITCH SIP 연결을 WSS로 전환` (대상이 둘이면 나눠서 커밋)
  - `revert: 인식 속도가 느려져 Deepgram 모델을 nova-2로 되돌림`

## 작업 branch

- 새 작업을 받으면 `main`에서 `<prefix>/<주제>` branch를 알아서 만들고 이름을 알려 준다. 예: `feat/incoming-timeout`
- 문서 오타처럼 커밋 하나로 끝나는 작은 변경은 `main`에 바로 커밋한다.
- 작업 branch에는 요청이 없어도 수시로 커밋하고 원격에 push한다. 커밋을 정리하지 않아도 되고 `wip:` 커밋도 괜찮다. branch를 전환하기 전에는 stash 대신 커밋한다.
- 작업 중에 `main`이 앞서 나가면 작업 branch를 수시로 `main` 위로 rebase해도 된다.
- 작업 branch를 rebase한 뒤에는 허락 없이 `git push --force-with-lease`해도 된다. `main`에는 force push하지 않는다.
- rebase 충돌은 직접 해결한다. 어느 쪽 변경을 살릴지 애매하면 멈추고 사용자에게 묻는다.

## main에 합치기

사용자가 요청할 때만 한다.

1. 작업 branch를 최신 `main` 위로 rebase하면서 커밋을 작업 주제 단위로 정리한다. 이번 branch에서 만든 기능의 버그 수정이나 `wip:` 커밋은 해당 기능 커밋에 합친다. `main`에 이미 있는 기능을 고친 경우만 `fix:` 커밋으로 남긴다.
   - 대화형 편집기를 열 수 없으므로 편집기 없이 정리한다. `git commit --fixup=<대상>`으로 만든 커밋은 `GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash main`으로 합쳐진다.
   - `wip:` 커밋은 autosquash로 합쳐지지 않는다. 커밋이 뒤섞였으면 `git reset --soft $(git merge-base main HEAD)`로 되돌린 뒤 주제별로 다시 커밋하고 `main` 위로 rebase한다.
2. 바뀐 쪽의 검증을 돌리고, 통과하지 않으면 합치지 않는다.
   - backend: `.\gradlew.bat :backend:test`
   - frontend: `frontend`에서 `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`
3. `main`에서 `git merge --ff-only <branch>`로 합친다.
4. push하기 전에 사용자에게 결과를 보여 주고 허락을 받는다. 올라갈 커밋 목록과 사용자가 직접 확인할 명령을 함께 준다. `main`에 바로 커밋한 작은 변경도 같다.

   ```bash
   git log --oneline origin/main..main
   git log --oneline --graph -10
   ```

5. 허락을 받으면 `git push origin main`을 실행하고, 합친 branch를 로컬과 원격에서 모두 지운다.
