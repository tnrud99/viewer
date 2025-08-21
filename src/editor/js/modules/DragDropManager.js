export class DragDropManager {
    constructor(container, timelineRenderer, positionCalculator) {
        this.container = container;
        this.timelineRenderer = timelineRenderer;
        this.positionCalculator = positionCalculator;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartTime = 0;
        this.draggedSegment = null;
        this.draggedSegmentIndex = -1;
        
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        // 타임라인 컨테이너에서 드래그 시작
        this.container.addEventListener('mousedown', (e) => {
            this.handleDragStart(e);
        });

        // 문서 전체에서 드래그 업데이트
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.handleDragMove(e);
            }
        });

        // 드래그 종료
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.handleDragEnd();
            }
        });
    }

    handleDragStart(e) {
        const segment = e.target.closest('.timeline-segment');
        if (!segment) return;

        e.preventDefault();
        this.isDragging = true;
        this.draggedSegment = segment;
        this.dragStartX = e.clientX;
        
        const playIndex = parseInt(segment.dataset.playIndex);
        const pauseIndex = parseInt(segment.dataset.pauseIndex);
        this.draggedSegmentIndex = playIndex;
        
        // 드래그 시작 시간 저장
        const timestamps = this.timelineRenderer.timestamps;
        if (timestamps[playIndex]) {
            this.dragStartTime = timestamps[playIndex].reaction_time;
        }

        // 드래그 중 스타일 적용
        segment.style.cursor = 'grabbing';
        segment.style.opacity = '0.8';
    }

    handleDragMove(e) {
        if (!this.isDragging || !this.draggedSegment) return;

        const deltaX = e.clientX - this.dragStartX;
        const deltaTime = deltaX / (this.positionCalculator.pixelsPerSecond * this.positionCalculator.zoomLevel);
        const newTime = Math.max(0, this.dragStartTime + deltaTime);

        // 세그먼트 이동
        this.moveSegment(this.draggedSegmentIndex, newTime);
    }

    handleDragEnd() {
        if (!this.isDragging) return;

        this.isDragging = false;
        
        if (this.draggedSegment) {
            this.draggedSegment.style.cursor = 'grab';
            this.draggedSegment.style.opacity = '1';
        }

        this.draggedSegment = null;
        this.draggedSegmentIndex = -1;
    }

    moveSegment(playIndex, newStartTime) {
        const timestamps = this.timelineRenderer.timestamps;
        if (!timestamps[playIndex] || !timestamps[playIndex + 1]) return;

        const playTimestamp = timestamps[playIndex];
        const pauseTimestamp = timestamps[playIndex + 1];
        
        // 현재 세그먼트의 지속 시간 계산
        const currentDuration = pauseTimestamp.reaction_time - playTimestamp.reaction_time;
        
        // 새로운 시간으로 업데이트
        playTimestamp.reaction_time = newStartTime;
        pauseTimestamp.reaction_time = newStartTime + currentDuration;

        // 타임라인 다시 렌더링
        this.timelineRenderer.renderTimeline();
    }

    // 외부에서 호출할 수 있는 메서드들
    getIsDragging() {
        return this.isDragging;
    }

    getDraggedSegment() {
        return this.draggedSegment;
    }
}
