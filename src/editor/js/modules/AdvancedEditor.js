export class AdvancedEditor {
    constructor(timelineRenderer) {
        this.timelineRenderer = timelineRenderer;
        this.modal = document.getElementById('advanced-edit-modal');
        
        this.setupAdvancedEditModal();
    }

    setupAdvancedEditModal() {
        const advancedEditBtn = document.getElementById('advanced-edit-btn');
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

        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeAdvancedEditModal();
                }
            });
        }
    }

    openAdvancedEditModal() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            this.loadTimestampTable();
        }
    }

    closeAdvancedEditModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }

    loadTimestampTable() {
        const tableBody = document.getElementById('timestamps-table-body');
        const timestampCount = document.getElementById('timestamp-count');
        
        if (!tableBody) return;

        tableBody.innerHTML = '';
        
        const segments = this.getSegmentPairs();
        
        segments.forEach((segment, index) => {
            this.addSegmentRow(segment, index);
        });

        if (timestampCount) {
            timestampCount.textContent = segments.length;
        }
    }

    getSegmentPairs() {
        const segments = [];
        const timestamps = this.timelineRenderer.timestamps;

        for (let i = 0; i < timestamps.length - 1; i++) {
            const current = timestamps[i];
            const next = timestamps[i + 1];

            if (current.event === 'youtube_play' && next.event === 'youtube_pause') {
                segments.push({
                    playTimestamp: current,
                    pauseTimestamp: next,
                    playIndex: i,
                    pauseIndex: i + 1
                });
            }
        }

        return segments;
    }

    addSegmentRow(segment, index) {
        const tableBody = document.getElementById('timestamps-table-body');
        if (!tableBody) return;

        const row = document.createElement('tr');
        
        const playTime = segment.playTimestamp.reaction_time;
        const pauseTime = segment.pauseTimestamp.reaction_time;
        const playOriginalTime = segment.playTimestamp.relative_youtube_time || segment.playTimestamp.youtube_time || 0;
        const pauseOriginalTime = segment.pauseTimestamp.relative_youtube_time || segment.pauseTimestamp.youtube_time || 0;
        const duration = pauseTime - playTime;

        const isSystemEvent = segment.playTimestamp.event === 'start' || segment.playTimestamp.event === 'end';
        const readonlyAttr = isSystemEvent ? 'readonly' : '';
        const disabledAttr = isSystemEvent ? 'disabled' : '';
        const rowClass = isSystemEvent ? 'system-event-row' : '';

        row.innerHTML = `
            <td class="row-number">${index + 1}</td>
            <td><input type="number" class="table-input play-time" value="${playTime.toFixed(3)}" step="0.001" min="0" required ${readonlyAttr}></td>
            <td><input type="number" class="table-input pause-time" value="${pauseTime.toFixed(3)}" step="0.001" min="0" required ${readonlyAttr}></td>
            <td><input type="number" class="table-input original-start" value="${playOriginalTime.toFixed(3)}" step="0.001" min="0" required ${readonlyAttr}></td>
            <td><input type="number" class="table-input original-end" value="${pauseOriginalTime.toFixed(3)}" step="0.001" min="0" required ${readonlyAttr}></td>
            <td>
                <input type="number" class="table-input duration-input" 
                       value="${duration.toFixed(3)}" 
                       step="0.001" min="0" required>
            </td>
            <td><button type="button" class="delete-row-btn" onclick="window.simpleEditor.advancedEditor.deleteSegmentRow(${index})" ${disabledAttr}>Delete</button></td>
        `;

        if (rowClass) {
            row.className = rowClass;
        }

        tableBody.appendChild(row);
        
        // 자동 조정 이벤트 리스너 추가
        this.setupRowInputListeners(row, index);
    }

    setupRowInputListeners(row, index) {
        const durationInput = row.querySelector('.duration-input');
        const originalStartInput = row.querySelector('.original-start');
        const originalEndInput = row.querySelector('.original-end');
        const playTimeInput = row.querySelector('.play-time');
        
        // Duration 변경 시 Original End와 PAUSE Time 자동 조정
        durationInput.addEventListener('input', () => {
            this.handleDurationChange(row, index);
        });
        
        // Original Start 변경 시 Original End 자동 조정
        originalStartInput.addEventListener('input', () => {
            this.handleOriginalStartChange(row, index);
        });
        
        // PLAY Time 변경 시 PAUSE Time 자동 조정
        playTimeInput.addEventListener('input', () => {
            this.handlePlayTimeChange(row, index);
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
            
            // PAUSE Time도 자동 조정
            const playTimeInput = row.querySelector('.play-time');
            const pauseTimeInput = row.querySelector('.pause-time');
            const playTime = parseFloat(playTimeInput.value);
            
            if (!isNaN(playTime)) {
                const newPauseTime = playTime + duration;
                pauseTimeInput.value = newPauseTime.toFixed(3);
            }
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

    // PLAY Time 변경 시 PAUSE Time 자동 조정
    handlePlayTimeChange(row, index) {
        const autoAdjustToggle = document.getElementById('auto-adjust-toggle');
        if (!autoAdjustToggle || !autoAdjustToggle.checked) return;
        
        const playTimeInput = row.querySelector('.play-time');
        const pauseTimeInput = row.querySelector('.pause-time');
        const durationInput = row.querySelector('.duration-input');
        
        const playTime = parseFloat(playTimeInput.value);
        const duration = parseFloat(durationInput.value);
        
        if (!isNaN(playTime) && !isNaN(duration)) {
            const newPauseTime = playTime + duration;
            pauseTimeInput.value = newPauseTime.toFixed(3);
        }
    }

    addNewTimestampRow() {
        const timestamps = this.timelineRenderer.timestamps;
        const lastTime = timestamps.length > 0 ? 
            timestamps[timestamps.length - 1].reaction_time + 5 : 0;

        // PLAY 타임스탬프 추가
        const playTimestamp = {
            reaction_time: lastTime,
            youtube_time: lastTime,
            relative_youtube_time: lastTime,
            event: 'youtube_play',
            youtube_video_id: 'AbZH7XWDW_k',
            youtube_title: 'Sample Video'
        };

        // PAUSE 타임스탬프 추가
        const pauseTimestamp = {
            reaction_time: lastTime + 2,
            youtube_time: lastTime + 2,
            relative_youtube_time: lastTime + 2,
            event: 'youtube_pause',
            youtube_video_id: 'AbZH7XWDW_k',
            youtube_title: 'Sample Video'
        };

        timestamps.push(playTimestamp, pauseTimestamp);
        this.loadTimestampTable();
    }

    deleteSegmentRow(segmentIndex) {
        const segments = this.getSegmentPairs();
        const segment = segments[segmentIndex];
        
        if (!segment) return;

        // 시스템 이벤트 보호
        if (segment.playTimestamp.event === 'start' || segment.playTimestamp.event === 'end') {
            alert('Cannot delete system events (START/END).');
            return;
        }

        const confirmed = confirm(`Are you sure you want to delete set #${segmentIndex + 1}?`);
        if (!confirmed) return;

        const timestamps = this.timelineRenderer.timestamps;
        
        // PLAY와 PAUSE 타임스탬프 모두 삭제
        timestamps.splice(segment.playIndex, 2);
        
        this.loadTimestampTable();
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
                // 시스템 이벤트 보호
                if (segment.playTimestamp.event === 'start' || segment.playTimestamp.event === 'end') {
                    return; // 시스템 이벤트는 건드리지 않음
                }

                // PLAY 타임스탬프 업데이트
                const playTimestamp = this.timelineRenderer.timestamps[segment.playIndex];
                playTimestamp.reaction_time = playTime;
                playTimestamp.relative_youtube_time = originalStart;
                playTimestamp.youtube_time = originalStart;
                
                // PAUSE 타임스탬프 업데이트
                // Duration을 기준으로 PAUSE Time을 계산
                const calculatedPauseTime = playTime + duration;
                const pauseTimestamp = this.timelineRenderer.timestamps[segment.pauseIndex];
                pauseTimestamp.reaction_time = calculatedPauseTime;
                pauseTimestamp.relative_youtube_time = originalEnd;
                pauseTimestamp.youtube_time = originalEnd;
            }
        });
        
        if (hasError) return;
        
        // 시간순으로 정렬
        this.timelineRenderer.timestamps.sort((a, b) => a.reaction_time - b.reaction_time);
        
        // 타임라인 다시 렌더링
        this.timelineRenderer.renderTimeline();
        
        // 히스토리에 변경사항 추가
        if (window.simpleEditor && window.simpleEditor.getHistoryManager) {
            window.simpleEditor.getHistoryManager().addState(this.timelineRenderer.timestamps);
        }
        
        // 모달 닫기
        this.closeAdvancedEditModal();
        
        alert('All changes saved successfully!');
    }
}
