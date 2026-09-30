# Ecallipse Agent Guidelines

## 목표

`docs/requirements.md`의 요구사항을 빠르게 하나씩 구현해 나간다. 완성도보다 커버 속도가 우선이다.

- 필요한 library/provider(STT, LLM 등)는 바로 하나 골라 붙인다. 교체는 나중에 한다.
- 실제 연동이 막히면 fake/더미로 먼저 흐름을 만들고 넘어간다.
- 요구사항이 바뀌거나 구현하면서 달라지면 `docs/requirements.md`만 고친다. 별도 설계 문서, decision record, 진행 로그는 만들지 않는다.

## 지킬 것

- `CallSession`(logical call)을 WebSocket, SIP session, browser tab 같은 물리 연결 하나와 동일시하지 않는다.
- FreeSWITCH는 SIP/media만 담당하고, 제품 로직은 Spring backend에 둔다. dialplan에 비즈니스 흐름을 넣지 않는다.
- Redis, Kafka, MSA 같은 인프라는 요구사항이 직접 필요로 할 때만 들인다.

## 명령어

Windows PowerShell에서는 `npm` 대신 `npm.cmd`를 쓴다.

```powershell
docker compose up --build -d          # Postgres, FreeSWITCH
.\gradlew.bat :backend:bootRun
.\gradlew.bat :backend:test

Set-Location frontend
npm.cmd run dev
npm.cmd run lint; npm.cmd test; npm.cmd run build
```

## Git

Git 작업은 `.agents/skills/git-workflow/SKILL.md`를 따른다.
