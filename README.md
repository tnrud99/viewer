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

## 🛠️ 사용 방법

1. **메인 페이지 접속**: `index.html`을 웹 브라우저에서 열기
2. **기능 선택**: 원하는 기능을 클릭하여 해당 페이지로 이동
3. **데이터 로드**: 샘플 데이터 또는 사용자 데이터를 로드
4. **기능 사용**: 각 도구의 기능을 활용하여 VE 데이터 작업

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