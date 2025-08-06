// 개선된 드래그 앤 드롭 기능 모듈
class DragDropHandler {
    constructor(editor) {
        this.editor = editor;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartTime = 0;
        this.draggedBlock = null;
        this.dragStartPositions = new Map(); // 다중 선택을 위한 시작 위치 저장
        
        this.setupDragAndDrop();
    }
    
    setupDragAndDrop() {
        // 마우스 다운 이벤트
        document.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('timestamp-block') && !e.target.classList.contains('static-pause-block')) {
                this.startDrag(e);
            }
        });
        
        // 마우스 이동 이벤트
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.updateDrag(e);
            }
        });
        
        // 마우스 업 이벤트
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.endDrag();
            }
        });
        
        // 타임라인 클릭으로 재생 헤드 이동
        this.setupTimelineClick();
    }
    
    startDrag(e) {
        e.preventDefault();
        
        this.isDragging = true;
        this.draggedBlock = e.target;
        this.dragStartX = e.clientX;
        this.dragStartTime = this.getBlockTime(e.target);
        
        // 블록 선택 처리
        this.handleBlockSelection(e);
        
        // 드래그 시작 위치 저장
        this.saveDragStartPositions();
        
        // 드래그 시작 스타일 적용
        this.applyDragStartStyles();
        
        // 타임라인 컨트롤이 있으면 드래그 시작 알림
        if (this.editor.timelineControls) {
            this.editor.timelineControls.onDragStart(e.target);
        }
    }
    
    handleBlockSelection(e) {
        // Ctrl 키를 누르지 않으면 기존 선택 해제
        if (!e.ctrlKey && !this.editor.selectedBlocks.includes(e.target)) {
            this.editor.selectedBlocks.forEach(block => block.classList.remove('selected'));
            this.editor.selectedBlocks = [];
        }
        
        // 선택된 블록 목록에 추가/제거
        if (this.editor.selectedBlocks.includes(e.target)) {
            e.target.classList.remove('selected');
            this.editor.selectedBlocks = this.editor.selectedBlocks.filter(b => b !== e.target);
        } else {
            e.target.classList.add('selected');
            this.editor.selectedBlocks.push(e.target);
        }
    }
    
    saveDragStartPositions() {
        this.dragStartPositions.clear();
        this.editor.selectedBlocks.forEach(block => {
            const left = parseInt(block.style.left) || 0;
            this.dragStartPositions.set(block, left);
        });
    }
    
    applyDragStartStyles() {
        this.editor.selectedBlocks.forEach(block => {
            block.style.zIndex = '1000';
            block.style.opacity = '0.8';
            block.classList.add('dragging');
        });
    }
    
    updateDrag(e) {
        if (!this.isDragging || this.editor.selectedBlocks.length === 0) return;
        
        const deltaX = e.clientX - this.dragStartX;
        const deltaTime = deltaX / this.editor.pixelsPerSecond;
        
        console.log('updateDrag called:', {
            deltaX,
            deltaTime,
            selectedBlocksCount: this.editor.selectedBlocks.length,
            rippleMode: this.editor.rippleMode
        });
        
        // 선택된 모든 블록 이동
        this.editor.selectedBlocks.forEach(block => {
            const startLeft = this.dragStartPositions.get(block) || 0;
            const newLeft = Math.max(0, startLeft + deltaX);
            const newTime = newLeft / this.editor.pixelsPerSecond;
            
            // 자유로운 이동 (스냅 없음)
            block.style.left = newLeft + 'px';
            
            // 블록 내용 업데이트 (개별 블록인 경우)
            if (block.classList.contains('timestamp-block') && !block.classList.contains('play-pause-block')) {
                const content = block.querySelector('div');
                if (content) {
                    const point = this.editor.timestampData.sync_points[parseInt(block.dataset.index)];
                    content.innerHTML = `
                        <div>${point.event === 'youtube_play' ? 'PLAY' : 'PAUSE'}</div>
                        <div>${this.editor.formatTime(newTime)}</div>
                    `;
                }
            }
        });
        
        // 연결 이동 모드 처리
        if (this.editor.rippleMode && this.editor.selectedBlocks.length === 1) {
            console.log('Calling moveRippleBlocks from updateDrag');
            this.moveRippleBlocks(deltaTime);
        } else {
            console.log('Ripple mode conditions not met in updateDrag:', {
                rippleMode: this.editor.rippleMode,
                selectedBlocksCount: this.editor.selectedBlocks.length
            });
        }
        // Individual Move 모드: 선택된 블록만 이동 (기본 동작)
        
        // 타임라인 컨트롤이 있으면 드래그 업데이트 알림
        if (this.editor.timelineControls) {
            this.editor.timelineControls.onDragUpdate(e);
        }
    }
    
    endDrag() {
        this.isDragging = false;
        
        // 드래그 종료 스타일 복원
        this.editor.selectedBlocks.forEach(block => {
            block.style.zIndex = '';
            block.style.opacity = '';
            block.classList.remove('dragging');
        });
        
        // 타임스탬프 데이터 업데이트
        this.updateTimestampData();
        this.editor.saveState();
        
        // 타임라인 컨트롤이 있으면 드래그 종료 알림
        if (this.editor.timelineControls) {
            this.editor.timelineControls.onDragEnd();
        }
        
        this.draggedBlock = null;
        this.dragStartPositions.clear();
    }
    
    moveRippleBlocks(deltaTime) {
        if (this.editor.selectedBlocks.length === 0) return;
        
        const selectedBlock = this.editor.selectedBlocks[0];
        let draggedIndex;
        
        // play-pause-block인지 확인
        if (selectedBlock.classList.contains('play-pause-block')) {
            draggedIndex = parseInt(selectedBlock.dataset.playIndex);
        } else {
            draggedIndex = parseInt(selectedBlock.dataset.index);
        }
        
        const blocks = document.querySelectorAll('.timestamp-block');
        
        console.log('DragDrop: Ripple mode activated:', {
            draggedIndex,
            deltaTime,
            rippleMode: this.editor.rippleMode,
            selectedBlocksCount: this.editor.selectedBlocks.length,
            blockType: selectedBlock.classList.contains('play-pause-block') ? 'play-pause' : 'timestamp'
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
                
                // 새로운 위치 계산
                const newLeft = newTime * this.editor.pixelsPerSecond;
                block.style.left = newLeft + 'px';
                
                console.log(`DragDrop: Moved block ${blockIndex}: ${currentTime}s -> ${newTime}s`);
            }
        });
    }
    
    updateTimestampData() {
        const blocks = document.querySelectorAll('.timestamp-block');
        blocks.forEach(block => {
            const index = parseInt(block.dataset.index);
            const left = parseInt(block.style.left);
            const time = left / this.editor.pixelsPerSecond;
            
            if (this.editor.timestampData.sync_points[index]) {
                this.editor.timestampData.sync_points[index].reaction_time = time;
            }
        });
        
        // 시간순으로 정렬
        this.editor.timestampData.sync_points.sort((a, b) => a.reaction_time - b.reaction_time);
        
        // 블록 다시 렌더링
        this.editor.renderTimestampBlocks();
    }
    
    setupTimelineClick() {
        const timelineContainer = document.querySelector('.timeline-container');
        if (timelineContainer) {
            timelineContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('track-content') || e.target.classList.contains('time-ruler')) {
                    const rect = e.target.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const clickTime = clickX / this.editor.pixelsPerSecond;
                    
                    this.editor.seekTo(clickTime);
                }
            });
        }
    }
    
    getBlockTime(block) {
        const left = parseInt(block.style.left) || 0;
        return left / this.editor.pixelsPerSecond;
    }
}

// TimestampEditor에 드래그 앤 드롭 기능 추가
if (typeof TimestampEditor !== 'undefined') {
    TimestampEditor.prototype.setupDragAndDrop = function() {
        this.dragDropHandler = new DragDropHandler(this);
    };
    
    TimestampEditor.prototype.seekTo = function(time) {
        this.currentTime = Math.max(0, Math.min(time, this.duration));
        this.updatePlayhead();
        this.updateTimeDisplay();
        
        // 비디오 플레이어 시간 이동
        if (this.reactionPlayer) {
            // YouTube iframe API 사용
            this.reactionPlayer.seekTo(this.currentTime, true);
        } else if (this.reactionVideo) {
            // 일반 HTML5 비디오 엘리먼트
            this.reactionVideo.currentTime = this.currentTime;
        }
        
        console.log('재생 헤드 이동:', this.formatTime(this.currentTime));
    };
}

