/**
 * Viewer 전용 유틸리티 함수들
 * Editor와 독립적으로 작동하는 Viewer 고유 기능들
 */

class ViewerUtils {
    /**
     * 동기화 상태 메시지 생성
     * @param {string} type - 메시지 타입 ('success', 'error', 'info', 'warning')
     * @param {string} message - 메시지 내용
     * @param {number} duration - 표시 시간 (ms)
     */
    static showMessage(type, message, duration = 3000) {
        const messageElement = document.getElementById('message');
        if (!messageElement) return;
        
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
        messageElement.style.display = 'block';
        
        // 자동 숨김
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, duration);
        
        // 콘솔에도 로그
        this.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    /**
     * 동기화 디버그 정보 업데이트
     * @param {Object} debugData - 디버그 데이터
     */
    static updateDebugDisplay(debugData) {
        const debugElement = document.getElementById('debug-content');
        if (!debugElement) return;
        
        const debugHTML = `
            <div class="debug-section">
                <strong>Current Time:</strong> ${this.formatTime(debugData.currentTime || 0)}
            </div>
            <div class="debug-section">
                <strong>YouTube Status:</strong> ${debugData.youtubeStatus || 'Not Ready'}
            </div>
            <div class="debug-section">
                <strong>Sync Points:</strong> ${debugData.totalSyncPoints || 0}
            </div>
            <div class="debug-section">
                <strong>Next Events:</strong>
                <ul>
                    <li>Play: ${debugData.nextPlayTime ? this.formatTime(debugData.nextPlayTime) : 'None'}</li>
                    <li>Pause: ${debugData.nextPauseTime ? this.formatTime(debugData.nextPauseTime) : 'None'}</li>
                </ul>
            </div>
            ${debugData.lastEvent ? `
            <div class="debug-section">
                <strong>Last Event:</strong> ${debugData.lastEvent}
            </div>
            ` : ''}
        `;
        
        debugElement.innerHTML = debugHTML;
    }
    
    /**
     * 플레이어 컨트롤 버튼 상태 업데이트
     * @param {boolean} isPlaying - 재생 중 여부
     * @param {boolean} canPlay - 재생 가능 여부
     */
    static updateButtonStates(isPlaying, canPlay = true) {
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const stopBtn = document.getElementById('stop-btn');
        const restartBtn = document.getElementById('restart-btn');
        
        if (playBtn) {
            playBtn.disabled = !canPlay || isPlaying;
        }
        
        if (pauseBtn) {
            pauseBtn.disabled = !isPlaying;
        }
        
        if (stopBtn) {
            stopBtn.disabled = !canPlay;
        }
        
        if (restartBtn) {
            restartBtn.disabled = !canPlay;
        }
    }
    
    /**
     * 오버레이 위치 설정
     * @param {string} position - 위치 ('top-left', 'top-right', 'bottom-left', 'bottom-right')
     * @param {HTMLElement} overlayElement - 오버레이 요소
     */
    static setOverlayPosition(position, overlayElement) {
        if (!overlayElement) return;
        
        // 기존 위치 클래스 제거
        overlayElement.classList.remove('top-left', 'top-right', 'bottom-left', 'bottom-right');
        
        // 새 위치 클래스 추가
        overlayElement.classList.add(position);
        
        this.log(`Overlay position set to: ${position}`);
    }
    
    /**
     * 오버레이 크기 설정
     * @param {number} size - 크기 (%)
     * @param {HTMLElement} overlayElement - 오버레이 요소
     */
    static setOverlaySize(size, overlayElement) {
        if (!overlayElement) return;
        
        const config = window.SHARED_CONFIG || { UI: { OVERLAY: { MIN_SIZE: 10, MAX_SIZE: 80 } } };
        const clampedSize = Math.max(
            config.UI.OVERLAY.MIN_SIZE,
            Math.min(config.UI.OVERLAY.MAX_SIZE, size)
        );
        
        overlayElement.style.width = `${clampedSize}%`;
        overlayElement.style.height = 'auto';
        
        this.log(`Overlay size set to: ${clampedSize}%`);
    }
    
    /**
     * VE URL 파라미터 파싱
     * @param {string} url - URL 문자열
     * @returns {Object} - 파싱된 파라미터들
     */
    static parseVEUrl(url = window.location.href) {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        
        return {
            ve_server: params.get('ve_server'),
            reaction_url: params.get('reaction_url'),
            youtube_url: params.get('youtube_url'),
            timestamp_data: params.get('timestamp_data'),
            overlay_position: params.get('overlay_position'),
            overlay_size: params.get('overlay_size'),
            youtube_volume: params.get('youtube_volume')
        };
    }
    
    /**
     * 안전한 YouTube 플레이어 제어
     * @param {YT.Player} player - YouTube 플레이어
     * @param {string} action - 액션 ('play', 'pause', 'seekTo', etc.)
     * @param {*} params - 액션 파라미터
     * @returns {boolean} - 성공 여부
     */
    static safePlayerControl(player, action, params = null) {
        if (!player || typeof player[action] !== 'function') {
            this.log(`Player control failed: ${action} not available`, 'warn');
            return false;
        }
        
        try {
            if (params !== null) {
                player[action](params);
            } else {
                player[action]();
            }
            
            this.log(`Player control executed: ${action}${params !== null ? ` with params: ${params}` : ''}`);
            return true;
        } catch (error) {
            this.log(`Player control error (${action}): ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * 동기화 이벤트 로깅
     * @param {string} eventType - 이벤트 타입
     * @param {Object} eventData - 이벤트 데이터
     */
    static logSyncEvent(eventType, eventData) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            type: eventType,
            data: eventData
        };
        
        // 글로벌 디버그 배열에 추가 (있는 경우)
        if (window.debugInfo && Array.isArray(window.debugInfo)) {
            window.debugInfo.push(logEntry);
            
            // 최대 항목 수 제한
            const maxEntries = 100;
            if (window.debugInfo.length > maxEntries) {
                window.debugInfo.shift();
            }
        }
        
        this.log(`Sync Event [${eventType}]:`, 'debug', eventData);
    }
    
    /**
     * 동기화 정확도 계산
     * @param {number} expectedTime - 예상 시간
     * @param {number} actualTime - 실제 시간
     * @returns {Object} - 정확도 정보
     */
    static calculateSyncAccuracy(expectedTime, actualTime) {
        const difference = Math.abs(expectedTime - actualTime);
        const threshold = 0.5; // 0.5초 임계값
        
        return {
            difference,
            isAccurate: difference < threshold,
            accuracy: Math.max(0, 1 - (difference / threshold)) * 100,
            status: difference < 0.1 ? 'excellent' : 
                   difference < 0.3 ? 'good' : 
                   difference < 0.5 ? 'fair' : 'poor'
        };
    }
    
    /**
     * 로컬 스토리지에 뷰어 설정 저장
     * @param {Object} settings - 저장할 설정
     */
    static saveViewerSettings(settings) {
        try {
            const currentSettings = this.loadViewerSettings();
            const mergedSettings = { ...currentSettings, ...settings };
            
            localStorage.setItem('viewer_settings', JSON.stringify(mergedSettings));
            this.log('Viewer settings saved', 'debug', mergedSettings);
        } catch (error) {
            this.log('Failed to save viewer settings: ' + error.message, 'warn');
        }
    }
    
    /**
     * 로컬 스토리지에서 뷰어 설정 로드
     * @returns {Object} - 로드된 설정
     */
    static loadViewerSettings() {
        try {
            const settings = localStorage.getItem('viewer_settings');
            return settings ? JSON.parse(settings) : {};
        } catch (error) {
            this.log('Failed to load viewer settings: ' + error.message, 'warn');
            return {};
        }
    }
    
    /**
     * 시간 형식화 (Viewer 전용 - 간단한 형식)
     * @param {number} seconds - 초
     * @returns {string} - 형식화된 시간 문자열
     */
    static formatTime(seconds) {
        return TimestampParser ? TimestampParser.formatTime(seconds) : '00:00';
    }
    
    /**
     * Viewer 전용 로깅
     * @param {string} message - 로그 메시지
     * @param {string} level - 로그 레벨
     * @param {*} data - 추가 데이터
     */
    static log(message, level = 'info', data = null) {
        const config = window.SHARED_CONFIG || { DEBUG: { ENABLED: false } };
        
        if (!config.DEBUG.ENABLED && level === 'debug') return;
        
        const timestamp = new Date().toISOString();
        const logMessage = `[VIEWER ${timestamp}] ${message}`;
        
        switch (level) {
            case 'error':
                console.error(logMessage, data);
                break;
            case 'warn':
                console.warn(logMessage, data);
                break;
            case 'debug':
                console.debug(logMessage, data);
                break;
            default:
                console.log(logMessage, data);
        }
    }
}

// 전역 사용을 위한 export
if (typeof window !== 'undefined') {
    window.ViewerUtils = ViewerUtils;
}
