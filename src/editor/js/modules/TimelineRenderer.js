import { TIMELINE_CONFIG, PositionCalculator, StyleManager } from '../config/TimelineConfig.js';

export class TimelineRenderer {
    constructor(container, positionCalculator) {
        this.container = container;
        this.positionCalculator = positionCalculator;
        this.timestamps = [];
        this.selectedSegment = null;
        this.selectedPoint = null;
    }

    setTimestamps(timestamps) {
        this.timestamps = timestamps;
    }

    renderTimeline() {
        this.clearContainer();
        this.renderTimeRuler();
        this.renderSegments();
        this.renderPoints();
    }

    clearContainer() {
        this.container.innerHTML = '';
    }

    renderTimeRuler() {
        if (!this.timestamps || this.timestamps.length === 0) return;
        
        const maxTime = Math.max(...this.timestamps.map(t => t.reaction_time));
        if (maxTime <= 0) return;

        const ruler = document.createElement('div');
        ruler.className = 'time-ruler';

        // 프로페셔널 편집 도구 방식의 시간 마커 생성
        const interval = this.getOptimalInterval(maxTime);
        for (let time = 0; time <= maxTime; time += interval) {
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            marker.style.left = this.positionCalculator.getTimeMarkerLeft(time) + 'px';

            const label = document.createElement('span');
            label.className = 'time-label';
            label.textContent = this.formatTime(time);
            label.style.left = this.positionCalculator.getTimeMarkerLeft(time) + 'px';

            ruler.appendChild(marker);
            ruler.appendChild(label);
        }

        this.container.appendChild(ruler);
    }

    // 프로페셔널 편집 도구 방식: 줌 레벨과 총 시간에 따른 최적 간격 계산
    getOptimalInterval(duration) {
        // 가능한 간격들 (초 단위): 1초, 5초, 10초, 30초, 1분, 5분, 10분, 30분, 1시간
        const intervals = [1, 5, 10, 30, 60, 300, 600, 1800, 3600];
        
        // 현재 줌 레벨 고려
        const zoomLevel = this.positionCalculator.zoomLevel;
        const pixelsPerSecond = this.positionCalculator.pixelsPerSecond * zoomLevel;
        
        console.log(`Zoom Level: ${zoomLevel}, Pixels per second: ${pixelsPerSecond}`); // 디버그
        
        // 간단한 방식: 줌 레벨에 따라 간격 결정
        if (zoomLevel >= 3.0) {
            return 1; // 매우 확대: 1초 간격
        } else if (zoomLevel >= 2.0) {
            return 5; // 확대: 5초 간격  
        } else if (zoomLevel >= 1.0) {
            return 10; // 기본: 10초 간격
        } else if (zoomLevel >= 0.5) {
            return 30; // 축소: 30초 간격
        } else {
            return 60; // 매우 축소: 1분 간격
        }
    }

    renderSegments() {
        if (!this.timestamps || this.timestamps.length === 0) return;

        // Find PLAY-PAUSE pairs and create segments
        for (let i = 0; i < this.timestamps.length - 1; i++) {
            const current = this.timestamps[i];
            const next = this.timestamps[i + 1];

            if (current.event === 'youtube_play' && next.event === 'youtube_pause') {
                this.createSegment(current, next, i);
            }
        }
    }

    createSegment(playTimestamp, pauseTimestamp, playIndex) {
        const segment = document.createElement('div');
        segment.className = 'timeline-segment';
        segment.dataset.playIndex = playIndex;
        segment.dataset.pauseIndex = playIndex + 1;

        const startTime = playTimestamp.reaction_time;
        const endTime = pauseTimestamp.reaction_time;
        const duration = endTime - startTime;

        const left = this.positionCalculator.getSegmentLeft(startTime);
        const width = this.positionCalculator.getSegmentWidth(duration);

        segment.style.left = left + 'px';
        segment.style.width = width + 'px';

        StyleManager.applySegmentStyles(segment);

        // 세그먼트 텍스트 (Duration)
        const text = document.createElement('div');
        text.className = 'segment-text';
        text.textContent = duration.toFixed(1) + 's';

        segment.appendChild(text);

        // 이벤트 리스너
        segment.addEventListener('mouseenter', () => {
            segment.style.backgroundColor = 'rgba(76, 175, 80, 0.5)';
        });

        segment.addEventListener('mouseleave', () => {
            if (this.selectedSegment !== segment) {
                segment.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
            }
        });

        segment.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectSegment(segment);
        });

        this.container.appendChild(segment);
    }

    renderPoints() {
        if (!this.timestamps || this.timestamps.length === 0) return;

        // Create points for all timestamps
        this.timestamps.forEach((timestamp, index) => {
            this.createPoint(timestamp, index);
        });
    }

    createPoint(timestamp, index) {
        const point = document.createElement('div');
        point.className = 'timeline-point';
        point.dataset.index = index;

        const left = this.positionCalculator.getPointLeft(timestamp.reaction_time);

        point.style.left = left + 'px';
        point.style.transition = 'all 0.2s ease';
        point.style.zIndex = '10';

        // 이벤트 타입에 따른 색상 설정
        let color = TIMELINE_CONFIG.COLORS.DEFAULT;
        let label = '';

        switch (timestamp.event) {
            case 'youtube_play':
                color = TIMELINE_CONFIG.COLORS.PLAY;
                label = 'PLAY';
                break;
            case 'youtube_pause':
                color = TIMELINE_CONFIG.COLORS.PAUSE;
                label = 'PAUSE';
                break;
            case 'start':
                color = TIMELINE_CONFIG.COLORS.START;
                label = 'START';
                break;
            case 'end':
                color = TIMELINE_CONFIG.COLORS.END;
                label = 'END';
                break;
        }

        point.style.backgroundColor = color;
        point.style.border = '2px solid rgba(255, 255, 255, 0.3)';

        StyleManager.applyPointStyles(point);

        // 점 텍스트
        const text = document.createElement('div');
        text.className = 'point-text';
        text.textContent = label;

        point.appendChild(text);

        // 툴팁
        const tooltip = document.createElement('div');
        tooltip.className = 'point-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.bottom = '100%';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '4px 8px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '10px';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.opacity = '0';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.transition = 'opacity 0.2s ease';
        tooltip.style.zIndex = '1000';

        tooltip.textContent = `${label}: ${this.formatTime(timestamp.reaction_time)}`;

        point.appendChild(tooltip);

        // 이벤트 리스너
        point.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
        });

        point.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
        });

        // 길게 누르기 및 클릭 이벤트
        let longPressTimer = null;
        let isLongPress = false;

        point.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            
            // 길게 누르기 타이머 시작 (500ms)
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                this.handleLongPress(point, timestamp, index, e);
            }, 500);
        });

        point.addEventListener('mouseup', (e) => {
            // 타이머 취소
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            
            const dragManager = window.simpleEditor?.getDragDropManager();
            
            // 드래그 중이면 드래그 종료
            if (dragManager?.getIsDragging()) {
                dragManager.forceEndDrag();
                isLongPress = false;
                return;
            }
            
            // 드래그 중이 아니고 짧은 클릭인 경우 프리뷰 시작
            if (!isLongPress) {
                e.stopPropagation();
                this.selectPoint(point);
                
                // 프리뷰 시작
                if (window.simpleEditor && window.simpleEditor.startSmartPreview) {
                    window.simpleEditor.startSmartPreview(timestamp);
                }
            }
            
            isLongPress = false;
        });

        point.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
            
            // 마우스가 벗어나면 길게 누르기 취소
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });

        this.container.appendChild(point);
    }

    handleLongPress(point, timestamp, pointIndex, event) {
        // PLAY/PAUSE 점에서 해당 세그먼트 찾기
        const segment = this.findSegmentByPoint(timestamp, pointIndex);
        
        if (segment) {
            // 길게 누르기 시각적 피드백
            point.style.transform = 'scale(0.9)';
            point.style.opacity = '0.8';
            point.style.cursor = 'grabbing';
            
            // 세그먼트도 시각적 피드백
            const segmentElement = this.container.querySelector(`[data-play-index="${segment.playIndex}"]`);
            if (segmentElement) {
                segmentElement.style.transform = 'scale(1.05)';
                segmentElement.style.opacity = '0.8';
                segmentElement.style.cursor = 'grabbing';
            }
            
            // DragDropManager에게 세그먼트 드래그 시작 알림
            if (window.simpleEditor && window.simpleEditor.getDragDropManager) {
                const dragDropManager = window.simpleEditor.getDragDropManager();
                dragDropManager.startSegmentDrag(segment.playIndex, event);
            }
        }
    }

    findSegmentByPoint(timestamp, pointIndex) {
        const timestamps = this.timestamps;
        
        // PLAY 점인 경우
        if (timestamp.event === 'youtube_play') {
            // 다음 PAUSE 점 찾기
            for (let i = pointIndex + 1; i < timestamps.length; i++) {
                if (timestamps[i].event === 'youtube_pause') {
                    return {
                        playIndex: pointIndex,
                        pauseIndex: i,
                        playTimestamp: timestamp,
                        pauseTimestamp: timestamps[i]
                    };
                }
            }
        }
        
        // PAUSE 점인 경우
        if (timestamp.event === 'youtube_pause') {
            // 이전 PLAY 점 찾기
            for (let i = pointIndex - 1; i >= 0; i--) {
                if (timestamps[i].event === 'youtube_play') {
                    return {
                        playIndex: i,
                        pauseIndex: pointIndex,
                        playTimestamp: timestamps[i],
                        pauseTimestamp: timestamp
                    };
                }
            }
        }
        
        return null;
    }

    selectSegment(segment) {
        // 이전 선택 해제
        if (this.selectedSegment) {
            this.selectedSegment.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
            this.selectedSegment.style.outline = 'none';
        }

        // 새 선택
        this.selectedSegment = segment;
        segment.style.backgroundColor = 'rgba(76, 175, 80, 0.6)';
        segment.style.outline = '2px solid #4CAF50';
    }

    selectPoint(point) {
        // 이전 선택 해제
        if (this.selectedPoint) {
            this.selectedPoint.style.outline = 'none';
            this.selectedPoint.style.boxShadow = 'none';
        }

        // 새 선택
        this.selectedPoint = point;
        point.style.outline = '3px solid rgba(255, 255, 255, 0.8)';
        point.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.5)';
    }

    clearSelection() {
        if (this.selectedSegment) {
            this.selectedSegment.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
            this.selectedSegment.style.outline = 'none';
            this.selectedSegment = null;
        }

        if (this.selectedPoint) {
            this.selectedPoint.style.outline = 'none';
            this.selectedPoint.style.boxShadow = 'none';
            this.selectedPoint = null;
        }
    }

    formatTime(seconds) {
        // 프로페셔널 편집 도구 방식: 간격에 따라 포맷 조정
        if (seconds < 60) {
            // 1분 미만: "5s", "10s", "30s"
            return `${seconds}s`;
        } else if (seconds < 3600) {
            // 1시간 미만: "1:30", "5:00"
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return secs === 0 ? `${mins}m` : `${mins}:${secs.toString().padStart(2, '0')}`;
        } else {
            // 1시간 이상: "1h", "1h 30m"
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
        }
    }

    getSelectedSegment() {
        return this.selectedSegment;
    }

    getSelectedPoint() {
        return this.selectedPoint;
    }
}
