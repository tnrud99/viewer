# VE Viewer

Virtual Environment 뷰어 및 관련 도구들을 제공하는 웹 기반 플랫폼입니다.

## 📁 프로젝트 구조

```
viewer/
├── index.html                 # 메인 페이지
├── README.md                  # 프로젝트 설명서
├── src/                       # 소스 코드
│   ├── viewer/               # VE 뷰어 관련 파일들
│   │   ├── viewer.html
│   │   ├── index.html
│   │   ├── create-ve-url.html
│   │   ├── create-ve-url-enhanced.html  # 🆕 향상된 VE URL 생성기
│   │   ├── create-ve-url-server.html
│   │   └── create-ve-url-storage.html
│   ├── editor/               # VE 에디터 관련 파일들
│   │   ├── index.html
│   │   ├── js/
│   │   └── css/
│   ├── recorder/             # VE 레코더 관련 파일들
│   │   ├── recorder.html
│   │   └── recorder.js
│   └── server/               # 서버 관련 파일들
│       ├── server.js
│       ├── package.json
│       ├── public/
│       └── ...
├── assets/                    # 정적 자원들
│   ├── samples/              # 샘플 데이터 파일들
│   │   ├── sample_ve_timestamp.json
│   │   ├── sample_timestamp.json
│   │   └── test_data.json
│   └── config/               # 설정 파일들
│       └── vercel.json
└── docs/                      # 문서들
    ├── deployment-guide.md
    └── server-architecture.md
```

## 🚀 주요 기능

### 1. VE 뷰어 (Viewer)
- Virtual Environment 데이터를 시각화
- 3D 환경에서 객체 탐색
- 실시간 데이터 업데이트

### 2. VE 에디터 (Editor)
- Virtual Environment 데이터 편집
- 타임라인 기반 편집 기능
- 드래그 앤 드롭 인터페이스

### 3. VE 레코더 (Recorder)
- Virtual Environment 데이터 녹화
- 실시간 데이터 캡처
- 다양한 포맷 지원

### 4. VE URL 생성기
- Virtual Environment URL 생성
- 서버 및 스토리지 연동
- URL 관리 기능

### 5. 🆕 향상된 VE URL 생성기 (Enhanced VE URL Creator)
- **사용자 정보 입력**: 사용자 이름, 이메일, 비밀번호 입력
- **비디오 정보 설정**: 리액션 유튜브 영상 URL과 원본 유튜브 영상 URL 입력
- **타임스탬프 파일**: 동기화 정보가 포함된 JSON 파일 업로드
- **뷰어 설정**: 오버레이 위치, 크기, 볼륨 등 설정
- **접근 제어**: 공개/비공개 링크 설정
- **서버 업로드**: 생성된 데이터를 서버에 업로드하여 온라인 공유 가능
- **온라인 공유**: 특정 코드가 포함된 고유 URL 생성으로 누구나 시청 가능

## 🎬 VE URL 시스템 특징

### 사용자 경험
1. **간단한 정보 입력**: 사용자 이름, 비밀번호, 비디오 URL, 타임스탬프 파일만 입력
2. **자동 설정**: 기본 설정으로도 바로 사용 가능
3. **온라인 공유**: 생성된 URL로 누구나 접근 가능

### 기술적 특징
- **UTF-8 지원**: 안전한 Base64 인코딩으로 한글 지원
- **데이터 압축**: URL 길이 제한을 위한 데이터 최적화
- **서버 연동**: MongoDB 데이터베이스와 연동
- **에러 처리**: 로컬 모드와 서버 모드 자동 전환
- **반응형 디자인**: 모바일 환경에서도 최적화된 UI

### 생성된 URL 특징
- **특정 코드 포함**: URL에 동기화 정보가 인코딩되어 포함
- **뷰어 연결**: URL 클릭 시 바로 뷰어로 연결
- **타임스탬프 동기화**: 구현된 타임스탬프 기반 동시재생
- **추가 입력 불필요**: 뷰어에서는 기타 입력 없이 바로 재생

## 🛠️ 사용 방법

### 1. 메인 페이지 접속
`index.html`을 웹 브라우저에서 열기

### 2. 향상된 VE URL 생성기 사용
1. **향상된 VE URL 생성기** 클릭
2. **사용자 정보 입력**: 이름, 이메일, 비밀번호 입력
3. **비디오 정보 설정**: 리액션 영상 URL, 원본 영상 URL 입력
4. **타임스탬프 파일 업로드**: JSON 파일 선택
5. **뷰어 설정**: 오버레이 위치, 크기, 볼륨 설정
6. **VE URL 생성**: 생성 버튼 클릭
7. **링크 공유**: 생성된 URL을 복사하여 공유

### 3. 생성된 URL 사용
1. 생성된 URL 클릭
2. 뷰어에서 자동으로 동기화된 재생 시작
3. 재생/일시정지 버튼으로 제어

## 📋 요구사항

- 최신 웹 브라우저 (Chrome, Firefox, Safari, Edge)
- JavaScript 활성화
- 인터넷 연결 (일부 기능)

## 🔧 개발 환경 설정

### 로컬 개발 서버 실행
```bash
# 서버 디렉토리로 이동
cd src/server

# 의존성 설치
npm install

# 개발 서버 실행
npm start
```

### 정적 파일 서빙
```bash
# Python을 사용한 간단한 서버
python -m http.server 8000

# 또는 Node.js http-server 사용
npx http-server
```

## 📚 문서

- [배포 가이드](docs/deployment-guide.md)
- [서버 아키텍처](docs/server-architecture.md)

## 🤝 기여하기

1. 이 저장소를 포크합니다
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요. 