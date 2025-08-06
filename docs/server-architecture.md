# Server-Based VE URL System Architecture

## 🏗️ System Overview

### Frontend (Client)
- HTML/CSS/JavaScript (기존 뷰어 확장)
- VE URL 생성 및 공유 인터페이스
- 실시간 데이터 업로드 및 다운로드

### Backend (Server)
- **API Server**: Node.js/Express 또는 Python/FastAPI
- **Database**: MongoDB 또는 PostgreSQL
- **File Storage**: AWS S3 또는 로컬 파일 시스템
- **Authentication**: JWT 토큰 기반 인증

## 📊 Database Schema

### VE_URLs Collection
```javascript
{
  _id: ObjectId,
  ve_id: String,           // 고유 VE ID (예: ve_abc123)
  creator_id: ObjectId,    // 생성자 ID
  title: String,           // 제목
  description: String,     // 설명
  reaction_url: String,    // 리액션 비디오 URL
  original_url: String,    // 원본 비디오 URL
  timestamp_data: Object,  // 타임스탬프 데이터
  settings: {              // 뷰어 설정
    overlay_position: String,
    overlay_size: Number,
    youtube_volume: Number
  },
  metadata: {              // 메타데이터
    created_at: Date,
    updated_at: Date,
    view_count: Number,
    is_public: Boolean
  },
  access_control: {        // 접근 제어
    is_public: Boolean,
    allowed_users: [ObjectId],
    password: String       // 선택적 비밀번호
  }
}
```

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password_hash: String,
  created_at: Date,
  ve_urls: [ObjectId]     // 사용자가 생성한 VE URL들
}
```

## 🔌 API Endpoints

### VE URL Management
```
POST   /api/ve-urls/create          # VE URL 생성
GET    /api/ve-urls/:id             # VE URL 조회
PUT    /api/ve-urls/:id             # VE URL 수정
DELETE /api/ve-urls/:id             # VE URL 삭제
GET    /api/ve-urls/user/:userId    # 사용자의 VE URL 목록
```

### Authentication
```
POST   /api/auth/register           # 회원가입
POST   /api/auth/login              # 로그인
POST   /api/auth/logout             # 로그아웃
GET    /api/auth/profile            # 프로필 조회
```

### Analytics
```
POST   /api/analytics/view          # 조회수 증가
GET    /api/analytics/:id           # 통계 조회
```

## 🚀 Implementation Plan

### Phase 1: Basic Server Setup
1. **Node.js/Express 서버 구축**
2. **MongoDB 데이터베이스 연결**
3. **기본 CRUD API 구현**
4. **파일 업로드 기능**

### Phase 2: Authentication & Security
1. **JWT 인증 시스템**
2. **사용자 관리 (회원가입/로그인)**
3. **접근 제어 (공개/비공개)**
4. **API 보안 (Rate Limiting, CORS)**

### Phase 3: Advanced Features
1. **실시간 통계 및 분석**
2. **VE URL 검색 및 필터링**
3. **사용자 프로필 및 대시보드**
4. **알림 시스템**

### Phase 4: Scalability
1. **CDN 설정 (CloudFlare)**
2. **로드 밸런싱**
3. **캐싱 시스템 (Redis)**
4. **모니터링 및 로깅**

## 💾 File Storage Options

### Option 1: AWS S3
- **장점**: 확장성, 안정성, 글로벌 CDN
- **단점**: 비용, 복잡성
- **용도**: 대규모 서비스

### Option 2: Local File System
- **장점**: 간단함, 비용 없음
- **단점**: 확장성 제한, 백업 필요
- **용도**: 소규모 서비스, 프로토타입

### Option 3: Cloudinary
- **장점**: 이미지/비디오 최적화, CDN
- **단점**: 비용
- **용도**: 미디어 파일 관리

## 🔐 Security Considerations

### Data Protection
- **타임스탬프 데이터 암호화**
- **API 키 관리**
- **HTTPS 강제**
- **SQL Injection 방지**

### Access Control
- **JWT 토큰 기반 인증**
- **Role-based access control**
- **Rate limiting**
- **CORS 설정**

## 📈 Scalability Features

### Performance Optimization
- **데이터베이스 인덱싱**
- **API 응답 캐싱**
- **이미지 압축**
- **CDN 활용**

### Monitoring
- **서버 상태 모니터링**
- **API 응답 시간 측정**
- **에러 로깅**
- **사용자 행동 분석**

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT
- **File Storage**: AWS S3
- **Caching**: Redis

### Frontend
- **Framework**: React/Vue.js (선택사항)
- **HTTP Client**: Axios
- **State Management**: Redux/Vuex
- **UI Library**: Material-UI/Ant Design

### DevOps
- **Hosting**: AWS EC2/DigitalOcean
- **Domain**: CloudFlare
- **SSL**: Let's Encrypt
- **CI/CD**: GitHub Actions

## 💰 Cost Estimation

### Monthly Costs (예상)
- **Server**: $20-50 (AWS EC2)
- **Database**: $10-30 (MongoDB Atlas)
- **Storage**: $5-20 (AWS S3)
- **Domain**: $10-15/year
- **CDN**: $10-50 (CloudFlare Pro)

**Total**: $45-150/month

## 🎯 Next Steps

1. **서버 환경 구축**
2. **데이터베이스 설계 및 구현**
3. **기본 API 개발**
4. **프론트엔드 연동**
5. **테스트 및 배포**
6. **사용자 피드백 수집**
7. **기능 개선 및 확장** 