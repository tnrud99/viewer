# 타임스탬프 서버 저장 기능 개발 계획

## 📋 개요
로그인 기능이 구현된 후, 타임스탬프 파일을 서버에 직접 저장하고 관리하는 기능을 개발하여 사용자 경험을 개선하는 프로젝트

## 🎯 목표
- 타임스탬프 파일 export/import 과정 제거
- 서버에서 직접 타임스탬프 수정 및 링크 생성
- 사용자별 타임스탬프 관리 시스템 구축

## 📊 현재 상황 분석

### ✅ 이미 구현된 것들
- MongoDB + JWT 기반 로그인 시스템
- `veUrlSchema`에 `timestamp_data` 필드 존재
- VE URL 생성 API (`/api/create-ve-url`)
- 타임스탬프 export/import 기능 (FileManager.js)

### 🔧 현재 아키텍처
```
사용자 → 타임스탬프 편집 → 파일 export → 수동 업로드 → VE URL 생성
```

### 🎯 목표 아키텍처
```
사용자 → 타임스탬프 편집 → 서버 자동 저장 → 즉시 VE URL 생성
```

## 🚀 개발 단계별 계획

### Phase 1: 백엔드 API 개발
- [ ] 사용자별 타임스탬프 저장소 API
  - `POST /api/timestamps` - 타임스탬프 저장
  - `GET /api/timestamps` - 사용자 타임스탬프 목록 조회
  - `PUT /api/timestamps/:id` - 타임스탬프 수정
  - `DELETE /api/timestamps/:id` - 타임스탬프 삭제
- [ ] 데이터베이스 스키마 확장
  - `timestampSchema` 생성 (별도 컬렉션)
  - 사용자별 타임스탬프 관리
  - 메타데이터 추가 (생성일, 수정일, 제목, 설명 등)

### Phase 2: 프론트엔드 UI 개선
- [ ] 에디터 UI 수정
  - "Save to Server" 버튼 추가
  - "My Timestamps" 메뉴 추가
  - 저장된 타임스탬프 목록 표시
- [ ] 기존 파일 업로드 방식과 병행 운영
  - 사용자가 선택할 수 있도록 옵션 제공
  - 점진적 마이그레이션 지원

### Phase 3: 고급 기능
- [ ] 타임스탬프 버전 관리
- [ ] 공유 및 협업 기능
- [ ] 자동 저장 기능
- [ ] 타임스탬프 템플릿 시스템

## ⚠️ 예상 문제점 및 해결 방안

### 1. 데이터 정리 문제
**문제**: 불필요한 타임스탬프가 서버에 쌓임
**해결방안**:
- 자동 삭제 정책 (예: 30일 미사용 시 삭제)
- 사용자별 저장 용량 제한
- 정기적인 데이터 정리 스크립트

### 2. 저장 공간 관리
**문제**: MongoDB 저장 용량 증가
**해결방안**:
- 타임스탬프 데이터 압축
- 불필요한 메타데이터 제거
- 사용자별 저장 한도 설정

### 3. 사용자 경험 변경
**문제**: 기존 워크플로우 변경으로 인한 혼란
**해결방안**:
- 점진적 마이그레이션
- 기존 방식과 새 방식 병행 운영
- 사용자 가이드 및 튜토리얼 제공

## 🛠️ 기술적 구현 세부사항

### 데이터베이스 스키마
```javascript
const timestampSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  timestamp_data: { type: Object, required: true },
  metadata: {
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    last_accessed: { type: Date, default: Date.now },
    access_count: { type: Number, default: 0 }
  },
  settings: {
    is_public: { type: Boolean, default: false },
    tags: [{ type: String }]
  }
});
```

### API 엔드포인트
```javascript
// 타임스탬프 저장
POST /api/timestamps
{
  "title": "My Timestamp",
  "description": "Description",
  "timestamp_data": { ... },
  "settings": { ... }
}

// 타임스탬프 목록 조회
GET /api/timestamps?page=1&limit=10

// 타임스탬프 수정
PUT /api/timestamps/:id
{
  "title": "Updated Title",
  "timestamp_data": { ... }
}
```

## 📅 개발 우선순위

### 🔴 높은 우선순위 (즉시 필요)
- 현재 기능의 안정성 확보
- 버그 수정 및 성능 최적화

### 🟡 중간 우선순위 (단계적 개발)
1. **Phase 1: 백엔드 API 개발** (2-3주)
2. **Phase 2: 프론트엔드 UI 개선** (2-3주)
3. **데이터 마이그레이션 도구** (1주)

### 🟢 낮은 우선순위 (장기 계획)
- **Phase 3: 고급 기능** (4-6주)
- 기존 파일 기반 시스템 완전 제거
- 고급 편집 기능 (버전 관리, 협업 등)

## 🧪 테스트 계획

### 단위 테스트
- [ ] API 엔드포인트 테스트
- [ ] 데이터베이스 스키마 검증
- [ ] 인증 및 권한 테스트

### 통합 테스트
- [ ] 전체 워크플로우 테스트
- [ ] 기존 기능과의 호환성 테스트
- [ ] 성능 테스트

### 사용자 테스트
- [ ] 베타 사용자 그룹 테스트
- [ ] 사용성 테스트
- [ ] 피드백 수집 및 개선

## 📝 참고사항

### 현재 파일 위치
- 에디터: `src/editor/`
- 서버: `src/server/`
- 타임스탬프 관리: `src/editor/js/modules/FileManager.js`

### 관련 파일들
- `src/server/server.js` - 서버 메인 파일
- `src/editor/js/SimpleEditor.js` - 에디터 메인 로직
- `src/editor/index.html` - 에디터 UI

### 개발 시 주의사항
- 기존 사용자 경험을 해치지 않도록 점진적 개발
- 데이터 백업 및 복구 계획 수립
- 성능 모니터링 및 최적화
- 보안 검토 (사용자 데이터 보호)

---

**생성일**: 2024년 1월
**상태**: 계획 단계
**우선순위**: 개발 후순위
**예상 개발 기간**: 8-12주 (단계별 진행)
