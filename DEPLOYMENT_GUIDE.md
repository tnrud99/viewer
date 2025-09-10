# 🚀 배포 가이드

## 브랜치 구조

```
main (소스코드 저장소)
├── development (개발 및 테스트)
├── production (실제 서비스 배포)
└── homepage (홈페이지 전용)
```

## 브랜치별 역할

### 🌟 **main**
- **역할**: 소스코드의 공식 저장소
- **배포**: 자동 배포 비활성화
- **용도**: 안정적인 코드 버전 관리

### 🛠️ **development**
- **역할**: 개발 및 테스트
- **배포**: Vercel Preview URL
- **용도**: 새로운 기능 개발 및 테스트

### 🚀 **production**
- **역할**: 실제 서비스 배포
- **배포**: 실제 도메인 (yourdomain.com)
- **용도**: 검증된 코드만 배포

### 🏠 **homepage**
- **역할**: 홈페이지 전용 개발
- **배포**: Vercel Preview URL
- **용도**: 홈페이지 관련 작업

## 배포 워크플로우

### 1. 일상적인 개발
```bash
# development 브랜치에서 작업
git checkout development
git pull origin development

# 개발 작업...
git add .
git commit -m "새 기능 추가"
git push origin development
# → 자동으로 Vercel preview URL에 배포됨
```

### 2. 배포 준비
```bash
# 1. main에 최신 코드 반영
git checkout main
git merge development
git push origin main

# 2. production에 배포
git checkout production
git merge main
git push origin production
# → 실제 도메인에 배포됨
```

### 3. 홈페이지 작업
```bash
# homepage 브랜치에서 작업
git checkout homepage
git pull origin homepage

# 홈페이지 작업...
git add .
git commit -m "홈페이지 업데이트"
git push origin homepage
# → 자동으로 Vercel preview URL에 배포됨
```

## 안전한 배포 체크리스트

### 배포 전 확인사항
- [ ] 코드가 정상적으로 작동하는지 테스트
- [ ] 모든 변경사항이 커밋되었는지 확인
- [ ] main 브랜치가 최신 상태인지 확인
- [ ] production 브랜치에 올바른 코드가 있는지 확인

### 배포 후 확인사항
- [ ] 사이트가 정상적으로 로드되는지 확인
- [ ] 모든 기능이 정상 작동하는지 확인
- [ ] 모바일에서도 정상 작동하는지 확인

## 문제 발생 시 대응

### 롤백 방법
```bash
# 이전 커밋으로 되돌리기
git checkout production
git reset --hard [이전_커밋_해시]
git push origin production --force
```

### 긴급 수정
```bash
# production에서 직접 수정 (긴급시만)
git checkout production
# 수정 작업...
git add .
git commit -m "긴급 수정"
git push origin production
```

## Vercel 설정

### 도메인 연결
1. Vercel 대시보드 → 프로젝트 선택
2. Settings → Domains
3. Add Domain → 도메인 입력
4. DNS 설정 안내에 따라 설정

### 환경 변수
- `NODE_ENV`: production (production 브랜치에서만)
- 기타 필요한 환경 변수들

## 주의사항

⚠️ **중요**: production 브랜치에 직접 푸시하지 마세요!
- 항상 main을 거쳐서 production으로 배포
- 긴급한 경우에만 예외적으로 허용

⚠️ **보안**: 민감한 정보는 환경 변수로 관리
- API 키, 데이터베이스 연결 정보 등

## 도움말

문제가 발생하면:
1. 먼저 development 브랜치에서 테스트
2. 문제 해결 후 main → production 순서로 배포
3. 필요시 이전 버전으로 롤백
