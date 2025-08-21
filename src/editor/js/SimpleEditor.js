// 타임라인 설정 중앙화
const TIMELINE_CONFIG = {
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
class PositionCalculator {
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
class StyleManager {
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

class SimpleEditor {
    constructor() {
        this.timestamps = [];
        this.selectedSegment = null;
        this.selectedPoint = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartTime = 0;
        this.pixelsPerSecond = TIMELINE_CONFIG.PIXELS_PER_SECOND;
        this.zoomLevel = TIMELINE_CONFIG.DEFAULT_ZOOM;
        this.positionCalculator = new PositionCalculator(this.pixelsPerSecond, this.zoomLevel);
        
                        // 스마트 미리보기 상태
                this.previewState = {
                    isPreviewing: false,
                    currentPreviewPoint: null,
                    previewDuration: 6, // 6초 미리보기
                    previewTimer: null
                };
        
        this.init();
    }

    // 정리 함수 (메모리 누수 방지)
    destroy() {
        // 타이머 정리
        if (this.previewState.previewTimer) {
            clearTimeout(this.previewState.previewTimer);
        }
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        // 이벤트 리스너 정리
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        
        // 툴팁 정리
        this.hideSegmentTooltip();
        
        // 프리뷰 정지
        this.stopPreview();
    }

    init() {
        StyleManager.initializeTimelineStyles();
        this.loadSampleData();
        this.setupEventListeners();
        this.renderTimeline();
        this.setupPreviewArea();
        this.setupZoomControls();
        // Advanced Edit Modal
        this.setupAdvancedEditModal();
    }

    loadSampleData() {
        // Sample timestamp data embedded directly to avoid CORS issues
        this.timestampData = {
            "youtube_video_id": "AbZH7XWDW_k",
            "youtube_title": "TAEYEON 태연 'INVU' MV",
            "reaction_video": "reaction_1751179878125.webm",
            "created_at": "2025-06-29T06:45:25.168Z",
            "layout": {
                "reaction_position": "left",
                "youtube_position": "right",
                "reaction_size": 0.5,
                "youtube_size": 0.5
            },
            "sync_points": [
                {
                    "reaction_time": 0,
                    "youtube_time": null,
                    "relative_youtube_time": null,
                    "event": "start",
                    "youtube_first_play_time": null
                },
                {
                    "reaction_time": 11.061,
                    "youtube_time": 0.019108165939331054,
                    "relative_youtube_time": 0.0009999999999994458,
                    "event": "youtube_play",
                    "youtube_first_play_time": 11.06
                },
                {
                    "reaction_time": 21.974,
                    "youtube_time": 10.883888,
                    "relative_youtube_time": 10.914,
                    "event": "youtube_pause",
                    "youtube_first_play_time": 11.06
                },
                {
                    "reaction_time": 51.624,
                    "youtube_time": 11.035833165939332,
                    "relative_youtube_time": 40.564,
                    "event": "youtube_play",
                    "youtube_first_play_time": 11.06
                },
                {
                    "reaction_time": 61.03,
                    "youtube_time": 20.43695,
                    "relative_youtube_time": 49.97,
                    "event": "youtube_pause",
                    "youtube_first_play_time": 11.06
                },
                {
                    "reaction_time": 83.673,
                    "youtube_time": 100.350219,
                    "relative_youtube_time": 72.613,
                    "event": "youtube_play",
                    "youtube_first_play_time": 11.06
                },
                {
                    "reaction_time": 92.975,
                    "youtube_time": 109.646435,
                    "relative_youtube_time": 81.91499999999999,
                    "event": "youtube_pause",
                    "youtube_first_play_time": 11.06
                },
                {
                    "reaction_time": 128.754,
                    "youtube_time": 109.646435,
                    "relative_youtube_time": 117.69399999999999,
                    "event": "end",
                    "youtube_first_play_time": 11.06
                }
            ]
        };
        
        // 전체 데이터를 각각의 속성으로 저장
        this.timestamps = this.timestampData.sync_points;
        this.youtubeVideoId = this.timestampData.youtube_video_id;
        this.youtubeTitle = this.timestampData.youtube_title;
        this.reactionVideo = this.timestampData.reaction_video;
        this.createdAt = this.timestampData.created_at;
        this.layout = this.timestampData.layout;
        
        console.log('Sample data loaded:', this.timestamps);
        console.log('YouTube Video ID:', this.youtubeVideoId);
    }

    setupEventListeners() {
        // File load button
        const loadBtn = document.getElementById('load-btn');
        const fileInput = document.getElementById('timestamp-file');
        
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.loadTimestampFile(file);
                }
            });
        }

        // Add timestamp button
        const addBtn = document.getElementById('add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addNewTimestamp();
            });
        }

        // Delete button
        const deleteBtn = document.getElementById('delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteSelectedTimestamp();
            });
        }

        // Export button
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportTimestamps();
            });
        }

        // Smart Preview Controls - Removed (buttons no longer exist)

        // Auto-play 기능 제거됨

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.deselectAll();
            }
        });

        // Setup drag and drop
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const container = document.querySelector('.timeline-content');
        if (!container) return;

        container.addEventListener('mousedown', (e) => {
            this.startDrag(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.updateDrag(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.endDrag();
            }
        });
    }

    startDrag(e) {
        const target = e.target.closest('.timeline-segment');
        if (!target) return;

        e.preventDefault();
        this.isDragging = true;
        this.dragStartX = e.clientX;

        this.selectedSegment = target;
        this.selectedPoint = null;
        this.dragStartTime = this.timestamps[parseInt(target.dataset.playIndex)].reaction_time;

        target.style.cursor = 'grabbing';
    }

    updateDrag(e) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.dragStartX;
        const deltaTime = deltaX / (this.pixelsPerSecond * this.zoomLevel); // 줌 레벨 적용
        const newTime = this.dragStartTime + deltaTime;

        if (newTime < 0) return; // Don't allow negative times

        if (this.selectedSegment) {
            this.moveSegment(newTime);
        }
    }

    endDrag() {
        this.isDragging = false;
        
        if (this.selectedSegment) {
            this.selectedSegment.style.cursor = 'pointer';
        }
    }

    moveSegment(newStartTime) {
        const playIndex = parseInt(this.selectedSegment.dataset.playIndex);
        const pauseIndex = parseInt(this.selectedSegment.dataset.pauseIndex);

        const playTimestamp = this.timestamps[playIndex];
        const pauseTimestamp = this.timestamps[pauseIndex];

        const duration = pauseTimestamp.reaction_time - playTimestamp.reaction_time;

        playTimestamp.reaction_time = newStartTime;
        pauseTimestamp.reaction_time = newStartTime + duration;

        const segmentLeft = this.positionCalculator.getSegmentLeft(newStartTime);
        const segmentWidth = this.positionCalculator.getSegmentWidth(duration);
        this.selectedSegment.style.left = segmentLeft + 'px';
        this.selectedSegment.style.width = segmentWidth + 'px';

        const durationElement = this.selectedSegment.querySelector('.segment-duration');
        if (durationElement) {
            durationElement.textContent = this.formatTime(duration);
        }

        this.updatePointPosition(playIndex);
        this.updatePointPosition(pauseIndex);
    }



    updatePointPosition(index) {
        const timestamp = this.timestamps[index];
        const point = document.querySelector(`[data-index="${index}"]`);
        if (!point) return;

        const left = this.positionCalculator.getPointLeft(timestamp.reaction_time);
        point.style.left = left + 'px';
    }

    renderTimeline() {
        this.calculateTimelineWidth();
        this.renderTimeRuler();
        this.renderSegments();
        this.renderPoints();
        this.updateTimelineInfo();
        this.updateButtons();
        this.setupZoomControls();
        this.setupResizeHandler();
    }

    // 전체 렌더링 (줌 변경 시 사용)
    rerenderAll() {
        this.positionCalculator.updateZoom(this.zoomLevel);
        this.calculateTimelineWidth();
        this.renderTimeRuler();
        this.renderSegments();
        this.renderPoints();
        this.updateZoomDisplay();
    }

    setupResizeHandler() {
        // 기존 핸들러 제거 (중복 방지)
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        
        // 새 핸들러 추가
        this.resizeHandler = () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.calculateTimelineWidth();
            }, 100);
        };
        
        window.addEventListener('resize', this.resizeHandler);
    }

    renderTimeRuler() {
        const container = document.querySelector('.timeline-content');
        if (!container) return;

        // 기존 시간 눈금 제거
        const existingRuler = container.querySelector('.time-ruler');
        if (existingRuler) {
            existingRuler.remove();
        }

        // 타임스탬프가 없으면 기본값 사용
        if (!this.timestamps || this.timestamps.length === 0) {
            return;
        }

        // 시간 눈금 컨테이너 생성
        const ruler = document.createElement('div');
        ruler.className = 'time-ruler';
        
        // 전체 시간 범위 계산
        const maxTime = Math.max(...this.timestamps.map(t => t.reaction_time));
        if (maxTime <= 0) return; // 유효하지 않은 시간이면 리턴
        
        const interval = this.calculateTimeInterval(maxTime);
        
        // 시간 마커 생성
        for (let time = 0; time <= maxTime; time += interval) {
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            marker.style.left = this.positionCalculator.getTimeMarkerLeft(time) + 'px';
            
            const label = document.createElement('span');
            label.className = 'time-label';
            label.textContent = this.formatTime(time);
            marker.appendChild(label);
            
            ruler.appendChild(marker);
        }
        
        container.appendChild(ruler);
    }

    calculateTimeInterval(maxTime) {
        // 줌 레벨과 전체 시간에 따라 적절한 간격 계산
        const zoomFactor = this.zoomLevel;
        
        if (maxTime <= 30) {
            return zoomFactor >= 2 ? 2 : 5; // 2초 또는 5초 간격
        } else if (maxTime <= 120) {
            return zoomFactor >= 1.5 ? 5 : 10; // 5초 또는 10초 간격
        } else if (maxTime <= 300) {
            return zoomFactor >= 1 ? 10 : 30; // 10초 또는 30초 간격
        } else {
            return zoomFactor >= 0.8 ? 30 : 60; // 30초 또는 1분 간격
        }
    }

    calculateTimelineWidth() {
        const content = document.querySelector('.timeline-content');
        if (!content) return;

        // 타임스탬프가 없으면 기본값 사용
        if (!this.timestamps || this.timestamps.length === 0) {
            content.style.width = '800px';
            return;
        }

        // 전체 시간 범위 계산 (줌 레벨 적용)
        const maxTime = Math.max(...this.timestamps.map(t => t.reaction_time));
        if (maxTime <= 0) {
            content.style.width = '800px';
            return;
        }
        
        const totalWidth = this.positionCalculator.getTimelineWidth(maxTime);

        // 컨텐츠 너비 설정
        content.style.width = totalWidth + 'px';
        
        console.log(`Timeline content width: ${totalWidth}px, zoom: ${this.zoomLevel}`);
    }

    setupZoomControls() {
        // 중복 설정 방지
        if (this.zoomControlsInitialized) return;
        
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                this.zoomIn();
            });
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                this.zoomOut();
            });
        }

        // 마우스 휠 줌 추가
        this.setupWheelZoom();

        this.updateZoomDisplay();
        this.zoomControlsInitialized = true;
    }

    setupWheelZoom() {
        const timelineContainer = document.querySelector('.timeline-container');
        if (!timelineContainer) return;

        timelineContainer.addEventListener('wheel', (e) => {
            e.preventDefault(); // 기본 스크롤 방지
            
            // Ctrl 키와 함께 휠을 돌렸을 때만 줌
            if (e.ctrlKey) {
                if (e.deltaY < 0) {
                    // 휠을 위로 (줌 인)
                    this.zoomIn();
                } else {
                    // 휠을 아래로 (줌 아웃)
                    this.zoomOut();
                }
            }
        }, { passive: false });
    }

    zoomIn() {
        if (this.zoomLevel < 3) { // 최대 300%
            this.zoomLevel += 0.1; // 10% 단위로 변경
            this.updateZoom();
        }
    }

    zoomOut() {
        if (this.zoomLevel > 0.25) { // 최소 25%
            this.zoomLevel -= 0.1; // 10% 단위로 변경
            this.updateZoom();
        }
    }

    updateZoom() {
        this.rerenderAll();
    }

    updateZoomDisplay() {
        const zoomLevelSpan = document.getElementById('zoomLevel');
        if (zoomLevelSpan) {
            zoomLevelSpan.textContent = Math.round(this.zoomLevel * 100) + '%';
        }
    }

    renderSegments() {
        const container = document.querySelector('.timeline-content');
        if (!container) return;

        // Clear existing segments
        const existingSegments = container.querySelectorAll('.timeline-segment');
        existingSegments.forEach(segment => segment.remove());

        // Find PLAY-PAUSE pairs and create segments
        for (let i = 0; i < this.timestamps.length - 1; i++) {
            const current = this.timestamps[i];
            const next = this.timestamps[i + 1];

            if (current.event === 'youtube_play' && next.event === 'youtube_pause') {
                this.createSegment(container, current, next, i);
            }
        }
    }

    createSegment(container, playTimestamp, pauseTimestamp, playIndex) {
        const segment = document.createElement('div');
        segment.className = 'timeline-segment';
        segment.dataset.playIndex = playIndex;
        segment.dataset.pauseIndex = playIndex + 1;

        const startTime = playTimestamp.reaction_time;
        const endTime = pauseTimestamp.reaction_time;
        const duration = endTime - startTime;

        // 점의 중심에서 점의 중심까지 연결하도록 위치 계산
        const left = this.positionCalculator.getSegmentLeft(startTime);
        const width = this.positionCalculator.getSegmentWidth(duration);

        segment.style.left = left + 'px';
        segment.style.width = width + 'px';
        
        // 스타일 적용
        StyleManager.applySegmentStyles(segment);

        segment.innerHTML = `
            <div class="segment-info">
                <span class="segment-duration">${this.formatTime(duration)}</span>
            </div>
        `;
        // 호버 이벤트 추가
        segment.addEventListener('mouseenter', () => {
            this.showSegmentTooltip(segment, playTimestamp, pauseTimestamp, startTime, endTime);
        });
        
        segment.addEventListener('mouseleave', () => {
            this.hideSegmentTooltip();
        });
        
        segment.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectSegment(segment, playIndex);
        });
        container.appendChild(segment);
    }

    renderPoints() {
        const container = document.querySelector('.timeline-content');
        if (!container) return;

        // Clear existing points
        const existingPoints = container.querySelectorAll('.timeline-point');
        existingPoints.forEach(point => point.remove());

        // Create points for all timestamps
        this.timestamps.forEach((timestamp, index) => {
            this.createPoint(container, timestamp, index);
        });
    }

    createPoint(container, timestamp, index) {
        const point = document.createElement('div');
        point.className = 'timeline-point';
        point.dataset.index = index;
        point.dataset.event = timestamp.event;

        // 점의 중심이 정확한 시간 위치에 오도록 계산
        const left = this.positionCalculator.getPointLeft(timestamp.reaction_time);
        point.style.left = left + 'px';
        
        // 스타일 적용
        StyleManager.applyPointStyles(point);

        // 이벤트 타입별 텍스트와 색상 설정
        let text, backgroundColor;
        switch (timestamp.event) {
            case 'youtube_play':
                text = 'PLAY';
                backgroundColor = TIMELINE_CONFIG.COLORS.PLAY;
                break;
            case 'youtube_pause':
                text = 'PAUSE';
                backgroundColor = TIMELINE_CONFIG.COLORS.PAUSE;
                break;
            case 'start':
                text = 'START';
                backgroundColor = TIMELINE_CONFIG.COLORS.START;
                break;
            case 'end':
                text = 'END';
                backgroundColor = TIMELINE_CONFIG.COLORS.END;
                break;
            default:
                text = '•';
                backgroundColor = TIMELINE_CONFIG.COLORS.DEFAULT;
        }

        point.style.backgroundColor = backgroundColor;
        point.innerHTML = `
            <div class="point-text">${text}</div>
            <div class="point-info">${this.formatTime(timestamp.reaction_time)}</div>
        `;
        
        point.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectPoint(point, index);
            this.startSmartPreview(timestamp); // 점 클릭 시 바로 프리뷰 시작
        });
        container.appendChild(point);
    }

    showSegmentTooltip(segment, playTimestamp, pauseTimestamp, startTime, endTime) {
        // 기존 툴팁 제거
        this.hideSegmentTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'segment-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-line">YouTube: ${this.formatTime(playTimestamp.youtube_time || 0)} → ${this.formatTime(pauseTimestamp.youtube_time || 0)}</div>
        `;
        
        document.body.appendChild(tooltip);
        
        // 위치 계산
        const rect = segment.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
        
        this.currentTooltip = tooltip;
    }

    hideSegmentTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }

    updateTimelineInfo() {
        const totalDurationElement = document.getElementById('total-duration');
        const selectedInfoElement = document.getElementById('selected-info');
        
        if (totalDurationElement) {
            const maxTime = Math.max(...this.timestamps.map(t => t.reaction_time));
            totalDurationElement.textContent = this.formatTime(maxTime);
        }
        
        if (selectedInfoElement) {
            if (this.selectedSegment) {
                const playIndex = parseInt(this.selectedSegment.dataset.playIndex);
                const playTimestamp = this.timestamps[playIndex];
                const pauseTimestamp = this.timestamps[playIndex + 1];
                const duration = pauseTimestamp.reaction_time - playTimestamp.reaction_time;
                selectedInfoElement.textContent = `Segment: ${this.formatTime(playTimestamp.reaction_time)} - ${this.formatTime(pauseTimestamp.reaction_time)} (${this.formatTime(duration)})`;
            } else if (this.selectedPoint) {
                const index = parseInt(this.selectedPoint.dataset.index);
                const timestamp = this.timestamps[index];
                selectedInfoElement.textContent = `Point: ${this.formatTime(timestamp.reaction_time)} (${timestamp.event})`;
            } else {
                selectedInfoElement.textContent = 'None';
            }
        }
    }

    selectSegment(segment, playIndex) {
        this.deselectAll();
        this.selectedSegment = segment;
        segment.classList.add('selected');
        this.updateTimelineInfo();
        this.updateButtons();
    }

    selectPoint(point, index) {
        this.deselectAll();
        this.selectedPoint = point;
        point.classList.add('selected');
        this.updateTimelineInfo();
        this.updateButtons();
    }



    deselectAll() {
        if (this.selectedSegment) {
            this.selectedSegment.classList.remove('selected');
            this.selectedSegment = null;
        }
        if (this.selectedPoint) {
            this.selectedPoint.classList.remove('selected');
            this.selectedPoint = null;
        }
        this.updateTimelineInfo();
        this.updateButtons();
    }

    updateButtons() {
        const advancedEditBtn = document.getElementById('advanced-edit-btn');
        const exportBtn = document.getElementById('export-btn');
        
        if (advancedEditBtn) {
            advancedEditBtn.disabled = false; // 항상 활성화 (전체 타임스탬프 편집)
        }
        if (exportBtn) exportBtn.disabled = false;
    }

    addNewTimestamp() {
        const newTime = this.timestamps.length > 0 ? 
            this.timestamps[this.timestamps.length - 1].reaction_time + 5 : 0;
        
        // 기존 형식에 맞는 새로운 타임스탬프 생성
        const newTimestamp = {
            reaction_time: newTime,
            youtube_time: newTime,
            relative_youtube_time: newTime,
            event: 'youtube_play',
            youtube_first_play_time: this.timestamps.length > 0 ? 
                this.timestamps.find(t => t.youtube_first_play_time)?.youtube_first_play_time : newTime
        };

        this.timestamps.push(newTimestamp);
        this.renderTimeline();
    }

    deleteSelectedTimestamp() {
        if (this.selectedSegment) {
            const playIndex = parseInt(this.selectedSegment.dataset.playIndex);
            const pauseIndex = parseInt(this.selectedSegment.dataset.pauseIndex);
            
            const playTimestamp = this.timestamps[playIndex];
            const pauseTimestamp = this.timestamps[pauseIndex];
            
            // START와 END 이벤트는 삭제 불가
            if (playTimestamp.event === 'start' || playTimestamp.event === 'end' || 
                pauseTimestamp.event === 'start' || pauseTimestamp.event === 'end') {
                alert('START와 END 이벤트는 삭제할 수 없습니다.');
                return;
            }
            
            // Remove both PLAY and PAUSE timestamps
            this.timestamps.splice(pauseIndex, 1);
            this.timestamps.splice(playIndex, 1);
            
            this.selectedSegment = null;
        } else if (this.selectedPoint) {
            const index = parseInt(this.selectedPoint.dataset.index);
            const timestamp = this.timestamps[index];
            
            // START와 END 이벤트는 삭제 불가
            if (timestamp.event === 'start' || timestamp.event === 'end') {
                alert('START와 END 이벤트는 삭제할 수 없습니다.');
                return;
            }
            
            this.timestamps.splice(index, 1);
            this.selectedPoint = null;
        }

        this.renderTimeline();
    }

    loadTimestampFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // 기존 형식 지원 (전체 객체 또는 sync_points만)
                if (data.sync_points) {
                    // 전체 데이터가 있는 경우
                    if (data.youtube_video_id) {
                        this.timestamps = data.sync_points;
                        this.youtubeVideoId = data.youtube_video_id;
                        this.youtubeTitle = data.youtube_title;
                        this.reactionVideo = data.reaction_video;
                        this.createdAt = data.created_at;
                        this.layout = data.layout;
                    } else {
                        // sync_points만 있는 경우 (기존 방식)
                        this.timestamps = data.sync_points;
                    }
                    
                    this.renderTimeline();
                    console.log('Timestamp file loaded:', this.timestamps);
                    console.log('YouTube Video ID:', this.youtubeVideoId);
                } else {
                    alert('Invalid timestamp file format: sync_points not found');
                }
            } catch (error) {
                alert('Error loading timestamp file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    exportTimestamps() {
        // 기존 형식과 동일한 구조로 export
        const data = {
            youtube_video_id: this.youtubeVideoId || "AbZH7XWDW_k",
            youtube_title: this.youtubeTitle || "TAEYEON 태연 'INVU' MV",
            reaction_video: this.reactionVideo || "reaction_1751179878125.webm",
            created_at: this.createdAt || new Date().toISOString(),
            layout: this.layout || {
                reaction_position: "left",
                youtube_position: "right",
                reaction_size: 0.5,
                youtube_size: 0.5
            },
            sync_points: this.timestamps
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'edited_timestamps.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Smart Preview Methods
    setupPreviewArea() {
        // 미리보기 영역 초기화
        this.reactionPreviewPlayer = null;
        this.originalPreviewPlayer = null;
        this.previewState.isPreviewing = false;
        
        // YouTube API가 로드되면 플레이어 생성
        if (typeof YT !== 'undefined' && YT.Player) {
            this.createPreviewPlayers();
        } else {
            // YouTube API 로드 대기
            window.addEventListener('load', () => {
                if (typeof YT !== 'undefined' && YT.Player) {
                    this.createPreviewPlayers();
                }
            });
        }
    }

    createPreviewPlayers() {
        // 리액션 영상 플레이어 생성 (niYgb0IfP4U - 리액션 영상)
        this.reactionPreviewPlayer = new YT.Player('reaction-preview-player', {
            height: '100%',
            width: '100%',
            videoId: 'niYgb0IfP4U', // 리액션 영상 ID
            playerVars: {
                'playsinline': 1,
                'controls': 1,
                'autoplay': 0,
                'rel': 0
            }
        });

        // 원본 영상 플레이어 생성 (AbZH7XWDW_k - 원본 영상)
        this.originalPreviewPlayer = new YT.Player('original-preview-player', {
            height: '100%',
            width: '100%',
            videoId: this.youtubeVideoId || 'AbZH7XWDW_k', // 원본 영상 ID
            playerVars: {
                'playsinline': 1,
                'controls': 1,
                'autoplay': 0,
                'rel': 0
            }
        });
    }

    startSmartPreview(point) {
        console.log('startSmartPreview called with point:', point);
        if (!this.reactionPreviewPlayer || !this.originalPreviewPlayer) {
            console.log('Preview players not ready');
            console.log('reactionPreviewPlayer:', this.reactionPreviewPlayer);
            console.log('originalPreviewPlayer:', this.originalPreviewPlayer);
            return;
        }

        // 미리보기 상태 설정
        this.previewState.isPreviewing = true;
        this.previewState.currentPreviewPoint = point;
        
        // 미리보기 히스토리 기능 제거됨
        
        // 이벤트 타입에 따른 다른 처리
        if (point.event === 'youtube_pause') {
            // PAUSE 이벤트: 해당 시점에서 즉시 정지
            this.handlePausePreview(point);
        } else {
            // PLAY, START, END 이벤트: 해당 시점부터 재생
            this.handlePlayPreview(point);
        }
        
        // 미리보기 정보 업데이트
        this.updatePreviewInfo(point);
        
        // 미리보기 컨트롤 활성화
        this.updatePreviewControls(true);
        
        console.log(`Smart preview started for ${point.event} at ${point.reaction_time}s`);
    }

    handlePlayPreview(point) {
        // 리액션 영상: PLAY 시점 2초 전부터 재생 시작
        const reactionStartTime = Math.max(0, point.reaction_time - 2);
        this.reactionPreviewPlayer.seekTo(reactionStartTime, true);
        this.reactionPreviewPlayer.playVideo();
        
        // 원본 영상: PLAY 시점에 맞춰서 시작 (2초 후에 시작)
        let originalStartTime = 0;
        if (point.relative_youtube_time !== null && point.relative_youtube_time !== undefined) {
            originalStartTime = point.relative_youtube_time;
        } else if (point.youtube_time !== null) {
            originalStartTime = point.youtube_time;
        }
        
        // 3초 후에 원본 영상 시작
        setTimeout(() => {
            this.originalPreviewPlayer.seekTo(originalStartTime, true);
            this.originalPreviewPlayer.playVideo();
        }, 3000);
        
        // 6초 후 자동 정지
        if (this.previewState.previewTimer) {
            clearTimeout(this.previewState.previewTimer);
        }
        
        this.previewState.previewTimer = setTimeout(() => {
            this.stopPreview();
        }, this.previewState.previewDuration * 1000);
    }

    handlePausePreview(point) {
        // 리액션 영상 설정 (PAUSE 시점 0초부터 재생 시작)
        const reactionStartTime = point.reaction_time;
        this.reactionPreviewPlayer.seekTo(reactionStartTime, true);
        this.reactionPreviewPlayer.playVideo();
        
        // 원본 영상 설정 (PAUSE 시점에 맞춰서 시작)
        let originalStartTime = 0;
        if (point.relative_youtube_time !== null && point.relative_youtube_time !== undefined) {
            originalStartTime = point.relative_youtube_time;
        } else if (point.youtube_time !== null) {
            originalStartTime = point.youtube_time;
        }
        
        this.originalPreviewPlayer.seekTo(originalStartTime, true);
        this.originalPreviewPlayer.playVideo();
        
        // 3초 후 정지
        if (this.previewState.previewTimer) {
            clearTimeout(this.previewState.previewTimer);
        }
        
        this.previewState.previewTimer = setTimeout(() => {
            // 3초 후: 원본 영상만 정지, 리액션은 계속 재생
            this.originalPreviewPlayer.pauseVideo();
            
            // 6초 후: 완전 정지
            setTimeout(() => {
                this.stopPreview();
            }, 3000);
        }, 3000);
    }

    stopPreview() {
        if (this.reactionPreviewPlayer) {
            this.reactionPreviewPlayer.pauseVideo();
        }
        if (this.originalPreviewPlayer) {
            this.originalPreviewPlayer.pauseVideo();
        }
        
        this.previewState.isPreviewing = false;
        this.previewState.currentPreviewPoint = null;
        
        if (this.previewState.previewTimer) {
            clearTimeout(this.previewState.previewTimer);
            this.previewState.previewTimer = null;
        }
        
        this.updatePreviewControls(false);
        console.log('Smart preview stopped');
    }

    togglePreviewPause() {
        if (!this.previewState.isPreviewing) return;
        
        if (this.reactionPreviewPlayer && this.originalPreviewPlayer) {
            const reactionState = this.reactionPreviewPlayer.getPlayerState();
            const originalState = this.originalPreviewPlayer.getPlayerState();
            
            if (reactionState === YT.PlayerState.PLAYING) {
                this.reactionPreviewPlayer.pauseVideo();
                this.originalPreviewPlayer.pauseVideo();
            } else {
                this.reactionPreviewPlayer.playVideo();
                this.originalPreviewPlayer.playVideo();
            }
        }
    }

    // playNextPoint, playPreviousPoint, findPointIndex, findNextPoint, findPreviousPoint 함수들 제거됨

    updatePreviewInfo(point) {
        const reactionTimeElement = document.getElementById('reaction-time');
        const originalTimeElement = document.getElementById('original-time');
        const durationElement = document.getElementById('preview-duration');
        
        if (reactionTimeElement) {
            reactionTimeElement.textContent = this.formatTime(point.reaction_time);
        }
        if (originalTimeElement) {
            // relative_youtube_time 우선 사용
            let originalTime = 0;
            if (point.relative_youtube_time !== null && point.relative_youtube_time !== undefined) {
                originalTime = point.relative_youtube_time;
            } else if (point.youtube_time !== null) {
                originalTime = point.youtube_time;
            }
            originalTimeElement.textContent = this.formatTime(originalTime);
        }
        if (durationElement) {
            durationElement.textContent = `${this.previewState.previewDuration}s`;
        }
    }

    updatePreviewControls(enabled) {
        const prevBtn = document.getElementById('prev-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const nextBtn = document.getElementById('next-btn');
        const stopBtn = document.getElementById('stop-btn');
        
        if (prevBtn) prevBtn.disabled = !enabled;
        if (pauseBtn) pauseBtn.disabled = !enabled;
        if (nextBtn) nextBtn.disabled = !enabled;
        if (stopBtn) stopBtn.disabled = !enabled;
    }

    // Advanced Edit Modal
    setupAdvancedEditModal() {
        const advancedEditBtn = document.getElementById('advanced-edit-btn');
        const advancedEditModal = document.getElementById('advanced-edit-modal');
        const closeBtn = document.getElementById('close-advanced-modal');
        const cancelBtn = document.getElementById('cancel-advanced-edit');
        const addRowBtn = document.getElementById('add-timestamp-row');
        const saveAllBtn = document.getElementById('save-all-timestamps');
        const autoAdjustToggle = document.getElementById('auto-adjust-toggle');

        if (advancedEditBtn) {
            advancedEditBtn.addEventListener('click', () => {
                this.openAdvancedEditModal();
            });
        }

        if (autoAdjustToggle) {
            autoAdjustToggle.addEventListener('change', (e) => {
                if (!e.target.checked) {
                    const confirmed = confirm(
                        'Warning: Disabling auto-adjustment may cause timing inconsistencies.\n\n' +
                        'Make sure to manually verify that:\n' +
                        '• Original End = Original Start + Duration\n' +
                        '• All timing values are correct\n\n' +
                        'Do you want to proceed?'
                    );
                    
                    if (!confirmed) {
                        e.target.checked = true; // 사용자가 취소하면 다시 체크
                    }
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeAdvancedEditModal();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeAdvancedEditModal();
            });
        }

        if (addRowBtn) {
            addRowBtn.addEventListener('click', () => {
                this.addNewTimestampRow();
            });
        }

        if (saveAllBtn) {
            saveAllBtn.addEventListener('click', () => {
                this.saveAllTimestamps();
            });
        }

        if (advancedEditModal) {
            advancedEditModal.addEventListener('click', (e) => {
                if (e.target === advancedEditModal) {
                    this.closeAdvancedEditModal();
                }
            });
        }
    }

    openAdvancedEditModal() {
        const advancedEditModal = document.getElementById('advanced-edit-modal');
        if (advancedEditModal) {
            this.loadTimestampTable();
            advancedEditModal.style.display = 'block';
        }
    }

    closeAdvancedEditModal() {
        const advancedEditModal = document.getElementById('advanced-edit-modal');
        if (advancedEditModal) {
            advancedEditModal.style.display = 'none';
        }
    }

    loadTimestampTable() {
        const tableBody = document.getElementById('timestamps-table-body');
        const countElement = document.getElementById('timestamp-count');
        
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        // PLAY-PAUSE 쌍으로 그룹화
        const segments = this.getSegmentPairs();
        
        segments.forEach((segment, index) => {
            this.addSegmentRow(segment, index);
        });
        
        if (countElement) {
            countElement.textContent = segments.length;
        }
    }

    getSegmentPairs() {
        const segments = [];
        
        for (let i = 0; i < this.timestamps.length; i++) {
            const current = this.timestamps[i];
            
            if (current.event === 'youtube_play') {
                // 다음 PAUSE 이벤트 찾기
                const nextPause = this.timestamps.find((t, idx) => 
                    idx > i && t.event === 'youtube_pause'
                );
                
                if (nextPause) {
                    segments.push({
                        playTimestamp: current,
                        pauseTimestamp: nextPause,
                        playIndex: i,
                        pauseIndex: this.timestamps.indexOf(nextPause)
                    });
                }
            }
        }
        
        return segments;
    }

    addSegmentRow(segment, index) {
        const tableBody = document.getElementById('timestamps-table-body');
        if (!tableBody) return;
        
        const row = document.createElement('tr');
        row.dataset.segmentIndex = index;
        row.dataset.playIndex = segment.playIndex;
        row.dataset.pauseIndex = segment.pauseIndex;
        
        const playTime = segment.playTimestamp.reaction_time;
        const pauseTime = segment.pauseTimestamp.reaction_time;
        const duration = pauseTime - playTime;
        
        const playOriginalTime = segment.playTimestamp.relative_youtube_time !== null && segment.playTimestamp.relative_youtube_time !== undefined 
            ? segment.playTimestamp.relative_youtube_time 
            : segment.playTimestamp.youtube_time || 0;
            
        const pauseOriginalTime = segment.pauseTimestamp.relative_youtube_time !== null && segment.pauseTimestamp.relative_youtube_time !== undefined 
            ? segment.pauseTimestamp.relative_youtube_time 
            : segment.pauseTimestamp.youtube_time || 0;
        
        row.innerHTML = `
            <td class="row-number">${index + 1}</td>
            <td>
                <input type="number" class="table-input play-time" 
                       value="${playTime.toFixed(3)}" 
                       step="0.001" min="0" required>
            </td>
            <td>
                <input type="number" class="table-input pause-time" 
                       value="${pauseTime.toFixed(3)}" 
                       step="0.001" min="0" required>
            </td>
            <td>
                <input type="number" class="table-input original-start" 
                       value="${playOriginalTime.toFixed(3)}" 
                       step="0.001" min="0" required>
            </td>
            <td>
                <input type="number" class="table-input original-end" 
                       value="${pauseOriginalTime.toFixed(3)}" 
                       step="0.001" min="0" required>
            </td>
            <td>
                <input type="number" class="table-input duration-input" 
                       value="${duration.toFixed(3)}" 
                       step="0.001" min="0" required>
            </td>
            <td>
                <button type="button" class="delete-row-btn" onclick="simpleEditor.deleteSegmentRow(${index})">Delete</button>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // 자동 조정 이벤트 리스너 추가
        this.setupRowInputListeners(row, index);
    }

    setupRowInputListeners(row, index) {
        const durationInput = row.querySelector('.duration-input');
        const originalStartInput = row.querySelector('.original-start');
        const originalEndInput = row.querySelector('.original-end');
        
        // Duration 변경 시 Original End 자동 조정
        durationInput.addEventListener('input', () => {
            this.handleDurationChange(row, index);
        });
        
        // Original Start 변경 시 Original End 자동 조정
        originalStartInput.addEventListener('input', () => {
            this.handleOriginalStartChange(row, index);
        });
    }

    handleDurationChange(row, index) {
        const autoAdjustToggle = document.getElementById('auto-adjust-toggle');
        if (!autoAdjustToggle || !autoAdjustToggle.checked) return;
        
        const durationInput = row.querySelector('.duration-input');
        const originalStartInput = row.querySelector('.original-start');
        const originalEndInput = row.querySelector('.original-end');
        
        const duration = parseFloat(durationInput.value);
        const originalStart = parseFloat(originalStartInput.value);
        
        if (!isNaN(duration) && !isNaN(originalStart)) {
            const newOriginalEnd = originalStart + duration;
            originalEndInput.value = newOriginalEnd.toFixed(3);
        }
    }

    handleOriginalStartChange(row, index) {
        const autoAdjustToggle = document.getElementById('auto-adjust-toggle');
        if (!autoAdjustToggle || !autoAdjustToggle.checked) return;
        
        const durationInput = row.querySelector('.duration-input');
        const originalStartInput = row.querySelector('.original-start');
        const originalEndInput = row.querySelector('.original-end');
        
        const duration = parseFloat(durationInput.value);
        const originalStart = parseFloat(originalStartInput.value);
        
        if (!isNaN(duration) && !isNaN(originalStart)) {
            const newOriginalEnd = originalStart + duration;
            originalEndInput.value = newOriginalEnd.toFixed(3);
        }
    }

    addNewTimestampRow() {
        const lastTime = this.timestamps.length > 0 ? 
            this.timestamps[this.timestamps.length - 1].reaction_time + 5 : 0;
        
        // PLAY-PAUSE 세트로 추가
        const playTimestamp = {
            reaction_time: lastTime,
            youtube_time: lastTime,
            relative_youtube_time: lastTime,
            event: 'youtube_play',
            youtube_first_play_time: this.timestamps.length > 0 ? 
                this.timestamps.find(t => t.youtube_first_play_time)?.youtube_first_play_time : lastTime
        };
        
        const pauseTimestamp = {
            reaction_time: lastTime + 2, // 2초 후 PAUSE
            youtube_time: lastTime + 2,
            relative_youtube_time: lastTime + 2,
            event: 'youtube_pause',
            youtube_first_play_time: this.timestamps.length > 0 ? 
                this.timestamps.find(t => t.youtube_first_play_time)?.youtube_first_play_time : lastTime
        };
        
        this.timestamps.push(playTimestamp, pauseTimestamp);
        this.loadTimestampTable();
    }

    deleteSegmentRow(segmentIndex) {
        const segments = this.getSegmentPairs();
        const segment = segments[segmentIndex];
        
        if (!segment) return;
        
        if (confirm('Delete this PLAY-PAUSE set?')) {
            // 높은 인덱스부터 삭제 (배열 인덱스 변화 방지)
            const indicesToDelete = [segment.pauseIndex, segment.playIndex].sort((a, b) => b - a);
            
            indicesToDelete.forEach(index => {
                this.timestamps.splice(index, 1);
            });
            
            this.loadTimestampTable();
        }
    }

    saveAllTimestamps() {
        const tableBody = document.getElementById('timestamps-table-body');
        if (!tableBody) return;
        
        const rows = tableBody.querySelectorAll('tr');
        const segments = this.getSegmentPairs();
        
        let hasError = false;
        
        rows.forEach((row, index) => {
            const playTimeInput = row.querySelector('.play-time');
            const pauseTimeInput = row.querySelector('.pause-time');
            const originalStartInput = row.querySelector('.original-start');
            const originalEndInput = row.querySelector('.original-end');
            const durationInput = row.querySelector('.duration-input');
            
            const playTime = parseFloat(playTimeInput.value);
            const pauseTime = parseFloat(pauseTimeInput.value);
            const originalStart = parseFloat(originalStartInput.value);
            const originalEnd = parseFloat(originalEndInput.value);
            const duration = parseFloat(durationInput.value);
            
            if (isNaN(playTime) || isNaN(pauseTime) || isNaN(originalStart) || isNaN(originalEnd) ||
                playTime < 0 || pauseTime < 0 || originalStart < 0 || originalEnd < 0) {
                alert(`Please enter valid time values for set #${index + 1}.`);
                hasError = true;
                return;
            }
            
            if (pauseTime <= playTime) {
                alert(`Set #${index + 1}: PAUSE time must be greater than PLAY time.`);
                hasError = true;
                return;
            }
            
            if (originalEnd <= originalStart) {
                alert(`Set #${index + 1}: Original end time must be greater than original start time.`);
                hasError = true;
                return;
            }
            
            const segment = segments[index];
            if (segment) {
                // PLAY 타임스탬프 업데이트
                const playTimestamp = this.timestamps[segment.playIndex];
                playTimestamp.reaction_time = playTime;
                playTimestamp.relative_youtube_time = originalStart;
                playTimestamp.youtube_time = originalStart;
                
                // PAUSE 타임스탬프 업데이트
                // Duration을 기준으로 PAUSE Time을 계산
                const calculatedPauseTime = playTime + duration;
                const pauseTimestamp = this.timestamps[segment.pauseIndex];
                pauseTimestamp.reaction_time = calculatedPauseTime;
                pauseTimestamp.relative_youtube_time = originalEnd;
                pauseTimestamp.youtube_time = originalEnd;
            }
        });
        
        if (hasError) return;
        
        // 시간순으로 정렬
        this.timestamps.sort((a, b) => a.reaction_time - b.reaction_time);
        
        this.renderTimeline();
        this.closeAdvancedEditModal();
        
        console.log('All segments saved:', this.timestamps);
        alert('All changes have been saved successfully.');
    }
}

// Global variable for onclick access
let simpleEditor;
