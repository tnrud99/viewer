// 타임라인 설정 중앙화
export const TIMELINE_CONFIG = {
    // 크기 설정
    POINT_SIZE: 24,
    POINT_RADIUS: 12,
    SEGMENT_HEIGHT: 8,
    TRACK_HEIGHT: 120,
    
    // 위치 설정
    POINT_TOP: 5,
    SEGMENT_TOP_OFFSET: 12, // 점의 중심(17px)에서 세그먼트까지의 거리
    
    // 렌더링 설정
    PIXELS_PER_SECOND: 10,
    DEFAULT_ZOOM: 1,
    MIN_SEGMENT_WIDTH: 20,
    
    // 색상 설정
    COLORS: {
        PLAY: '#4CAF50',
        PAUSE: '#FF5722', 
        START: '#2196F3',
        END: '#9C27B0',
        DEFAULT: '#666'
    }
};

// 위치 계산 통합 클래스
export class PositionCalculator {
    constructor(pixelsPerSecond, zoomLevel) {
        this.pixelsPerSecond = pixelsPerSecond;
        this.zoomLevel = zoomLevel;
    }

    updateZoom(newZoomLevel) {
        this.zoomLevel = newZoomLevel;
    }

    // 점의 왼쪽 위치 계산 (중심이 정확한 시간에 위치)
    getPointLeft(reactionTime) {
        return (reactionTime * this.pixelsPerSecond * this.zoomLevel) - TIMELINE_CONFIG.POINT_RADIUS;
    }

    // 세그먼트의 왼쪽 위치 계산 (점의 중심에서 시작)
    getSegmentLeft(startTime) {
        return (startTime * this.pixelsPerSecond * this.zoomLevel);
    }

    // 세그먼트의 너비 계산 (점과 점 사이)
    getSegmentWidth(duration) {
        return Math.max(
            (duration * this.pixelsPerSecond * this.zoomLevel),
            TIMELINE_CONFIG.MIN_SEGMENT_WIDTH
        );
    }

    // 타임라인 전체 너비 계산
    getTimelineWidth(maxTime) {
        const calculatedWidth = maxTime * this.pixelsPerSecond * this.zoomLevel;
        return Math.max(calculatedWidth, 800);
    }

    // 시간 마커 위치 계산
    getTimeMarkerLeft(time) {
        return time * this.pixelsPerSecond * this.zoomLevel;
    }
}

// 스타일 관리 클래스
export class StyleManager {
    static initializeTimelineStyles() {
        // CSS 변수 설정
        document.documentElement.style.setProperty('--timeline-point-size', TIMELINE_CONFIG.POINT_SIZE + 'px');
        document.documentElement.style.setProperty('--timeline-point-top', TIMELINE_CONFIG.POINT_TOP + 'px');
        document.documentElement.style.setProperty('--timeline-segment-height', TIMELINE_CONFIG.SEGMENT_HEIGHT + 'px');
        document.documentElement.style.setProperty('--timeline-track-height', TIMELINE_CONFIG.TRACK_HEIGHT + 'px');
    }

    static applyPointStyles(point) {
        point.style.top = TIMELINE_CONFIG.POINT_TOP + 'px';
        point.style.width = TIMELINE_CONFIG.POINT_SIZE + 'px';
        point.style.height = TIMELINE_CONFIG.POINT_SIZE + 'px';
    }

    static applySegmentStyles(segment) {
        const segmentCenterY = TIMELINE_CONFIG.POINT_TOP + (TIMELINE_CONFIG.POINT_SIZE / 2);
        segment.style.top = segmentCenterY + 'px';
        segment.style.height = TIMELINE_CONFIG.SEGMENT_HEIGHT + 'px';
        segment.style.transform = 'translateY(-50%)';
    }
}
