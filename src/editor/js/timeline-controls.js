// 개선된 타임라인 컨트롤 시스템
class TimelineControls {
    constructor(editor) {
        this.editor = editor;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartTime = 0;
        this.draggedBlock = null;
        this.snapInterval = 0.1; // 0.1초 간격으로 스냅
        this.snapEnabled = true;
        this.precisionMode = false; // 정밀 모드 (Ctrl 키)
        this.gridVisible = true;
        
        this.setupControls();
        this.setupKeyboardShortcuts();
        this.setupVisualFeedback();
    }
    
    setupControls() {
        // 타임라인 컨트롤 버튼들
        this.createControlButtons();
        
        // 스냅 기능 설정
        this.setupSnapControls();
        
        // 그리드 표시 설정
        this.setupGridControls();
        
        // 정밀도 설정
        this.setupPrecisionControls();
    }
    
    createControlButtons() {
        // HTML에 직접 추가된 줌 버튼 사용
        // 이벤트 리스너 추가
        this.setupButtonEvents();
    }
    
    setupButtonEvents() {
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        
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
    }
    
    setupSnapControls() {
        // 스냅 간격 설정 UI 제거 - 고정값 사용
    }
    
    setupGridControls() {
        // 그리드 설정이 이미 위에서 처리됨
    }
    
    setupPrecisionControls() {
        // 정밀도 설정이 이미 위에서 처리됨
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 확대/축소
            if (e.ctrlKey) {
                if (e.key === '+' || e.key === '=') {
                    e.preventDefault();
                    this.zoomIn();
                } else if (e.key === '-') {
                    e.preventDefault();
                    this.zoomOut();
                }
            }
            
            // 방향키로 미세 조정
            if (this.editor.selectedBlocks.length > 0) {
                const precision = 0.1; // 고정 정밀도
                
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.moveSelectedBlocks(-precision);
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.moveSelectedBlocks(precision);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.moveSelectedBlocks(-precision * 10);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.moveSelectedBlocks(precision * 10);
                }
            }
        });
    }
    
    setupVisualFeedback() {
        // 드래그 중인 블록에 대한 시각적 피드백
        this.setupDragFeedback();
    }
    
    setupDragFeedback() {
        document.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('timestamp-block')) {
                this.isDragging = true;
                this.draggedBlock = e.target;
                this.dragStartX = e.clientX;
                this.dragStartTime = this.getBlockTime(e.target);
                
                // 드래그 시작 피드백
                e.target.classList.add('dragging');
                this.showDragInfo(e.target);
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.draggedBlock) {
                this.updateDragFeedback(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.draggedBlock.classList.remove('dragging');
                this.hideDragInfo();
                this.draggedBlock = null;
            }
        });
    }
    
    setupSnapLines() {
        // 스냅 라인을 표시할 컨테이너 생성
        const snapLinesContainer = document.createElement('div');
        snapLinesContainer.className = 'snap-lines';
        snapLinesContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 50;
        `;
        
        document.querySelector('.timeline-container').appendChild(snapLinesContainer);
    }
    
    setupGridDisplay() {
        // 그리드 라인을 표시할 컨테이너 생성
        const timelineContainer = document.querySelector('.timeline-container');
        
        // 기존 그리드 라인 제거
        const existingGrid = timelineContainer.querySelector('.grid-lines');
        if (existingGrid) {
            existingGrid.remove();
        }
        
        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid-lines';
        gridContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 25;
        `;
        
        timelineContainer.appendChild(gridContainer);
        
        // 스냅 라인 컨테이너도 생성
        const existingSnap = timelineContainer.querySelector('.snap-lines');
        if (existingSnap) {
            existingSnap.remove();
        }
        
        const snapContainer = document.createElement('div');
        snapContainer.className = 'snap-lines';
        snapContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 26;
        `;
        
        timelineContainer.appendChild(snapContainer);
        
        // 초기 그리드 표시
        this.updateGrid();
    }
    
    // Snap과 Grid 기능 제거
    
    // 정밀 모드 토글
    // 정밀 모드 관련 메서드 제거 - 고정 정밀도 사용
    
    // 확대/축소 기능
    zoomIn() {
        this.editor.pixelsPerSecond = Math.min(200, this.editor.pixelsPerSecond * 1.2);
        this.updateTimelineScale();
    }
    
    zoomOut() {
        this.editor.pixelsPerSecond = Math.max(5, this.editor.pixelsPerSecond / 1.2);
        this.updateTimelineScale();
    }
    
    // fitTimeline 메서드 제거 - 불필요한 기능
    
    updateTimelineScale() {
        // 타임라인 크기 업데이트
        this.editor.renderTimeline();
        this.updateGrid();
        
        console.log('타임라인 스케일 업데이트:', this.editor.pixelsPerSecond);
    }
    
    // Snap 기능 제거 - 자유로운 이동
    
    // 선택된 블록들 이동
    moveSelectedBlocks(deltaTime) {
        if (this.editor.selectedBlocks.length === 0) return;
        
        console.log('moveSelectedBlocks called:', {
            deltaTime,
            selectedBlocksCount: this.editor.selectedBlocks.length,
            rippleMode: this.editor.rippleMode
        });
        
        this.editor.selectedBlocks.forEach(block => {
            const index = parseInt(block.dataset.index);
            const currentTime = this.editor.timestampData.sync_points[index].reaction_time;
            const newTime = Math.max(0, currentTime + deltaTime);
            
            // 자유로운 이동 (스냅 없음)
            this.editor.timestampData.sync_points[index].reaction_time = newTime;
            
            // 블록 위치 업데이트
            const newLeft = newTime * this.editor.pixelsPerSecond;
            block.style.left = newLeft + 'px';
        });
        
        // 연결 이동 모드 처리
        if (this.editor.rippleMode && this.editor.selectedBlocks.length === 1) {
            console.log('Calling moveRippleBlocks from moveSelectedBlocks');
            this.moveRippleBlocks(this.editor.selectedBlocks[0], deltaTime);
        } else {
            console.log('Ripple mode conditions not met:', {
                rippleMode: this.editor.rippleMode,
                selectedBlocksCount: this.editor.selectedBlocks.length
            });
        }
        
        this.editor.saveState();
    }
    
    // Snap 라인 표시 기능 제거
    
    // 드래그 피드백 업데이트
    updateDragFeedback(e) {
        if (!this.draggedBlock) return;
        
        const deltaX = e.clientX - this.dragStartX;
        const deltaTime = deltaX / this.editor.pixelsPerSecond;
        const newTime = this.dragStartTime + deltaTime;
        
        // 자유로운 이동 (스냅 없음)
        const newLeft = newTime * this.editor.pixelsPerSecond;
        
        this.draggedBlock.style.left = newLeft + 'px';
        
        // 연결 이동 모드 처리
        if (this.editor.rippleMode && this.editor.selectedBlocks.length === 1) {
            this.moveRippleBlocks(this.draggedBlock, deltaTime);
        }
        
        // 드래그 정보 업데이트
        this.updateDragInfo(newTime);
    }
    
    // 드래그 정보 표시
    showDragInfo(block) {
        const info = document.createElement('div');
        info.className = 'drag-info';
        info.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            z-index: 1000;
        `;
        
        document.body.appendChild(info);
        this.dragInfoElement = info;
    }
    
    updateDragInfo(time) {
        if (this.dragInfoElement) {
            this.dragInfoElement.innerHTML = `
                <div>Time: ${this.editor.formatTime(time)}</div>
                <div>Snap: ${this.snapEnabled ? 'ON' : 'OFF'}</div>
                <div>Precision: ${this.precisionMode ? 'ON' : 'OFF'}</div>
            `;
        }
    }
    
    hideDragInfo() {
        if (this.dragInfoElement) {
            this.dragInfoElement.remove();
            this.dragInfoElement = null;
        }
        
        // 스냅 라인 제거
        const snapLines = document.querySelector('.snap-lines');
        if (snapLines) {
            snapLines.innerHTML = '';
        }
    }
    
    // Grid 업데이트 기능 제거
    
    // 블록 시간 가져오기
    getBlockTime(block) {
        const left = parseInt(block.style.left) || 0;
        return left / this.editor.pixelsPerSecond;
    }
    
    // Snap 적용 기능 제거
    
    // 드래그 이벤트 핸들러들
    onDragStart(block) {
        this.showDragInfo(block);
    }
    
    onDragUpdate(e) {
        if (this.draggedBlock) {
            this.updateDragFeedback(e);
        }
    }
    
    onDragEnd() {
        this.hideDragInfo();
    }
    
    // 연결 이동 블록들
    moveRippleBlocks(draggedBlock, deltaTime) {
        let draggedIndex;
        
        // play-pause-block인지 확인
        if (draggedBlock.classList.contains('play-pause-block')) {
            draggedIndex = parseInt(draggedBlock.dataset.playIndex);
        } else {
            draggedIndex = parseInt(draggedBlock.dataset.index);
        }
        
        const blocks = document.querySelectorAll('.timestamp-block');
        
        console.log('Ripple mode activated:', {
            draggedIndex,
            deltaTime,
            rippleMode: this.editor.rippleMode,
            selectedBlocksCount: this.editor.selectedBlocks.length,
            blockType: draggedBlock.classList.contains('play-pause-block') ? 'play-pause' : 'timestamp'
        });
        
        blocks.forEach(block => {
            let blockIndex;
            
            // play-pause-block인지 확인
            if (block.classList.contains('play-pause-block')) {
                blockIndex = parseInt(block.dataset.playIndex);
            } else {
                blockIndex = parseInt(block.dataset.index);
            }
            
            if (blockIndex > draggedIndex && !this.editor.selectedBlocks.includes(block)) {
                // 원본 데이터에서 현재 시간 가져오기
                const currentTime = this.editor.timestampData.sync_points[blockIndex].reaction_time;
                const newTime = Math.max(0, currentTime + deltaTime);
                
                this.editor.timestampData.sync_points[blockIndex].reaction_time = newTime;
                
                const newLeft = newTime * this.editor.pixelsPerSecond;
                block.style.left = newLeft + 'px';
                
                console.log(`Moved block ${blockIndex}: ${currentTime}s -> ${newTime}s`);
            }
        });
    }
}

// TimestampEditor에 타임라인 컨트롤 추가
if (typeof TimestampEditor !== 'undefined') {
    TimestampEditor.prototype.initTimelineControls = function() {
        this.timelineControls = new TimelineControls(this);
    };
} 