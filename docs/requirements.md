# Ecallipse Requirements

> 이 문서는 최종 계약서가 아니라 **현재 제품 방향의 source of truth**다.  
> POC와 실제 사용 시나리오를 통해 요구사항은 추가·삭제·수정될 수 있다.

## 1. Product Intent

Ecallipse은 사용자가 **통화에 필요한 AI 기능을 자유롭게 구성**하고, 통화를 기존 업무 흐름에서 동떨어진 별도 작업이 아니라 **자연스럽게 이어지는 하나의 단계**로 만들도록 돕는 서비스다.

일반적인 전화는 통화가 끝난 뒤 사용자가 내용을 기억하거나 메모하고, 결정사항·할 일·일정·주요 정보를 다시 다른 도구에 옮겨야 한다. Ecallipse은 통화 전·중·후에 필요한 보조 기능을 조합할 수 있게 하고, 통화 중 생성된 정보를 이후 행동과 업무에 활용할 수 있도록 한다.

Ecallipse의 핵심은 "AI가 대신 전화한다"가 아니라 **사용자가 직접 통화하면서 필요한 도움을 선택적으로 받는 것**이다.

## 2. Representative Use Cases

아래는 제품 방향을 설명하기 위한 대표 사례이며, 최종 기능 목록을 고정하지 않는다.

### 업무 전화
- Transcript
- Key Facts
- Action Items
- Checklist
- Memo

통화 중 필요한 정보를 놓치지 않고, 종료 후 결정사항과 다음 작업을 바로 확인한다.

### 중요한 문의 / 예약 / 해지 전화
- Checklist
- Next Action
- Key Facts
- Summary

통화 목적과 확인 항목을 준비하고, 빠진 질문을 확인하며, 결과와 미해결 항목을 남긴다.

### 외국어 전화
- Transcript
- Translation
- Terminology
- Next Line

실시간으로 내용을 이해하고 필요한 표현이나 용어 설명을 받는다.

## 3. Requirement Maturity

요구사항을 모두 같은 수준의 확정 사항으로 취급하지 않는다.

- **Core**: 현재 제품 정체성에 가깝고 POC 이후에도 유지될 가능성이 높은 요구사항
- **Current**: 현재 구현 대상으로 보는 요구사항이지만 실제 개발 결과에 따라 변경 가능
- **Hypothesis**: POC나 사용 경험을 통해 검증해야 하는 가설
- **Deferred**: 필요성은 예상되지만 현재 단계에서는 구현하지 않는 요구사항

새로운 사실이 확인되면 이 문서의 분류와 내용 자체를 수정한다.

## 4. Core Product Requirements

### 4.0 Application Flow

- **REQ-APP-001 [Current, POC]** 서비스 소개 화면과 로그인 이후의 application workspace를 구분한다. POC 인증은 Alice/Bob 더미 계정으로 검증한다.
- **REQ-APP-002 [Core, POC]** 사용자는 연락처에서 내부 사용자 또는 전화번호를 선택해 통화를 시작할 수 있어야 한다. 발신 전에 통화 구성(Preset)과 연결 방식을 확인하고, 기본값이면 한 번에 시작할 수 있어야 한다.
- **REQ-APP-003 [Current, POC]** incoming call은 현재 화면 위에서 확인하고 수락하거나 종료할 수 있어야 한다.
- **REQ-APP-004 [Core, POC]** 통화 중에는 참가자, 연결 상태, 통화 제어와 AI 보조 위젯을 함께 볼 수 있는 전용 화면을 제공해야 한다.
- **REQ-APP-005 [Current]** 통화 종료 후 transcript와 생성된 결과를 확인할 수 있어야 한다. 최종 result model은 실제 사용 경험 후 확정한다.

### 4.1 Calling

- **REQ-CALL-001 [Core, POC]** 서비스 사용자 간 1:1 실시간 음성 통화가 가능해야 한다.
- **REQ-CALL-002 [Core, POC]** 발신, ringing, accept, hangup까지 최소 call lifecycle이 동작해야 한다.
- **REQ-CALL-003 [Current]** reject, busy, no-answer, timeout 등 실제 통화에서 필요한 기본 종료 경로를 처리해야 한다.

### 4.2 Configurable AI Assistance

- **REQ-AI-001 [Core]** 사용자는 통화 목적에 맞게 필요한 AI 보조 기능을 선택하거나 제외할 수 있어야 한다.
- **REQ-AI-002 [Core, POC]** 통화 음성을 실시간 transcript로 변환할 수 있어야 한다.
- **REQ-AI-003 [Core, POC]** 통화 중 최소 하나의 실시간 AI 보조 기능을 제공해야 한다. POC에서는 `Next Action`을 우선 검증한다.
- **REQ-AI-004 [Current]** Transcript, Checklist, Next Action, Key Facts, Terminology, Translation, Summary 등 서로 다른 목적의 기능을 조합할 수 있어야 한다.
- **REQ-AI-005 [Current, POC]** AI 보조 기능은 독립적인 Widget으로 추가·제거하고 한 통화 화면 안에서 위치와 크기를 바꿀 수 있어야 한다. 위젯 배치는 가장자리 근처에서 캔버스 경계나 다른 위젯에 스냅한다. `Call Stage`(참가자·연결 상태를 보여주는 통화 자체를 표현하는 위젯)는 모든 구성에 항상 하나 존재하며 위치·크기 조절은 가능하지만 제거할 수 없다.
- **REQ-AI-006 [Hypothesis, POC]** 개별 Widget을 별도 browser window로 분리하는 UX가 실제 통화 workflow에 유용한지 검증한다.
- **REQ-AI-007 [Hypothesis, POC]** Widget은 데이터를 보여 주는 view이고, transcript 같은 데이터 원천은 통화 단위로 존재한다. Widget 하나를 제거해도 다른 Widget이 쓰는 원천은 유지되고, 통화에서 켜지는 원천은 구성에 포함된 Widget이 요구하는 원천의 합집합이다. 원천 on/off가 실제 STT/LLM 호출과 비용을 제어하는지는 STT 연동 후 검증한다. Widget 간 직접 상호작용(예: AI가 Checklist 항목을 체크)은 Deferred다.

### 4.3 Call Preparation and Follow-up

- **REQ-FLOW-001 [Current]** 사용자는 통화 전에 목적이나 확인할 내용을 준비할 수 있어야 한다. 현재는 발신 시 목적 한 줄과 Checklist 초기 항목만 통화에 붙인다.
- **REQ-FLOW-005 [Current, POC]** 사용자는 통화 전에 Widget 구성과 배치를 Preset으로 만들어 두고, 발신과 수신 때 Preset을 고른다. 통화 중 배치 변경은 그 통화에만 적용되고 Preset에는 명시적으로 저장할 때만 반영된다. 수신 측은 수락을 막지 않는 기본 Preset을 쓰되 바꿀 수 있다.
- **REQ-FLOW-006 [Current, POC]** Preset은 사용자 개인 데이터가 아니라 서버에 저장되는 공유 리소스다. 모든 사용자가 기본 제공 테마와 다른 사용자의 Preset을 읽을 수 있고, 자신이 만든 Preset만 수정·삭제할 수 있다. 기본 제공 테마는 누구도 수정할 수 없다. Call setup 화면은 "내 Preset"을 탭으로 보여주고, 새 탭을 만들 때 기본 테마나 다른 사용자의 Preset을 복제해서 시작할 수 있다.- **REQ-FLOW-002 [Current]** 통화 중 생성된 주요 정보, 결정사항, 할 일, 미해결 항목 등을 통화 이후에도 확인할 수 있어야 한다.
- **REQ-FLOW-003 [Hypothesis]** `CallTask`라는 개념이 통화의 목적과 진행 상태를 표현하는 데 적절한지 검증한다.
- **REQ-FLOW-004 [Deferred]** 통화에서 생성된 결과를 캘린더, Todo, Notion, Jira, CRM 등 외부 workflow 도구로 연결하는 기능을 검토한다.

### 4.4 Internal / External Destination

- **REQ-ROUTE-001 [Current]** 내부 사용자와 외부 전화번호를 서로 다른 목적지로 다룰 수 있어야 한다.
- **REQ-ROUTE-004 [Current, POC]** 상대가 온라인이어야만 발신할 수 있는 것은 아니다. 목적지에 따라 전달 방식이 정해진다: 앱을 열어 둔 내부 사용자는 실시간(`APP_REALTIME`), 오프라인 내부 사용자는 푸시 알림 후 접속 시 수신(`APP_PUSH`), 외부 전화번호는 전화망(`PHONE_NETWORK`). POC에서 푸시와 전화망은 더미이며 전화망 통화는 음성을 전달하지 않는다. 오프라인 상대의 no-answer/timeout 종료는 REQ-CALL-003에서 다룬다.
- **REQ-ROUTE-002 [Deferred]** 외부 전화 경로는 실제 carrier 계약 없이도 SIPp 등 테스트 endpoint로 검증할 수 있어야 한다.
- **REQ-ROUTE-003 [Deferred]** 실제 PSTN/SIP trunk 연동은 별도 검증 후 범위에 포함한다.

### 4.5 Device and Recovery

- **REQ-DEV-001 [Current]** 브라우저 새로고침이나 일시적 연결 종료가 곧바로 동일한 logical call의 종료를 의미하지 않도록 설계한다.
- **REQ-DEV-002 [Deferred]** 한 사용자의 여러 device에서 incoming call을 받을 수 있도록 한다.
- **REQ-DEV-003 [Deferred]** 여러 device의 동시 accept와 통화 중 handoff를 안전하게 처리한다.

### 4.6 Usage / Billing / Audit

- **REQ-USAGE-001 [Deferred]** AI execution별 provider usage와 cost를 측정할 수 있어야 한다.
- **REQ-USAGE-002 [Deferred]** provider cost와 사용자 charge 정책을 분리할 수 있어야 한다.
- **REQ-USAGE-003 [Deferred]** 과금 대상 usage의 중복 처리나 유실이 발생하지 않도록 검증 가능한 구조를 가져야 한다.

## 5. Quality Concerns

현재는 목표 수치를 임의로 정하지 않는다. POC와 baseline 측정 후 필요한 항목부터 구체적인 SLO/target으로 승격한다.

- **Realtime latency**: 실시간 보조 결과가 실제 통화 중 사용할 수 있을 만큼 빠른가?
- **Call correctness**: duplicate/out-of-order event, race condition이 call state를 깨뜨리지 않는가?
- **Recovery**: client/backend의 일시적 장애에서 어느 수준까지 통화를 복구해야 하는가?
- **AI freshness**: 오래된 대화 상태를 기준으로 생성된 AI 결과가 잘못 노출되지 않는가?
- **Cost efficiency**: 기능 수 증가가 AI invocation과 비용의 불필요한 선형 증가로 이어지지 않는가?
- **Scalability**: 동시 통화가 증가할 때 어디가 먼저 병목이 되는가?
- **Measurability**: 중요한 정량적 문제는 동일 workload에서 before/after 비교가 가능한가?

## 6. POC Questions

POC는 최종 제품을 축소 구현하는 단계가 아니라 다음 질문에 빠르게 답하기 위한 단계다.

1. Browser 기반 1:1 음성 통화를 FreeSWITCH 중심 구조로 안정적으로 연결할 수 있는가?
2. 통화 음성을 실시간 STT로 전달할 수 있는가?
3. STT 결과를 이용해 통화 중 실제로 쓸 수 있는 AI 보조 결과를 만들 수 있는가?
4. AI 결과를 browser에 realtime으로 전달하는 전체 경로가 동작하는가?
5. 현재 생각한 제품 모델에서 빠르게 드러나는 잘못된 가정은 무엇인가?

## 7. POC Scope

### POC Path

`Browser A -> FreeSWITCH -> Browser B -> audio -> STT -> Backend -> Next Action -> App WebSocket -> Browser`

### Definition of Done

- Browser A가 Browser B에게 발신하고 B가 수락할 수 있다.
- 실제 양방향 음성 통화가 된다.
- 통화 음성이 STT로 변환된다.
- transcript를 기반으로 Next Action 하나가 생성된다.
- 결과가 통화 중 browser UI에 표시된다.
- 연락처에서 발신하고 incoming UI에서 수락한 뒤 전용 통화 화면으로 전환된다.
- 통화 화면에서 Widget을 추가·이동·리사이즈하고 별도 창으로 분리할 수 있다.
- 정상 hangup까지 전체 flow가 동작한다.

### Explicitly Deferred

- horizontal scaling / MSA
- Kafka/Redis의 선제적 도입
- HA
- 완전한 reconnect/recovery
- multi-device/handoff
- 실제 PSTN carrier 연동
- 실제 billing
- 본격적인 부하 최적화
- Prometheus/Grafana/distributed tracing

## 8. Out of Scope for Initial Development

- 대규모 다자간 영상회의
- 자체 STT/LLM 모델 학습이나 GPU 인프라
- 실제 통신사업자 수준의 PSTN 서비스 운영
- POC 이전의 speculative MSA/Kubernetes 설계
