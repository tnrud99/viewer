/**
 * Editor 전용 유틸리티 함수들
 * Viewer와 독립적으로 작동하는 Editor 고유 기능들
 */

class EditorUtils {
    /**
     * 타임라인 블록 생성
     * @param {Object} syncPoint - 동기화 포인트
     * @param {number} index - 블록 인덱스
     * @param {number} pixelsPerSecond - 픽셀/초 비율
     * @returns {HTMLElement} - 생성된 블록 요소
     */
    static createTimelineBlock(syncPoint, index, pixelsPerSecond) {
        const block = document.createElement('div');
        block.className = 'timestamp-block';
        block.dataset.index = index;
        
        const left = syncPoint.reaction_time * pixelsPerSecond;
        block.style.left = left + 'px';
        
        const eventType = syncPoint.event === 'youtube_play' ? 'PLAY' : 'PAUSE';
        const timeText = this.formatTime(syncPoint.reaction_time);
        
        block.innerHTML = `
            <div class="block-content">
                <div class="event-type ${syncPoint.event}">${eventType}</div>
                <div class="time-display">${timeText}</div>
            </div>
        `;
        
        return block;
    }
    
    /**
     * 드래그 가능한 블록으로 설정
     * @param {HTMLElement} block - 블록 요소
     * @param {Function} onDragStart - 드래그 시작 콜백
     * @param {Function} onDrag - 드래그 중 콜백
     * @param {Function} onDragEnd - 드래그 종료 콜백
     */
    static makeDraggable(block, onDragStart, onDrag, onDragEnd) {
        let isDragging = false;
        let startX = 0;
        let startLeft = 0;
        
        block.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startLeft = parseInt(block.style.left) || 0;
            
            block.classList.add('dragging');
            document.body.style.userSelect = 'none';
            
            if (onDragStart) onDragStart(e, block);
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const newLeft = Math.max(0, startLeft + deltaX);
            
            block.style.left = newLeft + 'px';
            
            if (onDrag) onDrag(e, block, deltaX);
        });
        
        document.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            
            isDragging = false;
            block.classList.remove('dragging');
            document.body.style.userSelect = '';
            
            if (onDragEnd) onDragEnd(e, block);
        });
    }
    
    /**
     * 블록 선택 관리
     * @param {HTMLElement} block - 선택할 블록
     * @param {Array} selectedBlocks - 현재 선택된 블록들
     * @param {boolean} multiSelect - 다중 선택 여부
     * @returns {Array} - 업데이트된 선택 블록 배열
     */
    static toggleBlockSelection(block, selectedBlocks, multiSelect = false) {
        const isSelected = selectedBlocks.includes(block);
        
        if (!multiSelect) {
            // 단일 선택: 기존 선택 해제
            selectedBlocks.forEach(b => b.classList.remove('selected'));
            selectedBlocks.length = 0;
        }
        
        if (isSelected && multiSelect) {
            // 다중 선택에서 선택 해제
            const index = selectedBlocks.indexOf(block);
            selectedBlocks.splice(index, 1);
            block.classList.remove('selected');
        } else if (!isSelected) {
            // 새로 선택
            selectedBlocks.push(block);
            block.classList.add('selected');
        }
        
        return selectedBlocks;
    }
    
    /**
     * 시간 눈금 생성
     * @param {number} duration - 전체 시간 (초)
     * @param {number} pixelsPerSecond - 픽셀/초 비율
     * @param {number} interval - 눈금 간격 (초)
     * @returns {HTMLElement} - 시간 눈금 요소
     */
    static createTimeRuler(duration, pixelsPerSecond, interval = 10) {
        const ruler = document.createElement('div');
        ruler.className = 'time-ruler';
        
        const totalWidth = duration * pixelsPerSecond;
        ruler.style.width = totalWidth + 'px';
        
        for (let time = 0; time <= duration; time += interval) {
            const tick = document.createElement('div');
            tick.className = 'time-tick';
            tick.style.left = (time * pixelsPerSecond) + 'px';
            
            const label = document.createElement('span');
            label.className = 'time-label';
            label.textContent = TimestampParser.formatTime(time);
            
            tick.appendChild(label);
            ruler.appendChild(tick);
        }
        
        return ruler;
    }
    
    /**
     * 플레이헤드 업데이트
     * @param {HTMLElement} playhead - 플레이헤드 요소
     * @param {number} currentTime - 현재 시간 (초)
     * @param {number} pixelsPerSecond - 픽셀/초 비율
     */
    static updatePlayhead(playhead, currentTime, pixelsPerSecond) {
        if (!playhead) return;
        
        const left = currentTime * pixelsPerSecond;
        playhead.style.left = left + 'px';
        
        // 플레이헤드가 보이는 영역에 있는지 확인하고 스크롤
        const container = playhead.closest('.timeline-container');
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const playheadRect = playhead.getBoundingClientRect();
            
            if (playheadRect.left < containerRect.left || playheadRect.right > containerRect.right) {
                playhead.scrollIntoView({ behavior: 'smooth', inline: 'center' });
            }
        }
    }
    
    /**
     * 타임라인 줌 계산
     * @param {number} currentZoom - 현재 줌 레벨
     * @param {string} direction - 줌 방향 ('in' 또는 'out')
     * @param {number} factor - 줌 배율
     * @returns {number} - 새로운 줌 레벨
     */
    static calculateZoom(currentZoom, direction, factor = 1.2) {
        const config = window.SHARED_CONFIG || { TIMELINE: { MIN_PIXELS_PER_SECOND: 5, MAX_PIXELS_PER_SECOND: 200 } };
        
        let newZoom;
        if (direction === 'in') {
            newZoom = currentZoom * factor;
        } else {
            newZoom = currentZoom / factor;
        }
        
        return Math.max(
            config.TIMELINE.MIN_PIXELS_PER_SECOND,
            Math.min(config.TIMELINE.MAX_PIXELS_PER_SECOND, newZoom)
        );
    }
    
    /**
     * 상태 저장 (Undo/Redo용)
     * @param {Object} currentState - 현재 상태
     * @param {Array} undoStack - Undo 스택
     * @param {Array} redoStack - Redo 스택
     * @param {number} maxStackSize - 최대 스택 크기
     */
    static saveState(currentState, undoStack, redoStack, maxStackSize = 50) {
        // 현재 상태를 깊은 복사로 저장
        const stateCopy = JSON.parse(JSON.stringify(currentState));
        undoStack.push(stateCopy);
        
        // 스택 크기 제한
        if (undoStack.length > maxStackSize) {
            undoStack.shift();
        }
        
        // Redo 스택 클리어 (새로운 액션이 수행되었으므로)
        redoStack.length = 0;
    }
    
    /**
     * 시간 형식화 (Editor 전용 - 더 상세한 형식)
     * @param {number} seconds - 초
     * @returns {string} - 형식화된 시간 문자열
     */
    static formatTime(seconds) {
        if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
            return '00:00.000';
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const wholeSecs = Math.floor(remainingSeconds);
        const milliseconds = Math.floor((remainingSeconds - wholeSecs) * 1000);
        
        return `${minutes.toString().padStart(2, '0')}:${wholeSecs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
    
    /**
     * 에디터 전용 디버그 로깅
     * @param {string} message - 로그 메시지
     * @param {string} level - 로그 레벨
     * @param {*} data - 추가 데이터
     */
    static log(message, level = 'info', data = null) {
        const config = window.SHARED_CONFIG || { DEBUG: { ENABLED: false } };
        
        if (!config.DEBUG.ENABLED) return;
        
        const timestamp = new Date().toISOString();
        const logMessage = `[EDITOR ${timestamp}] ${message}`;
        
        switch (level) {
            case 'error':
                console.error(logMessage, data);
                break;
            case 'warn':
                console.warn(logMessage, data);
                break;
            case 'debug':
                console.debug(logMessage, data);
                break;
            default:
                console.log(logMessage, data);
        }
    }
}

// 전역 사용을 위한 export
if (typeof window !== 'undefined') {
    window.EditorUtils = EditorUtils;
}
