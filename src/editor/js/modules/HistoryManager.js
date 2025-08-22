/**
 * HistoryManager - 타임라인 변경사항 추적 및 Undo/Redo/Reset 기능
 */
export class HistoryManager {
    constructor() {
        this.history = [];
        this.currentIndex = -1;
        this.maxHistorySize = 50; // 최대 히스토리 크기
        this.originalData = null; // 원본 데이터 저장
    }

    /**
     * 원본 데이터 설정 (Reset 기능용)
     */
    setOriginalData(timestamps) {
        this.originalData = JSON.parse(JSON.stringify(timestamps));
    }

    /**
     * 새로운 상태 추가
     */
    addState(timestamps) {
        // 현재 인덱스 이후의 히스토리 제거 (Redo 스택 클리어)
        this.history = this.history.slice(0, this.currentIndex + 1);
        
        // 새 상태 추가
        const newState = JSON.parse(JSON.stringify(timestamps));
        this.history.push(newState);
        this.currentIndex++;

        // 히스토리 크기 제한
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.currentIndex--;
        }



        this.updateButtons();
    }

    /**
     * Undo 실행
     */
    undo() {
        if (this.canUndo()) {
            this.currentIndex--;
            this.updateButtons();
            return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
        }
        return null;
    }

    /**
     * Redo 실행
     */
    redo() {
        if (this.canRedo()) {
            this.currentIndex++;
            this.updateButtons();
            return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
        }
        return null;
    }

    /**
     * Reset 실행 (원본 데이터로 복원)
     */
    reset() {
        if (this.originalData) {
            // 원본 데이터를 새 상태로 추가
            this.addState(this.originalData);
            return JSON.parse(JSON.stringify(this.originalData));
        }
        return null;
    }

    /**
     * Undo 가능 여부 확인
     */
    canUndo() {
        return this.currentIndex > 0;
    }

    /**
     * Redo 가능 여부 확인
     */
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    /**
     * 버튼 상태 업데이트
     */
    updateButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        const resetBtn = document.getElementById('reset-btn');

        const canUndo = this.canUndo();
        const canRedo = this.canRedo();
        const hasChanges = this.history.length > 1 || 
                         (this.history.length === 1 && this.originalData && 
                          JSON.stringify(this.history[0]) !== JSON.stringify(this.originalData));

        if (undoBtn) {
            undoBtn.disabled = !canUndo;
        }
        if (redoBtn) {
            redoBtn.disabled = !canRedo;
        }
        if (resetBtn) {
            resetBtn.disabled = !this.originalData || !hasChanges;
        }
    }

    /**
     * 히스토리 초기화
     */
    clear() {
        this.history = [];
        this.currentIndex = -1;
        this.updateButtons();
    }

    /**
     * 현재 상태 가져오기
     */
    getCurrentState() {
        if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
            return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
        }
        return null;
    }

    /**
     * 히스토리 정보 가져오기
     */
    getHistoryInfo() {
        return {
            total: this.history.length,
            current: this.currentIndex + 1,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            hasOriginal: !!this.originalData
        };
    }
}
