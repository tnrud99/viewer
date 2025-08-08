/**
 * 공통 설정 상수들
 * Editor와 Viewer에서 공통으로 사용하는 설정값들
 */

const SHARED_CONFIG = {
    // YouTube API 관련 설정
    YOUTUBE: {
        API_SCRIPT_URL: 'https://www.youtube.com/iframe_api',
        DEFAULT_PLAYER_SIZE: {
            width: '100%',
            height: '360'
        },
        PLAYER_VARS: {
            DEFAULT: {
                'playsinline': 1,
                'controls': 1,
                'autoplay': 0,
                'rel': 0,
                'modestbranding': 1,
                'fs': 1,
                'cc_load_policy': 0,
                'iv_load_policy': 3
            },
            EDITOR: {
                'playsinline': 1,
                'controls': 1,
                'autoplay': 0,
                'rel': 0
            },
            VIEWER: {
                'playsinline': 1,
                'controls': 1,
                'autoplay': 0,
                'rel': 0,
                'modestbranding': 1
            }
        }
    },
    
    // 동기화 관련 설정
    SYNC: {
        DEFAULT_TOLERANCE: 0.15,        // 기본 동기화 허용 오차 (초)
        EVENT_DETECTION_WINDOW: 0.5,   // 이벤트 감지 윈도우 (초)
        SYNC_INTERVAL: 100,             // 동기화 체크 주기 (ms)
        SEEK_DETECTION_THRESHOLD: 1.5,  // Seek 감지 임계값 (초)
        MAX_SYNC_ATTEMPTS: 3            // 최대 동기화 시도 횟수
    },
    
    // 타임라인 관련 설정
    TIMELINE: {
        MIN_PIXELS_PER_SECOND: 5,       // 최소 픽셀/초 (최대 축소)
        MAX_PIXELS_PER_SECOND: 200,     // 최대 픽셀/초 (최대 확대)
        DEFAULT_PIXELS_PER_SECOND: 10,  // 기본 픽셀/초
        ZOOM_FACTOR: 1.2,               // 줌 배율
        GRID_INTERVAL: 10               // 그리드 간격 (초)
    },
    
    // UI 관련 설정
    UI: {
        OVERLAY: {
            DEFAULT_POSITION: 'top-right',
            DEFAULT_SIZE: 50,           // 기본 오버레이 크기 (%)
            MIN_SIZE: 10,               // 최소 오버레이 크기 (%)
            MAX_SIZE: 80                // 최대 오버레이 크기 (%)
        },
        VOLUME: {
            DEFAULT: 100,               // 기본 볼륨
            MIN: 0,                     // 최소 볼륨
            MAX: 100                    // 최대 볼륨
        },
        MESSAGES: {
            DURATION: 3000,             // 메시지 표시 시간 (ms)
            ERROR_DURATION: 5000        // 에러 메시지 표시 시간 (ms)
        }
    },
    
    // 파일 관련 설정
    FILES: {
        MAX_FILE_SIZE: 50 * 1024 * 1024,  // 최대 파일 크기 (50MB)
        ALLOWED_EXTENSIONS: ['.json'],      // 허용된 파일 확장자
        MIME_TYPES: ['application/json', 'text/plain']  // 허용된 MIME 타입
    },
    
    // 네트워크 관련 설정
    NETWORK: {
        REQUEST_TIMEOUT: 10000,         // 요청 타임아웃 (ms)
        RETRY_ATTEMPTS: 3,              // 재시도 횟수
        RETRY_DELAY: 1000               // 재시도 지연 (ms)
    },
    
    // 디버그 관련 설정
    DEBUG: {
        ENABLED: false,                 // 디버그 모드 (개발 시 true로 변경)
        LOG_LEVEL: 'info',             // 로그 레벨 (error, warn, info, debug)
        MAX_LOG_ENTRIES: 100           // 최대 로그 항목 수
    },
    
    // 버전 정보
    VERSION: {
        SHARED_UTILS: '1.0.0',
        COMPATIBILITY: '2025.01'
    }
};

// 환경별 설정 오버라이드
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    SHARED_CONFIG.DEBUG.ENABLED = true;
    SHARED_CONFIG.DEBUG.LOG_LEVEL = 'debug';
}

// 전역 사용을 위한 export (브라우저 환경)
if (typeof window !== 'undefined') {
    window.SHARED_CONFIG = SHARED_CONFIG;
}

// Node.js 환경을 위한 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SHARED_CONFIG;
}
