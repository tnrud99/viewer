import { TIMELINE_CONFIG, PositionCalculator, StyleManager } from './config/TimelineConfig.js';
import { TimelineRenderer } from './modules/TimelineRenderer.js';
import { DragDropManager } from './modules/DragDropManager.js';
import { ZoomController } from './modules/ZoomController.js';
import { PreviewManager } from './modules/PreviewManager.js';
import { AdvancedEditor } from './modules/AdvancedEditor.js';
import { FileManager } from './modules/FileManager.js';

class SimpleEditor {
    constructor() {
        this.timestamps = [];
        this.selectedSegment = null;
        this.selectedPoint = null;
        
        this.init();
    }

    init() {
        // 스타일 초기화
        StyleManager.initializeTimelineStyles();
        
        // 타임라인 컨테이너 찾기
        const timelineContainer = document.querySelector('.timeline-content');
        if (!timelineContainer) {
            console.error('Timeline container not found');
            return;
        }

        // PositionCalculator 초기화
        this.positionCalculator = new PositionCalculator(
            TIMELINE_CONFIG.PIXELS_PER_SECOND,
            TIMELINE_CONFIG.DEFAULT_ZOOM
        );

        // 모듈들 초기화
        this.timelineRenderer = new TimelineRenderer(timelineContainer, this.positionCalculator);
        this.dragDropManager = new DragDropManager(timelineContainer, this.timelineRenderer, this.positionCalculator);
        this.zoomController = new ZoomController(timelineContainer, this.positionCalculator, this.timelineRenderer);
        this.previewManager = new PreviewManager();
        this.advancedEditor = new AdvancedEditor(this.timelineRenderer);
        this.fileManager = new FileManager(this.timelineRenderer);

        // 이벤트 리스너 설정
        this.setupEventListeners();
        this.setupResizeHandler();
    }

    setupEventListeners() {
        // 키보드 이벤트
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardEvent(e);
        });

        // 타임라인 클릭 시 선택 해제
        const timelineContainer = document.querySelector('.timeline-content');
        if (timelineContainer) {
            timelineContainer.addEventListener('click', (e) => {
                if (e.target === timelineContainer) {
                    this.timelineRenderer.clearSelection();
                }
            });
        }
    }

    setupResizeHandler() {
        this.resizeHandler = () => {
            // 리사이즈 시 타임라인 너비 재계산
            this.zoomController.updateTimelineWidth();
        };

        window.addEventListener('resize', this.resizeHandler);
    }

    handleKeyboardEvent(e) {
        switch (e.key) {
            case 'Escape':
                this.timelineRenderer.clearSelection();
                break;
            case 'Delete':
                // 선택된 세그먼트 삭제 (필요시 구현)
                break;
        }
    }

    // 프리뷰 시작 (점 클릭 시 호출)
    startSmartPreview(point) {
        this.previewManager.startSmartPreview(point);
    }

    // 타임라인 정보 업데이트
    updateTimelineInfo() {
        const totalDuration = document.getElementById('total-duration');
        const selectedInfo = document.getElementById('selected-info');

        if (totalDuration) {
            const timestamps = this.timelineRenderer.timestamps;
            if (timestamps && timestamps.length > 0) {
                const maxTime = Math.max(...timestamps.map(t => t.reaction_time));
                totalDuration.textContent = this.formatTime(maxTime);
            } else {
                totalDuration.textContent = '00:00';
            }
        }

        if (selectedInfo) {
            const selectedSegment = this.timelineRenderer.getSelectedSegment();
            const selectedPoint = this.timelineRenderer.getSelectedPoint();
            
            if (selectedSegment) {
                selectedInfo.textContent = 'Segment selected';
            } else if (selectedPoint) {
                const index = selectedPoint.dataset.index;
                const timestamps = this.timelineRenderer.timestamps;
                if (timestamps[index]) {
                    selectedInfo.textContent = `${timestamps[index].event.toUpperCase()}: ${this.formatTime(timestamps[index].reaction_time)}`;
                }
            } else {
                selectedInfo.textContent = 'None';
            }
        }
    }

    // 버튼 상태 업데이트
    updateButtons() {
        const advancedEditBtn = document.getElementById('advanced-edit-btn');
        const exportBtn = document.getElementById('export-btn');

        if (advancedEditBtn) {
            advancedEditBtn.disabled = false; // 항상 활성화
        }

        if (exportBtn) {
            const timestamps = this.timelineRenderer.timestamps;
            exportBtn.disabled = !timestamps || timestamps.length === 0;
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // 외부 접근을 위한 메서드들
    getTimelineRenderer() {
        return this.timelineRenderer;
    }

    getPreviewManager() {
        return this.previewManager;
    }

    getAdvancedEditor() {
        return this.advancedEditor;
    }

    getFileManager() {
        return this.fileManager;
    }

    getZoomController() {
        return this.zoomController;
    }

    getDragDropManager() {
        return this.dragDropManager;
    }
}

// 전역 변수로 설정 (HTML에서 접근 가능하도록)
let simpleEditor;
window.simpleEditor = new SimpleEditor();

// 타임라인 정보 업데이트를 위한 인터벌 설정
setInterval(() => {
    if (simpleEditor) {
        simpleEditor.updateTimelineInfo();
        simpleEditor.updateButtons();
    }
}, 100);
