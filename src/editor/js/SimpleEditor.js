import { TIMELINE_CONFIG, PositionCalculator, StyleManager } from './config/TimelineConfig.js';
import { TimelineRenderer } from './modules/TimelineRenderer.js';
import { DragDropManager } from './modules/DragDropManager.js';
import { ZoomController } from './modules/ZoomController.js';
import { PreviewManager } from './modules/PreviewManager.js';
import { AdvancedEditor } from './modules/AdvancedEditor.js';
import { FileManager } from './modules/FileManager.js';
import { HistoryManager } from './modules/HistoryManager.js';
import { LayoutManager } from './modules/LayoutManager.js';

class SimpleEditor {
    constructor() {
        this.timestamps = [];
        this.selectedSegment = null;
        this.selectedPoint = null;
        this.syncMode = false; // 연동 모드 상태
        
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
        this.historyManager = new HistoryManager();
        this.layoutManager = new LayoutManager();

        // 이벤트 리스너 설정
        this.setupEventListeners();
        this.setupResizeHandler();
        this.setupHistoryControls();
        
        // 모든 초기화 완료
        // this.fileManager.loadSampleData(); // 배포용으로 주석 처리
        
        // Step Progress 초기화
        this.setupStepProgress();
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
                // 드래그 중이면 드래그 종료
                if (this.dragDropManager.getIsDragging()) {
                    this.dragDropManager.forceEndDrag();
                } else {
                    this.timelineRenderer.clearSelection();
                }
                break;
            case 'Delete':
                // 선택된 세그먼트 삭제 (필요시 구현)
                break;
            case 'z':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.handleRedo(); // Ctrl+Shift+Z 또는 Cmd+Shift+Z
                    } else {
                        this.handleUndo(); // Ctrl+Z 또는 Cmd+Z
                    }
                }
                break;
            case 'y':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.handleRedo(); // Ctrl+Y 또는 Cmd+Y
                }
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

    getTimelineRenderer() {
        return this.timelineRenderer;
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

    getHistoryManager() {
        return this.historyManager;
    }
    
    getLayoutManager() {
        return this.layoutManager;
    }

    // Step Progress 설정
    setupStepProgress() {
        const loadFileBtn = document.getElementById('load-file-btn');
        const setUrlBtn = document.getElementById('set-url-btn');
        const exportBtn = document.getElementById('export-btn');

        if (loadFileBtn) {
            loadFileBtn.addEventListener('click', () => {
                document.getElementById('timestamp-file').click();
            });
        }

        if (setUrlBtn) {
            setUrlBtn.addEventListener('click', () => {
                this.showReactionUrlModal();
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.fileManager.exportTimestamps();
            });
        }
    }

    // Step Progress 업데이트
    updateStepProgress(step) {
        // 모든 step을 locked로 초기화
        for (let i = 1; i <= 4; i++) {
            const stepElement = document.getElementById(`step-${i}`);
            if (stepElement) {
                stepElement.className = 'step-item locked';
            }
        }

        // 현재 step까지 completed로 설정
        for (let i = 1; i <= step; i++) {
            const stepElement = document.getElementById(`step-${i}`);
            if (stepElement) {
                if (i === step) {
                    stepElement.className = 'step-item active';
                } else {
                    stepElement.className = 'step-item completed';
                }
            }
        }

        // 버튼 활성화/비활성화
        this.updateStepButtons(step);
    }

    // Step 버튼 상태 업데이트
    updateStepButtons(step) {
        const setUrlBtn = document.getElementById('set-url-btn');
        const exportBtn = document.getElementById('export-btn');

        if (setUrlBtn) {
            setUrlBtn.disabled = step < 2;
        }

        if (exportBtn) {
            exportBtn.disabled = step < 4;
        }
    }

    // Reaction URL 모달 표시
    showReactionUrlModal() {
        const modal = document.getElementById('url-modal');
        const urlInput = document.getElementById('reaction-video-url-modal');
        const currentUrlSpan = document.getElementById('current-reaction-url-modal');
        
        // 현재 URL 표시
        if (this.fileManager.reactionVideoUrl) {
            currentUrlSpan.textContent = `Current: ${this.fileManager.reactionVideoUrl}`;
            currentUrlSpan.className = 'current-url has-url';
        } else {
            currentUrlSpan.textContent = 'No reaction video URL set';
            currentUrlSpan.className = 'current-url';
        }
        
        if (modal) {
            modal.style.display = 'block';
            modal.setAttribute('aria-hidden', 'false');
            
            // 입력창에 포커스
            if (urlInput) {
                urlInput.focus();
            }
        }
        
        this.setupUrlModalEvents();
    }

    // URL 모달 이벤트 설정
    setupUrlModalEvents() {
        const modal = document.getElementById('url-modal');
        const urlInput = document.getElementById('reaction-video-url-modal');
        const saveBtn = document.getElementById('save-url-btn');
        const cancelBtn = document.getElementById('cancel-url-btn');
        const closeBtn = document.getElementById('url-modal-close');

        // 저장 버튼
        if (saveBtn) {
            saveBtn.onclick = () => {
                const url = urlInput.value.trim();
                if (url) {
                    // 임시로 기존 input에 값 설정하여 FileManager 메서드 사용
                    const hiddenInput = document.getElementById('reaction-video-url');
                    if (hiddenInput) {
                        hiddenInput.value = url;
                        this.fileManager.setReactionVideoUrl();
                    }
                    this.closeUrlModal();
                } else {
                    alert('Please enter a valid YouTube URL');
                }
            };
        }

        // 취소/닫기 버튼
        const closeModal = () => this.closeUrlModal();
        if (cancelBtn) cancelBtn.onclick = closeModal;
        if (closeBtn) closeBtn.onclick = closeModal;

        // Enter 키로 저장
        if (urlInput) {
            urlInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    saveBtn.click();
                }
            };
        }

        // 모달 외부 클릭으로 닫기
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            };
        }
    }

    // URL 모달 닫기
    closeUrlModal() {
        const modal = document.getElementById('url-modal');
        const urlInput = document.getElementById('reaction-video-url-modal');
        
        if (modal) {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        }
        
        if (urlInput) {
            urlInput.value = '';
        }
    }

    // 히스토리 컨트롤 설정
    setupHistoryControls() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        const resetBtn = document.getElementById('reset-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const syncModeBtn = document.getElementById('sync-mode-btn');

        if (undoBtn) {
            undoBtn.addEventListener('click', () => this.handleUndo());
        }
        if (redoBtn) {
            redoBtn.addEventListener('click', () => this.handleRedo());
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleReset());
        }
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.handlePause());
        }
        if (syncModeBtn) {
            syncModeBtn.addEventListener('click', () => this.toggleSyncMode());
        }
    }

    // Undo 처리
    handleUndo() {
        const previousState = this.historyManager.undo();
        if (previousState) {
            this.timelineRenderer.setTimestamps(previousState);
            this.timelineRenderer.renderTimeline();
            this.updateTimelineInfo();
            this.updateButtons();
        }
    }

    // Redo 처리
    handleRedo() {
        const nextState = this.historyManager.redo();
        if (nextState) {
            this.timelineRenderer.setTimestamps(nextState);
            this.timelineRenderer.renderTimeline();
            this.updateTimelineInfo();
            this.updateButtons();
        }
    }

    // Reset 처리
    handleReset() {
        if (confirm('Are you sure you want to reset to the original file? This will discard all changes.')) {
            const originalState = this.historyManager.reset();
            if (originalState) {
                this.timelineRenderer.setTimestamps(originalState);
                this.timelineRenderer.renderTimeline();
                this.updateTimelineInfo();
                this.updateButtons();
            }
        }
    }

    // 모든 비디오 일시정지 처리
    handlePause() {
        if (this.previewManager) {
            this.previewManager.pauseAllVideos();
        }
    }

    // Sync Mode 토글
    toggleSyncMode() {
        this.syncMode = !this.syncMode;
        this.updateSyncModeButton();
        
        // DragDropManager에 sync mode 상태 전달
        if (this.dragDropManager) {
            this.dragDropManager.setSyncMode(this.syncMode);
        }
    }

    // Sync Mode 버튼 UI 업데이트
    updateSyncModeButton() {
        const syncModeBtn = document.getElementById('sync-mode-btn');
        if (syncModeBtn) {
            if (this.syncMode) {
                syncModeBtn.textContent = 'Sync: ON';
                syncModeBtn.classList.add('active');
                syncModeBtn.title = 'Sync Mode: ON - Move all timestamps after the dragged segment together';
            } else {
                syncModeBtn.textContent = 'Sync: OFF';
                syncModeBtn.classList.remove('active');
                syncModeBtn.title = 'Sync Mode: OFF - Move individual segments';
            }
        }
    }

    // Sync Mode 상태 반환
    getSyncMode() {
        return this.syncMode;
    }

    // 타임라인 변경사항을 히스토리에 추가
    addToHistory() {
        const currentTimestamps = this.timelineRenderer.timestamps;
        if (currentTimestamps) {
            this.historyManager.addState(currentTimestamps);
        }
    }
}

// 전역 변수로 설정 (HTML에서 접근 가능하도록)
window.simpleEditor = new SimpleEditor();

// 타임라인 정보 업데이트를 위한 인터벌 설정
setInterval(() => {
    if (window.simpleEditor) {
        window.simpleEditor.updateTimelineInfo();
        window.simpleEditor.updateButtons();
    }
}, 100);
