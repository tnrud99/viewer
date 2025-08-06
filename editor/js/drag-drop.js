// 드래그 앤 드롭 기능 모듈
class DragDropHandler {
    constructor(editor) {
        this.editor = editor;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartTime = 0;
        this.draggedBlock = null;
        
        this.setupDragAndDrop();
    }
    
    setupDragAndDrop() {
        let draggedElement = null;
        let startX = 0;
        let startLeft = 0;
        
        // 마우스 다운 이벤트
        document.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('timestamp-block')) {
                this.isDragging = true;
                draggedElement = e.target;
                startX = e.clientX;
                startLeft = parseInt(draggedElement.style.left) || 0;
                
                // 블록 선택 처리
                if (!e.ctrlKey && !this.editor.selectedBlocks.includes(draggedElement)) {
                    this.editor.selectedBlocks.forEach(block => block.classList.remove('selected'));
                    this.editor.selectedBlocks = [];
                }
                
                if (!this.editor.selectedBlocks.includes(draggedElement)) {
                    draggedElement.classList.add('selected');
                    this.editor.selectedBlocks.push(draggedElement);
                }
                
                // 드래그 시작 스타일
                draggedElement.style.zIndex = '1000';
                draggedElement.style.opacity = '0.8';
                
                e.preventDefault();
            }
        });
        
        // 마우스 이동 이벤트
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging && draggedElement) {
                const deltaX = e.clientX - startX;
                const newLeft = Math.max(0, startLeft + deltaX);
                
                // 선택된 모든 블록 이동
                this.editor.selectedBlocks.forEach(block => {
                    const blockStartLeft = parseInt(block.dataset.originalLeft) || parseInt(block.style.left) || 0;
                    const blockNewLeft = Math.max(0, blockStartLeft + deltaX);
                    block.style.left = blockNewLeft + 'px';
                    
                    // 원래 위치 저장
                    if (!block.dataset.originalLeft) {
                        block.dataset.originalLeft = blockStartLeft;
                    }
                });
                
                // 연결 이동 모드 처리
                if (this.editor.rippleMode && this.editor.selectedBlocks.length === 1) {
                    this.moveRippleBlocks(draggedElement, deltaX);
                }
                
                e.preventDefault();
            }
        });
        
        // 마우스 업 이벤트
        document.addEventListener('mouseup', (e) => {
            if (this.isDragging && draggedElement) {
                this.isDragging = false;
                
                // 드래그 종료 스타일 복원
                draggedElement.style.zIndex = '';
                draggedElement.style.opacity = '';
                
                // 원래 위치 데이터 정리
                this.editor.selectedBlocks.forEach(block => {
                    delete block.dataset.originalLeft;
                });
                
                // 타임스탬프 데이터 업데이트
                this.editor.updateTimestampData();
                this.editor.saveState();
                
                draggedElement = null;
            }
        });
        
        // 타임라인 클릭으로 재생 헤드 이동
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
    
    moveRippleBlocks(draggedBlock, deltaX) {
        const draggedIndex = parseInt(draggedBlock.dataset.index);
        const blocks = document.querySelectorAll('.timestamp-block');
        
        blocks.forEach(block => {
            const blockIndex = parseInt(block.dataset.index);
            if (blockIndex > draggedIndex && !this.editor.selectedBlocks.includes(block)) {
                const currentLeft = parseInt(block.style.left) || 0;
                const newLeft = Math.max(0, currentLeft + deltaX);
                block.style.left = newLeft + 'px';
            }
        });
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
        if (this.reactionVideo) {
            this.reactionVideo.currentTime = this.currentTime;
        }
        
        console.log('재생 헤드 이동:', this.formatTime(this.currentTime));
    };
}

