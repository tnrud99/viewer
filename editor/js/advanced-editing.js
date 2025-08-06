// 고급 편집 기능 모듈
class AdvancedEditingFeatures {
    constructor(editor) {
        this.editor = editor;
        this.setupAdvancedFeatures();
    }
    
    setupAdvancedFeatures() {
        this.setupGlobalDragAndDrop();
        this.setupKeyboardShortcuts();
        this.setupContextMenu();
    }
    
    // 전체 이동 기능
    moveAllBlocks(deltaTime) {
        if (!this.editor.timestampData || !this.editor.timestampData.sync_points) return;
        
        this.editor.timestampData.sync_points.forEach(point => {
            point.reaction_time = Math.max(0, point.reaction_time + deltaTime);
        });
        
        this.editor.renderTimestampBlocks();
        this.editor.saveState();
        
        console.log(`모든 블록을 ${deltaTime}초만큼 이동`);
    }
    
    // 선택된 블록들을 한 번에 이동
    moveSelectedBlocks(deltaTime) {
        if (this.editor.selectedBlocks.length === 0) return;
        
        const indices = this.editor.selectedBlocks.map(block => parseInt(block.dataset.index));
        
        indices.forEach(index => {
            if (this.editor.timestampData.sync_points[index]) {
                this.editor.timestampData.sync_points[index].reaction_time = 
                    Math.max(0, this.editor.timestampData.sync_points[index].reaction_time + deltaTime);
            }
        });
        
        // 연결 이동 모드일 때 뒤따라오는 블록들도 이동
        if (this.editor.rippleMode && indices.length === 1) {
            const draggedIndex = indices[0];
            this.editor.timestampData.sync_points.forEach((point, index) => {
                if (index > draggedIndex) {
                    point.reaction_time = Math.max(0, point.reaction_time + deltaTime);
                }
            });
        }
        
        this.editor.renderTimestampBlocks();
        this.editor.saveState();
        
        console.log(`선택된 블록들을 ${deltaTime}초만큼 이동`);
    }
    
    // 정밀한 시간 입력으로 이동
    moveBlocksWithPrecision() {
        if (this.editor.selectedBlocks.length === 0) {
            alert('먼저 이동할 블록을 선택해주세요.');
            return;
        }
        
        const deltaTime = parseFloat(prompt('이동할 시간을 입력하세요 (초, 음수는 왼쪽 이동):', '0'));
        if (isNaN(deltaTime)) return;
        
        this.moveSelectedBlocks(deltaTime);
    }
    
    // 전체 블록 정밀 이동
    moveAllBlocksWithPrecision() {
        const deltaTime = parseFloat(prompt('모든 블록을 이동할 시간을 입력하세요 (초, 음수는 왼쪽 이동):', '0'));
        if (isNaN(deltaTime)) return;
        
        this.moveAllBlocks(deltaTime);
    }
    
    // 블록 복제
    duplicateSelectedBlocks() {
        if (this.editor.selectedBlocks.length === 0) {
            alert('먼저 복제할 블록을 선택해주세요.');
            return;
        }
        
        const indices = this.editor.selectedBlocks.map(block => parseInt(block.dataset.index));
        const newBlocks = [];
        
        indices.forEach(index => {
            const originalBlock = this.editor.timestampData.sync_points[index];
            const duplicatedBlock = {
                ...originalBlock,
                reaction_time: originalBlock.reaction_time + 5 // 5초 뒤에 복제
            };
            newBlocks.push(duplicatedBlock);
        });
        
        this.editor.timestampData.sync_points.push(...newBlocks);
        this.editor.timestampData.sync_points.sort((a, b) => a.reaction_time - b.reaction_time);
        
        this.editor.renderTimestampBlocks();
        this.editor.saveState();
        
        console.log(`${indices.length}개 블록 복제 완료`);
    }
    
    // 블록 사이 간격 조정
    adjustBlockSpacing() {
        if (!this.editor.timestampData || this.editor.timestampData.sync_points.length < 2) {
            alert('최소 2개 이상의 블록이 필요합니다.');
            return;
        }
        
        const spacing = parseFloat(prompt('블록 사이 간격을 입력하세요 (초):', '1'));
        if (isNaN(spacing) || spacing < 0) return;
        
        const sortedBlocks = [...this.editor.timestampData.sync_points].sort((a, b) => a.reaction_time - b.reaction_time);
        
        for (let i = 1; i < sortedBlocks.length; i++) {
            sortedBlocks[i].reaction_time = sortedBlocks[i-1].reaction_time + spacing;
        }
        
        this.editor.timestampData.sync_points = sortedBlocks;
        this.editor.renderTimestampBlocks();
        this.editor.saveState();
        
        console.log(`블록 간격을 ${spacing}초로 조정`);
    }
    
    // 블록 정렬 (시간순)
    sortBlocksByTime() {
        if (!this.editor.timestampData) return;
        
        this.editor.timestampData.sync_points.sort((a, b) => a.reaction_time - b.reaction_time);
        this.editor.renderTimestampBlocks();
        this.editor.saveState();
        
        console.log('블록을 시간순으로 정렬');
    }
    
    // 선택된 블록들의 시간 정보 표시
    showSelectedBlocksInfo() {
        if (this.editor.selectedBlocks.length === 0) {
            alert('선택된 블록이 없습니다.');
            return;
        }
        
        const indices = this.editor.selectedBlocks.map(block => parseInt(block.dataset.index));
        const info = indices.map(index => {
            const block = this.editor.timestampData.sync_points[index];
            return `${block.event}: ${this.editor.formatTime(block.reaction_time)} → ${this.editor.formatTime(block.youtube_time || 0)}`;
        }).join('\n');
        
        alert(`선택된 블록 정보:\n${info}`);
    }
    
    // 글로벌 드래그 앤 드롭 설정
    setupGlobalDragAndDrop() {
        let isDragging = false;
        let dragStartX = 0;
        let dragStartTime = 0;
        
        document.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('timestamp-block')) {
                isDragging = true;
                dragStartX = e.clientX;
                dragStartTime = this.editor.currentTime;
                
                // 다중 선택 지원
                if (!e.ctrlKey && !this.editor.selectedBlocks.includes(e.target)) {
                    this.editor.selectedBlocks.forEach(block => block.classList.remove('selected'));
                    this.editor.selectedBlocks = [];
                }
                
                if (!this.editor.selectedBlocks.includes(e.target)) {
                    e.target.classList.add('selected');
                    this.editor.selectedBlocks.push(e.target);
                }
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging && this.editor.selectedBlocks.length > 0) {
                const deltaX = e.clientX - dragStartX;
                const deltaTime = deltaX / this.editor.pixelsPerSecond;
                
                this.editor.selectedBlocks.forEach(block => {
                    const index = parseInt(block.dataset.index);
                    const originalTime = this.editor.timestampData.sync_points[index].reaction_time;
                    const newTime = Math.max(0, originalTime + deltaTime);
                    
                    const newLeft = newTime * this.editor.pixelsPerSecond;
                    block.style.left = newLeft + 'px';
                });
                
                // 연결 이동 모드 처리
                if (this.editor.rippleMode && this.editor.selectedBlocks.length === 1) {
                    const draggedIndex = parseInt(this.editor.selectedBlocks[0].dataset.index);
                    this.editor.moveRippleBlocks(this.editor.selectedBlocks[0], deltaX);
                }
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.editor.updateTimestampData();
                this.editor.saveState();
            }
        });
    }
    
    // 키보드 단축키 설정
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl + A: 모든 블록 선택
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                this.selectAllBlocks();
            }
            
            // Ctrl + D: 선택된 블록 복제
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                this.duplicateSelectedBlocks();
            }
            
            // Ctrl + M: 정밀 이동
            if (e.ctrlKey && e.key === 'm') {
                e.preventDefault();
                this.moveBlocksWithPrecision();
            }
            
            // Ctrl + Shift + M: 전체 이동
            if (e.ctrlKey && e.shiftKey && e.key === 'M') {
                e.preventDefault();
                this.moveAllBlocksWithPrecision();
            }
            
            // R: 블록 크기 조절
            if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                this.editor.resizeSelectedBlocks();
            }
            
            // 방향키로 미세 조정
            if (this.editor.selectedBlocks.length > 0) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.moveSelectedBlocks(-0.1); // 0.1초 왼쪽
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.moveSelectedBlocks(0.1); // 0.1초 오른쪽
                }
            }
            
            // I: 블록 정보 표시
            if (e.key === 'i' || e.key === 'I') {
                this.showSelectedBlocksInfo();
            }
        });
    }
    
    // 컨텍스트 메뉴 설정
    setupContextMenu() {
        const timelineContainer = document.querySelector('.timeline-container');
        
        timelineContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY, e.target);
        });
    }
    
    // 컨텍스트 메뉴 표시
    showContextMenu(x, y, target) {
        // 기존 메뉴 제거
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.position = 'fixed';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.background = 'white';
        menu.style.border = '1px solid #ccc';
        menu.style.borderRadius = '4px';
        menu.style.padding = '5px 0';
        menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        menu.style.zIndex = '1000';
        
        const menuItems = [];
        
        if (target.classList.contains('timestamp-block')) {
            menuItems.push(
                { text: '블록 편집', action: () => this.editor.editBlock(target) },
                { text: '블록 복제', action: () => this.duplicateSelectedBlocks() },
                { text: '블록 크기 조절', action: () => this.editor.resizeSelectedBlocks() },
                { text: '블록 삭제', action: () => this.editor.deleteSelectedBlocks() },
                { text: '정밀 이동', action: () => this.moveBlocksWithPrecision() },
                { text: '블록 정보', action: () => this.showSelectedBlocksInfo() }
            );
        } else {
            menuItems.push(
                { text: '타임스탬프 추가', action: () => this.editor.addTimestamp() },
                { text: '모든 블록 선택', action: () => this.selectAllBlocks() },
                { text: '전체 이동', action: () => this.moveAllBlocksWithPrecision() },
                { text: '간격 조정', action: () => this.adjustBlockSpacing() },
                { text: '시간순 정렬', action: () => this.sortBlocksByTime() }
            );
        }
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.textContent = item.text;
            menuItem.style.padding = '8px 15px';
            menuItem.style.cursor = 'pointer';
            menuItem.style.fontSize = '14px';
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.background = '#f0f0f0';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.background = 'white';
            });
            
            menuItem.addEventListener('click', () => {
                item.action();
                menu.remove();
            });
            
            menu.appendChild(menuItem);
        });
        
        document.body.appendChild(menu);
        
        // 메뉴 외부 클릭 시 닫기
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            });
        }, 100);
    }
    
    // 모든 블록 선택
    selectAllBlocks() {
        this.editor.selectedBlocks.forEach(block => block.classList.remove('selected'));
        this.editor.selectedBlocks = [];
        
        const blocks = document.querySelectorAll('.timestamp-block');
        blocks.forEach(block => {
            block.classList.add('selected');
            this.editor.selectedBlocks.push(block);
        });
        
        console.log(`${blocks.length}개 블록 모두 선택`);
    }
}

// 에디터에 고급 기능 추가
if (typeof TimestampEditor !== 'undefined') {
    TimestampEditor.prototype.initAdvancedFeatures = function() {
        this.advancedFeatures = new AdvancedEditingFeatures(this);
    };
}

