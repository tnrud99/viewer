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
        this.syncMode = false; // 연동 모드 상태
        this.originalTimestamps = []; // 드래그 시작 시 원본 타임스탬프 저장
        
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

        // 드래그 중 마우스가 화면을 벗어날 때 처리
        document.addEventListener('mouseleave', () => {
            if (this.isDragging) {
                this.handleDragEnd();
            }
        });

        // 전역 mouseup으로 세그먼트 드래그 종료
        document.addEventListener('mouseup', (e) => {
            if (this.isDragging) {
                // 점에서 시작된 드래그가 아닌 경우에만 처리
                if (!e.target.closest('.timeline-point')) {
                    this.handleDragEnd();
                }
            }
        });
    }

    handleDragStart(e) {
        const segment = e.target.closest('.timeline-segment');
        if (!segment) return;

        e.preventDefault();
        
        const playIndex = parseInt(segment.dataset.playIndex);
        const pauseIndex = parseInt(segment.dataset.pauseIndex);
        
        // start/end 이벤트는 드래그 불가
        const currentTimestamps = this.timelineRenderer.timestamps;
        if (currentTimestamps[playIndex] && (currentTimestamps[playIndex].event === 'start' || currentTimestamps[playIndex].event === 'end')) {
            return;
        }
        if (currentTimestamps[pauseIndex] && (currentTimestamps[pauseIndex].event === 'start' || currentTimestamps[pauseIndex].event === 'end')) {
            return;
        }
        
        this.draggedSegmentIndex = playIndex;
        
        // 드래그 시작 전 현재 상태를 히스토리에 추가
        if (window.simpleEditor && window.simpleEditor.getHistoryManager) {
            const timestamps = this.timelineRenderer.timestamps;
            window.simpleEditor.getHistoryManager().addState(timestamps);
        }
        
        this.isDragging = true;
        this.draggedSegment = segment;
        this.dragStartX = e.clientX;
        
        // 드래그 시작 시간 저장
        const timestamps = this.timelineRenderer.timestamps;
        if (timestamps[playIndex]) {
            this.dragStartTime = timestamps[playIndex].reaction_time;
        }
        
        // Sync Mode일 때 원본 타임스탬프 저장
        if (this.syncMode) {
            this.originalTimestamps = timestamps.map(ts => ({ ...ts }));
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

        const wasActuallyDragging = this.draggedSegment !== null;
        this.isDragging = false;
        
        if (this.draggedSegment) {
            this.draggedSegment.style.cursor = 'grab';
            this.draggedSegment.style.opacity = '1';
            this.draggedSegment.style.transform = '';
        }

        // 모든 점의 길게 누르기 스타일 해제
        const points = this.container.querySelectorAll('.timeline-point');
        points.forEach(point => {
            point.style.transform = '';
            point.style.opacity = '';
            point.style.cursor = 'pointer';
        });

        // 모든 세그먼트의 스타일 해제
        const segments = this.container.querySelectorAll('.timeline-segment');
        segments.forEach(segment => {
            segment.style.transform = '';
            segment.style.opacity = '';
            segment.style.cursor = 'grab';
        });

        // 드래그 시작 시 이미 히스토리에 추가했으므로 여기서는 추가하지 않음

        this.draggedSegment = null;
        this.draggedSegmentIndex = -1;
    }

    moveSegment(playIndex, newStartTime) {
        const timestamps = this.timelineRenderer.timestamps;
        if (!timestamps[playIndex] || !timestamps[playIndex + 1]) return;

        if (this.syncMode) {
            // Sync Mode: 드래그한 세그먼트와 이후 세그먼트들을 함께 이동
            this.moveSegmentWithSync(playIndex, newStartTime);
        } else {
            // 개별 모드: 현재 세그먼트만 이동
            this.moveSingleSegment(playIndex, newStartTime);
        }

        // 타임라인 다시 렌더링
        this.timelineRenderer.renderTimeline();
    }

    moveSingleSegment(playIndex, newStartTime) {
        const timestamps = this.timelineRenderer.timestamps;
        const playTimestamp = timestamps[playIndex];
        const pauseTimestamp = timestamps[playIndex + 1];
        
        // 현재 세그먼트의 지속 시간 계산
        const currentDuration = pauseTimestamp.reaction_time - playTimestamp.reaction_time;
        
        // 새로운 시간으로 업데이트
        playTimestamp.reaction_time = newStartTime;
        pauseTimestamp.reaction_time = newStartTime + currentDuration;
    }

    moveSegmentWithSync(playIndex, newStartTime) {
        const timestamps = this.timelineRenderer.timestamps;
        
        // 이동량 계산 (드래그 시작 시간 대비)
        const deltaTime = newStartTime - this.dragStartTime;
        
        // console.log(`Sync Mode - dragStartTime: ${this.dragStartTime}, newStartTime: ${newStartTime}, deltaTime: ${deltaTime}`); // 배포용으로 주석 처리
        
        // 원본 타임스탬프에서 동일한 오프셋만큼 이동
        for (let i = 0; i < timestamps.length; i++) {
            const timestamp = timestamps[i];
            const originalTimestamp = this.originalTimestamps[i];
            
            // start와 end 이벤트는 제외
            if (timestamp.event === 'start' || timestamp.event === 'end') {
                continue;
            }
            
            // 드래그한 세그먼트 이후의 것들만 이동
            if (i >= playIndex) {
                const oldTime = timestamp.reaction_time;
                // 원본 위치에서 동일한 오프셋만큼 이동
                const newTime = originalTimestamp.reaction_time + deltaTime;
                // 음수 시간 방지
                timestamp.reaction_time = Math.max(0, newTime);
                
                // console.log(`Moving timestamp ${i}: ${oldTime} -> ${timestamp.reaction_time} (original: ${originalTimestamp.reaction_time}, delta: ${deltaTime})`); // 배포용으로 주석 처리
            }
        }
    }

    moveAllTimestamps(draggedPlayIndex, newStartTime) {
        const timestamps = this.timelineRenderer.timestamps;
        
        // 이동량 계산
        const deltaTime = newStartTime - this.dragStartTime;
        
        // 드래그한 세그먼트 이후의 타임스탬프들만 이동 (start/end 제외)
        for (let i = 0; i < timestamps.length; i++) {
            const timestamp = timestamps[i];
            
            // start와 end 이벤트는 제외
            if (timestamp.event === 'start' || timestamp.event === 'end') {
                continue;
            }
            
            // 드래그한 세그먼트 이후의 것들만 이동 (드래그한 세그먼트 자체는 제외)
            if (i > draggedPlayIndex + 1) { // PAUSE 포인트 이후부터
                const newTime = timestamp.reaction_time + deltaTime;
                // 음수 시간 방지
                timestamp.reaction_time = Math.max(0, newTime);
            }
        }
    }

    // 외부에서 호출할 수 있는 메서드들
    getIsDragging() {
        return this.isDragging;
    }

    getDraggedSegment() {
        return this.draggedSegment;
    }

    // 강제로 드래그 종료 (ESC 키나 오류 상황에서 사용)
    forceEndDrag() {
        if (this.isDragging) {
            this.handleDragEnd();
        }
    }

    // Sync Mode 설정
    setSyncMode(enabled) {
        this.syncMode = enabled;
    }

    // Sync Mode 상태 반환
    getSyncMode() {
        return this.syncMode;
    }

    // 점에서 세그먼트 드래그 시작
    startSegmentDrag(playIndex, event) {
        // start/end 이벤트는 드래그 불가
        const currentTimestamps = this.timelineRenderer.timestamps;
        if (currentTimestamps[playIndex] && (currentTimestamps[playIndex].event === 'start' || currentTimestamps[playIndex].event === 'end')) {
            return;
        }
        
        // 해당 세그먼트 찾기
        const segmentElement = this.container.querySelector(`[data-play-index="${playIndex}"]`);
        if (!segmentElement) return;

        // 드래그 시작 전 현재 상태를 히스토리에 추가 (첫 번째 변경사항 보존)
        if (window.simpleEditor && window.simpleEditor.getHistoryManager) {
            const currentTimestamps = this.timelineRenderer.timestamps;
            window.simpleEditor.getHistoryManager().addState(currentTimestamps);
        }

        // 기존 드래그 상태 설정
        this.isDragging = true;
        this.draggedSegment = segmentElement;
        this.dragStartX = event.clientX;
        this.draggedSegmentIndex = playIndex;
        
        // 드래그 시작 시간 저장
        const timestamps = this.timelineRenderer.timestamps;
        if (timestamps[playIndex]) {
            this.dragStartTime = timestamps[playIndex].reaction_time;
        }

        // 드래그 중 스타일 적용
        segmentElement.style.cursor = 'grabbing';
        segmentElement.style.opacity = '0.8';
        
        // console.log(`Started segment drag from point, playIndex: ${playIndex}`); // 배포용으로 주석 처리
    }
}

