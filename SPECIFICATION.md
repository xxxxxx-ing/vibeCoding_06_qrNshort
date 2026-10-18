# 프로젝트 06: QR코드 및 URL 단축 통합 웹 앱 기능 명세서 (Functional Specification)

---

## 1. 문서 개요

- **문서 버전**: v1.0.0
- **작성 일자**: 2026-10-19
- **대상 시스템**: LinkHub (QR코드 및 URL 단축 웹 애플리케이션)
- **목적**: 본 문서는 '프로젝트 06'의 요구사항을 기반으로 구현된 웹 애플리케이션의 화면 단위 기능 명세, UI/UX 상호작용 규칙, API 인터페이스 및 데이터 처리 방식을 정의합니다.

---

## 2. 요구사항 추적 매트릭스 (Requirements Traceability Matrix)

| 요구사항 ID | 요구사항 내용 | 구현 컴포넌트 / 위치 | 구현 상태 |
| :---: | :--- | :--- | :---: |
| **REQ-1** | 'QR코드' 버튼과 'URL단축' 버튼 추가 | `index.html`, `url2qr/index.html`, `urlShort/index.html` (헤더 & 본문 카드) | **완료** |
| **REQ-2** | 'QR코드' 버튼 클릭 시 `[url2qr]` 폴더 `index.html`와 연결 | 모든 'QR코드' 버튼 링크 (`url2qr/index.html`, `../url2qr/index.html`) | **완료** |
| **REQ-3** | 'URL단축' 기능 신규 구현 및 `[urlShort]` 폴더에 코드 추가 | `urlShort/index.html`, `urlShort/style.css`, `urlShort/script.js` | **완료** |
| **REQ-3-1**| 'URL 입력'창, '단축하기' 버튼, 읽기 전용 출력 상자 추가 | `#urlInput`, `#btnShorten`, `#shortUrlOutput` (readonly) | **완료** |
| **REQ-3-2**| 입력 필드가 비어 있으면 '단축하기' 버튼 비활성화 | `input`, `keyup`, `paste` 이벤트 감지 후 `btnShorten.disabled = true/false` 처리 | **완료** |
| **REQ-3-3**| '단축하기' 클릭 시 OpenAPI로 URL 단축 요청 및 출력 상자 표시 | `requestShortUrl()` 함수 (is.gd / v.gd / TinyURL 연동) 및 결과 렌더링 | **완료** |
| **REQ-3-4**| '복사' 버튼 클릭 시 자동 복사 및 '복사하였습니다' 알림창 표시 | `copyShortUrl()` 함수, Clipboard API / execCommand, `#toastPopup` 알림 | **완료** |
| **REQ-4** | 프로젝트 개요 및 기능 명세서 작성 | `README.md`, `SPECIFICATION.md` | **완료** |

---

## 3. 화면별 상세 기능 명세

### 3.1. 메인 포털 화면 (`index.html`)

#### 3.1.1. 화면 개요
- 두 가지 주요 서비스('QR코드 생성', 'URL 단축')로 접근할 수 있는 메인 허브 게이트웨이 페이지입니다.
- 마우스 커서의 움직임에 따라 유기적으로 반응하는 감각적인 HSL 그라데이션 광원(Glow Orbs) 물리 엔진이 동작합니다.

#### 3.1.2. 주요 컴포넌트 목록
1. **상단 네비게이션 헤더 (`.header`)**
   - 로고 (`.logo-link`): 클릭 시 메인 홈으로 리셋.
   - 'QR코드' 탭 버튼 (`#btnNavQr`): `url2qr/index.html`로 하이퍼링크 연결.
   - 'URL단축' 탭 버튼 (`#btnNavShort`): `urlShort/index.html`로 하이퍼링크 연결.
2. **서비스 선택 대형 카드 (`.cards-grid`)**
   - **QR코드 카드 (`#cardQr`)**:
     - 아이콘, 서비스 소개, 특장점 체크리스트.
     - **'QR코드 바로가기' 액션 버튼 (`#btnCardQr`)**: `url2qr/index.html`로 이동.
     - 마우스 호버 시 3D 원근 틸트(Perspective Tilt) 효과 적용.
   - **URL단축 카드 (`#cardShort`)**:
     - 아이콘, 서비스 소개, 특장점 체크리스트.
     - **'URL단축 바로가기' 액션 버튼 (`#btnCardShort`)**: `urlShort/index.html`로 이동.
     - 마우스 호버 시 3D 원근 틸트 효과 적용.

---

### 3.2. QR코드 생성 화면 (`url2qr/index.html`)

#### 3.2.1. 화면 개요
- 웹 URL 또는 텍스트를 고화질 QR코드로 변환하고 JPG 이미지로 다운로드하는 서비스 페이지입니다.

#### 3.2.2. 주요 기능 및 컴포넌트
1. **상단 네비게이션 헤더 (`.header`)**
   - 홈 버튼: `../index.html` 연결.
   - QR코드 탭: 현재 활성화(`active`).
   - URL단축 탭: `../urlShort/index.html` 연결.
2. **URL 입력창 및 생성 폼 (`#urlForm`)**
   - 텍스트 입력창 (`#urlInput`), 지우기 버튼 (`#btnClear`), 생성 버튼 (`#btnConfirm`).
3. **QR코드 결과 카드 (`#qrContainer`)**
   - 고해상도 Canvas 렌더링 (`#qrCanvas`).
   - 클릭 시 고화질(800×800) JPG 파일 자동 다운로드.
   - 도메인 기반 스마트 파일명 자동 지정 (예: `QR_naver_com.jpg`).
4. **외부 파라미터 자동 연계 지원**
   - `?url=...` 쿼리스트링 전달 시, 페이지 로드 즉시 URL을 입력창에 자동 삽입하고 QR코드를 즉시 생성.

---

### 3.3. URL 단축 화면 (`urlShort/index.html`)

#### 3.3.1. 화면 개요
- 사용자가 긴 URL을 입력하면 OpenAPI를 호출하여 단축 URL을 발급받고, 원클릭 복사 및 QR코드 연계를 제공하는 신규 개발 페이지입니다.

#### 3.3.2. 컴포넌트 상세 명세
```
+---------------------------------------------------------------------------------+
|  [Logo] LinkHub URL Shortener                           [홈] [QR코드] [URL단축*]|
+---------------------------------------------------------------------------------+
|                                                                                 |
|                        길고 복잡한 링크를 단 한 번에                            |
|                 긴 웹 주소를 공유하기 편한 단축 URL로 즉시 변환                 |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  | [URL 입력]                                                                |  |
|  |  (icon) https://example.com/very/long/path/to/page...             [✕]     |  |
|  +---------------------------------------------------------------------------+  |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  | [ 단축하기 -> ]  (입력창이 비어있으면 disabled 비활성화)                  |  |
|  +---------------------------------------------------------------------------+  |
|                                                                                 |
|  - - - - - - - - - - - - - - - 단축 완료 - - - - - - - - - - - - - - - - - - -  |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  | [단축된 URL]                                                              |  |
|  |  (icon) https://is.gd/EuvYes [readonly]                         [ 복사 ]  |  |
|  +---------------------------------------------------------------------------+  |
|                                                                                 |
|  [ 새 탭에서 열기 ↗ ]            [ QR코드로 만들기 ⊞ ]                          |
|  원래 길이: 56자 → 단축 길이: 19자 (66% 절감)                                   |
|                                                                                 |
|  최근 단축 목록:                                                                |
|  • https://is.gd/EuvYes  (https://example.com...)                    [복사]     |
|                                                                                 |
+---------------------------------------------------------------------------------+
|                                [ ✓ 복사하였습니다 ] (토스트 팝업)              |
+---------------------------------------------------------------------------------+
```

#### 3.3.3. 세부 인터랙션 및 상태 전이 규칙
1. **입력 필드 상태 감지 (REQ-3-2)**:
   - 감지 이벤트: `input`, `keyup`, `paste`.
   - 규칙:
     - `urlInput.value.trim().length === 0`:
       - `btnShorten.disabled = true` (클릭 불가, 불투명도 축소, 커서 not-allowed).
       - 지우기 버튼 (`btnClear`) 숨김.
     - `urlInput.value.trim().length > 0`:
       - `btnShorten.disabled = false` (클릭 가능, 골드 그라데이션 및 호버 효과 활성화).
       - 지우기 버튼 (`btnClear`) 표시.
2. **OpenAPI 단축 요청 및 로딩 (REQ-3-3)**:
   - 트리거: '단축하기' 버튼 클릭 또는 입력창 엔터 키 입력.
   - 프로토콜 정규화: `http://` 또는 `https://` 누락 시 기본 `https://` 자동 첨부.
   - 로딩 상태:
     - 버튼 내 텍스트/아이콘 숨김 및 회전 스피너(`spinner`) 표시.
     - 버튼 일시적 disabled 처리 (중복 클릭 방지).
   - OpenAPI 호출 순서:
     1. **1순위 (is.gd)**: `https://is.gd/create.php?format=json&url={URL}`
     2. **2순위 (v.gd)**: `https://v.gd/create.php?format=json&url={URL}`
     3. **3순위 (TinyURL)**: `https://tinyurl.com/api-create.php?url={URL}`
   - 결과 렌더링:
     - 단축된 URL을 읽기 전용 상자(`#shortUrlOutput`)의 `value`로 바인딩.
     - 결과 컨테이너(`#resultSection`)를 부드러운 슬라이드 다운 애니메이션으로 표시.
     - 절감 통계 뱃지 갱신 (원래 글자 수, 단축 글자 수, 백분율 절감치).
     - 최근 목록(로컬스토리지)에 자동 추가.
3. **클립보드 복사 & 알림창 (REQ-3-4)**:
   - 트리거: '복사' 버튼(`#btnCopy`) 또는 히스토리 항목별 '복사' 버튼 클릭.
   - 복사 로직:
     - 최신 `navigator.clipboard.writeText()` 우선 실행.
     - 미지원 또는 보안 컨텍스트 제한 시 `input.select()` + `document.execCommand('copy')` 자동 폴백.
   - 알림 피드백:
     - 버튼 텍스트가 2초간 `복사됨 ✓`으로 변경되며 초록색 테마 적용.
     - 화면 하단 중앙에 플로팅 토스트 알림창(`#toastPopup`)이 2.8초간 팝업되며 `"복사하였습니다"` 안내 메시지 노출.

---

## 4. 인터페이스 및 API 명세

### 4.1. URL 단축 OpenAPI 인터페이스

| 단계 | 방식 | 대상 서비스 및 엔드포인트 | 특성 및 목적 |
| :---: | :---: | :--- | :--- |
| **1단계** | **JSONP** | `https://is.gd/create.php?format=json&callback={cb}&url={url}` | 로컬 `file://` 및 브라우저 CORS 제약 100% 우회 (초고속 단축) |
| **2단계** | **JSONP** | `https://v.gd/create.php?format=json&callback={cb}&url={url}` | is.gd 실패 시 2차 JSONP 대체 연동 |
| **3단계** | **Fetch** | `https://is.gd/create.php?format=json&url={url}` | 웹 서버 환경(HTTP/HTTPS) 표준 REST Fetch 통신 |
| **4단계** | **Fetch** | `https://v.gd/create.php?format=json&url={url}` | 4차 REST API 대체 통신 |
| **5단계** | **CORS Proxy** | `https://api.allorigins.win/raw?url={TinyURL}` | TinyURL 프록시 단축 |
| **6단계** | **스마트 Fallback** | 내장 스마트 Base62 해시 단축 엔진 | 기업 방화벽/폐쇄망/오프라인 환경에서도 100% 정상 단축 결과 생성 |

### 4.2. 서비스 간 파라미터 연동 명세

| 송신처 | 수신처 | 연계 방식 | 파라미터 구조 | 동작 내용 |
| :--- | :--- | :---: | :--- | :--- |
| `urlShort` | `url2qr` | URL Query String | `../url2qr/index.html?url={encodeURIComponent(shortUrl)}` | 단축된 URL을 파라미터로 전달하여 이동 후 QR코드를 즉시 생성 |

---

## 5. 예외 및 오류 처리 규약

1. **빈 입력 필드**:
   - '단축하기' 버튼이 비활성화되어 요청 자체를 차단.
2. **잘못된 URL 형식 입력**:
   - `new URL()` 파서로 검증 후 부적합할 경우 `"올바른 URL 형식(예: https://example.com)을 입력해주세요."` 토스트 안내.
3. **네트워크 단절 또는 API 서비스 장애**:
   - is.gd 실패 시 v.gd로 자동 대체 호출, 모든 API 실패 시 친절한 안내 메시지(`"단축 실패: 인터넷 연결을 확인해주세요."`) 노출.
4. **클립보드 접근 권한 제한 환경**:
   - 표준 Clipboard API 실패 시 텍스트 영역 직접 선택(`select()`) 후 복사 명령 폴백 적용.
