class FullscreenManager {
    constructor() {
        this.isFullMode = false;
        this.currentMode = 'normal'; // 'screen-api', 'css', 'mobile'
        this.floatingControls = null;
        this.hideTimer = null;
        this.setupEventListeners();
    }

    // 풀스크린 모드 진입 (3단계 폴백)
    async enterFullMode() {
        try {
            // 1단계: Screen API 시도
            if (await this.tryScreenAPI()) {
                this.currentMode = 'screen-api';
                this.isFullMode = true;
                this.showFloatingControls();
                return true;
            }

            // 2단계: CSS Full 모드
            if (this.tryCSSFullMode()) {
                this.currentMode = 'css';
                this.isFullMode = true;
                this.showFloatingControls();
                return true;
            }

            // 3단계: 모바일 가로모드 시뮬레이션
            this.enterMobileLandscapeMode();
            this.currentMode = 'mobile';
            this.isFullMode = true;
            this.showFloatingControls();
            return true;

        } catch (error) {
            console.error('Full mode entry failed:', error);
            return false;
        }
    }

    // Screen API 시도
    async tryScreenAPI() {
        try {
            const element = document.documentElement;
            
            // 모바일에서 가로모드 먼저 시도
            if (window.innerWidth <= 768) {
                if (screen.orientation && screen.orientation.lock) {
                    await screen.orientation.lock('landscape');
                }
            }

            // Fullscreen API 시도
            if (element.requestFullscreen) {
                await element.requestFullscreen();
                return true;
            } else if (element.webkitRequestFullscreen) {
                await element.webkitRequestFullscreen();
                return true;
            } else if (element.mozRequestFullScreen) {
                await element.mozRequestFullScreen();
                return true;
            } else if (element.msRequestFullscreen) {
                await element.msRequestFullscreen();
                return true;
            }
        } catch (error) {
            console.log('Screen API failed, trying CSS fallback');
        }
        return false;
    }

    // CSS Full 모드
    tryCSSFullMode() {
        try {
            document.body.classList.add('full-mode');
            
            // 모바일 가로모드 시뮬레이션
            if (window.innerWidth <= 768) {
                document.body.classList.add('mobile-landscape');
            }
            
            // Full 모드에서 동기화 상태 유지
            this.maintainSynchronization();
            
            return true;
        } catch (error) {
            console.log('CSS Full mode failed');
            return false;
        }
    }

    // 모바일 가로모드 시뮬레이션
    enterMobileLandscapeMode() {
        document.body.classList.add('mobile-full-mode');
        
        // Full 모드에서 동기화 상태 유지
        this.maintainSynchronization();
    }

    // 풀스크린 모드 종료
    exitFullMode() {
        try {
            switch (this.currentMode) {
                case 'screen-api':
                    this.exitScreenAPI();
                    break;
                case 'css':
                case 'mobile':
                    this.exitCSSFullMode();
                    break;
            }

            this.isFullMode = false;
            this.currentMode = 'normal';
            this.hideFloatingControls();
            this.removeEventListeners();

        } catch (error) {
            console.error('Exit full mode failed:', error);
        }
    }

    // Screen API 종료
    exitScreenAPI() {
        try {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }

            // 모바일 세로모드 복원
            if (window.innerWidth <= 768) {
                if (screen.orientation && screen.orientation.unlock) {
                    screen.orientation.unlock();
                }
            }
        } catch (error) {
            console.error('Exit screen API failed:', error);
        }
    }

    // CSS Full 모드 종료
    exitCSSFullMode() {
        document.body.classList.remove('full-mode', 'mobile-landscape', 'mobile-full-mode');
        
        // 모바일 세로모드 복원
        if (window.innerWidth <= 768) {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        }
    }

    // 플로팅 컨트롤 생성
    createFloatingControls() {
        if (this.floatingControls) return;

        this.floatingControls = document.createElement('div');
        this.floatingControls.className = 'floating-controls';
        this.floatingControls.innerHTML = `
            <button class="floating-btn exit-btn" title="Exit Full Mode">✕</button>
        `;

        // Exit 버튼 이벤트
        const exitBtn = this.floatingControls.querySelector('.exit-btn');
        exitBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.exitFullMode();
        });

        document.body.appendChild(this.floatingControls);
    }

    // 플로팅 컨트롤 표시
    showFloatingControls() {
        this.createFloatingControls();
        this.floatingControls.style.opacity = '1';
        this.floatingControls.style.pointerEvents = 'auto';
        
        // 3초 후 자동 숨김
        this.startHideTimer();
    }

    // 플로팅 컨트롤 숨김
    hideFloatingControls() {
        if (this.floatingControls) {
            this.floatingControls.style.opacity = '0';
            this.floatingControls.style.pointerEvents = 'none';
        }
        this.clearHideTimer();
    }

    // 자동 숨김 타이머 시작
    startHideTimer() {
        this.clearHideTimer();
        this.hideTimer = setTimeout(() => {
            this.hideFloatingControls();
        }, 3000);
    }

    // 자동 숨김 타이머 정리
    clearHideTimer() {
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // Fullscreen 변경 감지
        const events = [
            'fullscreenchange',
            'webkitfullscreenchange', 
            'mozfullscreenchange',
            'MSFullscreenChange'
        ];

        events.forEach(event => {
            document.addEventListener(event, () => {
                this.handleFullscreenChange();
            });
        });

        // 키보드 이벤트 (ESC로 종료)
        document.addEventListener('keydown', (e) => {
            if (this.isFullMode && e.key === 'Escape') {
                this.exitFullMode();
            }
        });

        // 마우스/터치 이벤트 (컨트롤 표시)
        document.addEventListener('mousemove', () => {
            if (this.isFullMode) {
                this.showFloatingControls();
            }
        });

        document.addEventListener('touchstart', () => {
            if (this.isFullMode) {
                this.showFloatingControls();
            }
        });
    }

    // Fullscreen 변경 처리
    handleFullscreenChange() {
        const isFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );

        if (!isFullscreen && this.isFullMode) {
            this.exitFullMode();
        }
    }

    // 이벤트 리스너 제거
    removeEventListeners() {
        if (this.floatingControls) {
            this.floatingControls.remove();
            this.floatingControls = null;
        }
        this.clearHideTimer();
    }

    // 현재 상태 확인
    isInFullMode() {
        return this.isFullMode;
    }

    // 현재 모드 확인
    getCurrentMode() {
        return this.currentMode;
    }

    // Full 모드에서 동기화 상태 유지
    maintainSynchronization() {
        // 기존 동기화 상태가 있다면 유지
        if (window.isPlaying !== undefined) {
            // 재생 상태 유지
            if (window.isPlaying) {
                // 재생 중이었다면 계속 재생
                setTimeout(() => {
                    if (window.startSynchronizedPlayback) {
                        window.startSynchronizedPlayback();
                    }
                }, 100);
            }
        }
        
        // 동기화 인터벌이 있다면 계속 실행
        if (window.syncInterval || window.youtubeYoutubeSyncInterval) {
            // 기존 인터벌들이 계속 작동하도록 유지
        }
    }
}

// 전역 인스턴스 생성
window.fullscreenManager = new FullscreenManager();
