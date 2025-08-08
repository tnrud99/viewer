/**
 * YouTube API 공통 유틸리티 함수들
 * Editor와 Viewer에서 공통으로 사용하는 YouTube 관련 기능
 */

class YouTubeAPIUtils {
    /**
     * YouTube URL에서 비디오 ID 추출
     * @param {string} url - YouTube URL
     * @returns {string|null} - 비디오 ID 또는 null
     */
    static extractVideoId(url) {
        if (!url) return null;
        
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/v\/([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }
    
    /**
     * YouTube 플레이어 생성을 위한 공통 설정
     * @param {string} containerId - 플레이어 컨테이너 ID
     * @param {string} videoId - YouTube 비디오 ID
     * @param {Object} options - 플레이어 옵션
     * @returns {Object} - YT.Player 생성 옵션
     */
    static createPlayerConfig(containerId, videoId, options = {}) {
        const defaultOptions = {
            height: '360',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'playsinline': 1,
                'controls': 1,
                'autoplay': 0,
                'rel': 0,
                'modestbranding': 1,
                'fs': 1,
                'cc_load_policy': 0,
                'iv_load_policy': 3
            }
        };
        
        return {
            ...defaultOptions,
            ...options,
            playerVars: {
                ...defaultOptions.playerVars,
                ...(options.playerVars || {})
            }
        };
    }
    
    /**
     * YouTube 플레이어 상태 확인
     * @param {YT.Player} player - YouTube 플레이어 인스턴스
     * @returns {Object} - 플레이어 상태 정보
     */
    static getPlayerState(player) {
        if (!player || typeof player.getPlayerState !== 'function') {
            return {
                isReady: false,
                state: -1,
                stateName: 'UNKNOWN'
            };
        }
        
        const state = player.getPlayerState();
        const stateNames = {
            '-1': 'UNSTARTED',
            '0': 'ENDED',
            '1': 'PLAYING',
            '2': 'PAUSED',
            '3': 'BUFFERING',
            '5': 'CUED'
        };
        
        return {
            isReady: true,
            state: state,
            stateName: stateNames[state] || 'UNKNOWN',
            isPlaying: state === 1,
            isPaused: state === 2,
            isEnded: state === 0
        };
    }
    
    /**
     * 안전한 플레이어 제어
     * @param {YT.Player} player - YouTube 플레이어 인스턴스
     * @param {string} action - 실행할 액션 ('play', 'pause', 'seekTo', etc.)
     * @param {*} params - 액션 파라미터
     * @returns {boolean} - 성공 여부
     */
    static safePlayerControl(player, action, params = null) {
        try {
            if (!player || typeof player[action] !== 'function') {
                console.warn(`YouTube player control failed: ${action} not available`);
                return false;
            }
            
            if (params !== null) {
                player[action](params);
            } else {
                player[action]();
            }
            
            return true;
        } catch (error) {
            console.error(`YouTube player control error (${action}):`, error);
            return false;
        }
    }
    
    /**
     * YouTube API 로드 대기
     * @returns {Promise} - API 로드 완료 Promise
     */
    static waitForAPI() {
        return new Promise((resolve) => {
            if (window.YT && window.YT.Player) {
                resolve();
                return;
            }
            
            const checkAPI = () => {
                if (window.YT && window.YT.Player) {
                    resolve();
                } else {
                    setTimeout(checkAPI, 100);
                }
            };
            
            checkAPI();
        });
    }
}

// 전역 사용을 위한 export (브라우저 환경)
if (typeof window !== 'undefined') {
    window.YouTubeAPIUtils = YouTubeAPIUtils;
}

// Node.js 환경을 위한 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YouTubeAPIUtils;
}
