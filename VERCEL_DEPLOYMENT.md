# 🚀 Vercel 배포 가이드

## 📋 사전 준비사항

### 1. **Vercel CLI 설치**
```bash
npm install -g vercel
```

### 2. **MongoDB Atlas 설정**
1. [MongoDB Atlas](https://www.mongodb.com/atlas)에서 무료 클러스터 생성
2. 데이터베이스 사용자 생성
3. 네트워크 액세스 설정 (0.0.0.0/0으로 모든 IP 허용)
4. 연결 문자열 복사

## 🔧 배포 단계

### 1. **Vercel 로그인**
```bash
vercel login
```

### 2. **프로젝트 초기화**
```bash
vercel
```

### 3. **환경 변수 설정**
Vercel 대시보드에서 다음 환경 변수들을 설정:

```env
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/ve_url_system?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
```

### 4. **배포 실행**
```bash
vercel --prod
```

## 🌐 배포 후 확인사항

### 1. **서버 상태 확인**
```
https://your-project.vercel.app/api/health
```

### 2. **MongoDB 연결 확인**
```
https://your-project.vercel.app/api/test-mongodb
```

### 3. **VE URL 생성 테스트**
- 메인 페이지 접속
- "VE URL Creator" 클릭
- 테스트 데이터로 VE URL 생성
- 서버 응답 확인

## 🔍 문제 해결

### MongoDB 연결 실패
1. MongoDB Atlas 클러스터 상태 확인
2. 연결 문자열 정확성 확인
3. 네트워크 액세스 설정 확인
4. 데이터베이스 사용자 권한 확인

### API 호출 실패
1. Vercel 함수 로그 확인
2. 환경 변수 설정 확인
3. 서버 코드 오류 확인

## 📊 모니터링

### Vercel 대시보드
- 함수 실행 시간
- 요청 수
- 오류율
- 메모리 사용량

### MongoDB Atlas 대시보드
- 데이터베이스 연결 수
- 쿼리 성능
- 저장소 사용량

## 🔄 업데이트 배포

```bash
# 코드 변경 후
vercel --prod
```

## 📝 중요 사항

1. **환경 변수**: MongoDB URI와 JWT Secret은 반드시 설정
2. **CORS**: 프론트엔드에서 API 호출 시 CORS 설정 확인
3. **타임아웃**: Vercel 함수는 30초 제한
4. **데이터베이스**: MongoDB Atlas 무료 티어 사용 가능

## 🎯 성공적인 배포 후

- ✅ 서버가 온라인에서 접근 가능
- ✅ MongoDB 데이터베이스 연결
- ✅ VE URL 생성 및 저장
- ✅ 생성된 URL로 뷰어 접근
- ✅ 온라인 공유 기능 작동 