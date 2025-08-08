# Component Isolation Guide

## 🎯 목표
Editor와 Viewer 컴포넌트의 완전한 독립성 보장

## 📁 독립적인 구조

```
viewer/
├── src/
│   ├── editor/                    # 🔧 Editor 독립 영역
│   │   ├── index.html            # Editor 전용 페이지
│   │   ├── js/
│   │   │   ├── app.js           # Editor 메인 로직
│   │   │   ├── timeline-controls.js
│   │   │   ├── drag-drop.js
│   │   │   └── advanced-editing.js
│   │   ├── css/
│   │   │   └── style.css        # Editor 전용 스타일
│   │   └── utils/               # Editor 전용 유틸리티
│   │       └── editor-utils.js
│   │
│   ├── viewer/                   # 📺 Viewer 독립 영역
│   │   ├── viewer.html          # Viewer 메인 페이지
│   │   ├── index.html
│   │   ├── create-ve-url*.html  # 🔗 VE URL 생성기들 (독립)
│   │   └── utils/               # Viewer 전용 유틸리티
│   │       └── viewer-utils.js
│   │
│   ├── recorder/                 # 🎥 Recorder 독립 영역 (완전 독립)
│   │   ├── recorder.html        # Recorder 전용 페이지
│   │   └── recorder.js          # Recorder 전용 로직
│   │
│   ├── shared/                   # 🔗 공통 모듈 (주의깊게 관리)
│   │   ├── utils/
│   │   │   ├── youtube-api.js   # YouTube API 공통 함수
│   │   │   ├── timestamp-parser.js # 타임스탬프 파싱
│   │   │   ├── common-functions.js # 모든 컴포넌트 공통 함수
│   │   │   └── common-ui.js     # 공통 UI 컴포넌트
│   │   ├── constants/
│   │   │   └── config.js        # 공통 설정값
│   │   └── loader.js            # 모듈 로더
│   │
│   └── server/                   # 🖥️ 서버 (완전 독립)
│       ├── server.js
│       └── public/
```

## 🔒 독립성 보장 규칙

### 1. 코드 의존성 제거
- ❌ Editor에서 Viewer 코드 직접 참조 금지
- ❌ Viewer에서 Editor 코드 직접 참조 금지
- ✅ 공통 기능은 shared/ 모듈을 통해서만 접근

### 2. 스타일 격리
- ✅ Editor: `src/editor/css/` 전용 스타일
- ✅ Viewer: 인라인 스타일 또는 별도 CSS 파일
- ❌ 전역 CSS 클래스명 충돌 방지

### 3. JavaScript 네임스페이스 분리
- ✅ Editor: `TimestampEditor` 클래스 기반
- ✅ Viewer: 글로벌 함수 또는 `Viewer` 네임스페이스
- ❌ 전역 변수명 중복 방지

### 4. API 인터페이스 표준화
- ✅ 공통 데이터 포맷: `shared/types/timestamp.js`
- ✅ 표준 이벤트 시스템
- ✅ 일관된 에러 처리

## 🚧 마이그레이션 계획

### Phase 1: 공통 모듈 분리
1. YouTube API 래퍼 함수 → `shared/utils/youtube-api.js`
2. 타임스탬프 파싱 로직 → `shared/utils/timestamp-parser.js`
3. 공통 UI 컴포넌트 → `shared/utils/common-ui.js`

### Phase 2: 독립적인 빌드 시스템
1. Editor 전용 빌드 스크립트
2. Viewer 전용 빌드 스크립트
3. 독립적인 테스트 환경

### Phase 3: 문서화 및 테스트
1. 각 컴포넌트별 독립 문서
2. 크로스 컴포넌트 테스트
3. 버전 관리 전략

## 🔧 개발 가이드라인

### Editor 수정 시
1. `src/editor/` 내부 파일만 수정
2. 공통 기능 필요 시 `shared/` 모듈 사용
3. Viewer 관련 코드 참조 금지

### Viewer 수정 시
1. `src/viewer/` 내부 파일만 수정
2. 공통 기능 필요 시 `shared/` 모듈 사용
3. Editor 관련 코드 참조 금지

### 공통 모듈 수정 시
1. 하위 호환성 보장
2. 두 컴포넌트 모두에서 테스트
3. 버전 업데이트 문서화

## 📋 체크리스트

### 독립성 확인 사항
- [ ] Editor 단독 실행 가능
- [ ] Viewer 단독 실행 가능
- [ ] 스타일 충돌 없음
- [ ] JavaScript 네임스페이스 충돌 없음
- [ ] 공통 모듈을 통한 안전한 코드 공유
- [ ] 독립적인 배포 가능

### 수정 후 확인 사항
- [ ] Editor 기능 정상 작동
- [ ] Viewer 기능 정상 작동
- [ ] 공통 기능 양쪽에서 정상 작동
- [ ] 성능 영향 최소화
