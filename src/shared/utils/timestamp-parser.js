/**
 * 타임스탬프 데이터 파싱 및 처리 공통 유틸리티
 * Editor와 Viewer에서 공통으로 사용하는 타임스탬프 관련 기능
 */

class TimestampParser {
    /**
     * 타임스탬프 데이터의 유효성 검사
     * @param {Object} data - 타임스탬프 데이터
     * @returns {Object} - 검증 결과 {isValid: boolean, errors: string[]}
     */
    static validate(data) {
        const errors = [];
        
        if (!data) {
            errors.push('Timestamp data is null or undefined');
            return { isValid: false, errors };
        }
        
        if (!data.sync_points || !Array.isArray(data.sync_points)) {
            errors.push('sync_points must be an array');
            return { isValid: false, errors };
        }
        
        if (data.sync_points.length === 0) {
            errors.push('sync_points array is empty');
            return { isValid: false, errors };
        }
        
        // 각 sync_point 검증
        data.sync_points.forEach((point, index) => {
            if (typeof point.reaction_time !== 'number' || point.reaction_time < 0) {
                errors.push(`sync_points[${index}].reaction_time must be a non-negative number`);
            }
            
            if (!point.event || typeof point.event !== 'string') {
                errors.push(`sync_points[${index}].event must be a string`);
            } else if (!['youtube_play', 'youtube_pause', 'start', 'end'].includes(point.event)) {
                errors.push(`sync_points[${index}].event must be one of: youtube_play, youtube_pause, start, end`);
            }
        });
        
        return { isValid: errors.length === 0, errors };
    }
    
    /**
     * 타임스탬프 데이터를 play/pause 이벤트로 분류
     * @param {Object} timestampData - 원본 타임스탬프 데이터
     * @returns {Object} - {playEvents: Array, pauseEvents: Array, firstSyncPoint: Object}
     */
    static categorizeEvents(timestampData) {
        const validation = this.validate(timestampData);
        if (!validation.isValid) {
            console.error('Invalid timestamp data:', validation.errors);
            return { playEvents: [], pauseEvents: [], firstSyncPoint: null };
        }
        
        const playEvents = [];
        const pauseEvents = [];
        let youtubeFirstPlayTime = null;
        
        // 이벤트 분류 및 정렬
        timestampData.sync_points.forEach(point => {
            // youtube_first_play_time 저장
            if (point.youtube_first_play_time !== undefined && point.youtube_first_play_time !== null) {
                youtubeFirstPlayTime = point.youtube_first_play_time;
            }
            
            // 이벤트 분류
            if (point.event === 'youtube_pause' || point.event === 'end') {
                pauseEvents.push(point);
            } else if (point.event === 'youtube_play' || point.event === 'start') {
                playEvents.push(point);
            }
        });
        
        // reaction_time 기준으로 정렬
        playEvents.sort((a, b) => a.reaction_time - b.reaction_time);
        pauseEvents.sort((a, b) => a.reaction_time - b.reaction_time);
        
        // 첫 번째 sync point 찾기 (첫 번째 play 이벤트)
        const firstSyncPoint = playEvents.length > 0 ? playEvents[0] : null;
        
        return {
            playEvents,
            pauseEvents,
            firstSyncPoint,
            youtubeFirstPlayTime
        };
    }
    
    /**
     * 특정 시간에 해당하는 sync point 찾기
     * @param {number} reactionTime - 리액션 영상 시간
     * @param {Array} events - 이벤트 배열 (playEvents 또는 pauseEvents)
     * @param {number} tolerance - 허용 오차 (초)
     * @returns {Object|null} - 해당하는 sync point 또는 null
     */
    static findSyncPointForTime(reactionTime, events, tolerance = 0.5) {
        if (!events || events.length === 0) return null;
        
        // 정확한 시간 매치 우선 검색
        for (const event of events) {
            if (Math.abs(event.reaction_time - reactionTime) < tolerance) {
                return event;
            }
        }
        
        // 가장 가까운 이전 시점 찾기 (fallback)
        let nearestPoint = null;
        let minDistance = Infinity;
        
        for (const event of events) {
            const distance = Math.abs(event.reaction_time - reactionTime);
            if (distance < minDistance && event.reaction_time <= reactionTime) {
                minDistance = distance;
                nearestPoint = event;
            }
        }
        
        return nearestPoint;
    }
    
    /**
     * 타임스탬프 시간을 포맷팅
     * @param {number} seconds - 초 단위 시간
     * @returns {string} - 포맷된 시간 문자열 (mm:ss)
     */
    static formatTime(seconds) {
        if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
            return '00:00';
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * 시간 문자열을 초로 변환
     * @param {string} timeString - 시간 문자열 (mm:ss 또는 hh:mm:ss)
     * @returns {number} - 초 단위 시간
     */
    static parseTime(timeString) {
        if (!timeString || typeof timeString !== 'string') {
            return 0;
        }
        
        const parts = timeString.split(':').map(part => parseInt(part, 10));
        
        if (parts.length === 2) {
            // mm:ss
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            // hh:mm:ss
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        
        return 0;
    }
    
    /**
     * 안전한 시간 값 처리 (null/undefined 방지)
     * @param {*} value - 시간 값
     * @param {number} defaultValue - 기본값
     * @returns {number} - 안전한 시간 값
     */
    static safeTimeValue(value, defaultValue = 0) {
        if (value === null || value === undefined || isNaN(value)) {
            return defaultValue;
        }
        return Math.max(0, Number(value));
    }
}

// 전역 사용을 위한 export (브라우저 환경)
if (typeof window !== 'undefined') {
    window.TimestampParser = TimestampParser;
}

// Node.js 환경을 위한 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimestampParser;
}
