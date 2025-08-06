// 타임스탬프 에디터 메인 애플리케이션
class TimestampEditor {
    constructor() {
        this.youtubePlayer = null;
        this.reactionVideo = null;
        this.timestampData = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.pixelsPerSecond = 50; // 타임라인 스케일
        this.rippleMode = true; // 연결 이동 모드
        this.selectedBlocks = [];
        this.undoStack = [];
        this.redoStack = [];
        this.syncCheckInterval = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        
        // 고급 편집 기능 초기화
        if (typeof AdvancedEditingFeatures !== 'undefined') {
            this.initAdvancedFeatures();
        }
    }
    
    setupEventListeners() {
        // 파일 로딩
        document.getElementById('load-btn').addEventListener('click', () => this.loadFiles());
        
        // 재생 컨트롤
        document.getElementById('play-pause-btn').addEventListener('click', () => this.togglePlayback());
        document.getElementById('sync-test-btn').addEventListener('click', () => this.testSync());
        
        // 타임라인 컨트롤
        document.getElementById('ripple-toggle').addEventListener('click', () => this.toggleRippleMode());
        document.getElementById('add-timestamp-btn').addEventListener('click', () => this.addTimestamp());
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());
        
        // 내보내기
        document.getElementById('export-btn').addEventListener('click', () => this.exportTimestamp());
        
        // 키보드 단축키
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    async loadFiles() {
        const youtubeUrl = document.getElementById('youtube-url').value;
        const reactionFile = document.getElementById('reaction-video').files[0];
        const reactionUrl = document.getElementById('reaction-url').value;
        const timestampFile = document.getElementById('timestamp-file').files[0];
        
        if (!youtubeUrl) {
            alert('Please enter a YouTube URL.');
            return;
        }
        
        if (!reactionFile && !reactionUrl) {
            alert('Please select a reaction video file or enter a URL.');
            return;
        }
        
        if (!timestampFile) {
            alert('Please select a timestamp file.');
            return;
        }
        
        try {
            // Show loading state
            this.setLoading(true);
            
            // Load timestamp file first
            await this.loadTimestampFile(timestampFile);
            
            // Load YouTube player
            await this.loadYouTubePlayer(youtubeUrl);
            
            // Load reaction video
            if (reactionFile) {
                await this.loadReactionVideo(reactionFile);
            } else if (reactionUrl) {
                await this.loadReactionVideoFromUrl(reactionUrl);
            }
            
            // Render timeline
            this.renderTimeline();
            
            // Start sync check
            this.startSyncCheck();
            
            this.setLoading(false);
            alert('Files loaded successfully.');
            
        } catch (error) {
            console.error('Error loading files:', error);
            alert('Error loading files: ' + error.message);
            this.setLoading(false);
        }
    }
    
    loadYouTubePlayer(url) {
        return new Promise((resolve, reject) => {
            const videoId = this.extractYouTubeVideoId(url);
            if (!videoId) {
                reject(new Error('유효하지 않은 유튜브 URL입니다.'));
                return;
            }
            
            // 기존 플레이어가 있으면 제거
            if (this.youtubePlayer) {
                this.youtubePlayer.destroy();
            }
            
            // YouTube API가 로드되지 않은 경우 대기
            if (!window.YT || !window.YT.Player) {
                setTimeout(() => this.loadYouTubePlayer(url).then(resolve).catch(reject), 1000);
                return;
            }
            
            this.youtubePlayer = new YT.Player('youtube-player', {
                height: '280',
                width: '500',
                videoId: videoId,
                playerVars: {
                    'playsinline': 1,
                    'controls': 1,
                    'rel': 0,
                    'modestbranding': 1
                },
                events: {
                    'onReady': () => {
                        console.log('유튜브 플레이어 준비 완료');
                        resolve();
                    },
                    'onError': (error) => {
                        reject(new Error('유튜브 플레이어 로딩 실패: ' + error.data));
                    }
                }
            });
        });
    }
    
    loadReactionVideo(file) {
        return new Promise((resolve, reject) => {
            const video = document.getElementById('reaction-player');
            const url = URL.createObjectURL(file);
            
            video.src = url;
            video.addEventListener('loadedmetadata', () => {
                this.reactionVideo = video;
                this.duration = video.duration;
                this.setupVideoEvents();
                console.log('리액션 비디오 로드 완료, 길이:', this.duration);
                resolve();
            });
            
            video.addEventListener('error', () => {
                reject(new Error('리액션 비디오 로딩 실패'));
            });
        });
    }
    
    loadReactionVideoFromUrl(url) {
        return new Promise((resolve, reject) => {
            const video = document.getElementById('reaction-player');
            
            // 기존 소스 정리
            video.src = '';
            video.load();
            
            // 새 소스 설정
            video.src = url;
            
            // CORS 설정 (필요한 경우)
            try {
                video.crossOrigin = 'anonymous';
            } catch (e) {
                console.warn('CORS setting failed, continuing without it');
            }
            
            // 로딩 완료 이벤트
            const onLoadedMetadata = () => {
                this.reactionVideo = video;
                this.duration = video.duration;
                this.setupVideoEvents();
                console.log('Reaction video URL loaded successfully, duration:', this.duration);
                
                // 이벤트 리스너 정리
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
                video.removeEventListener('error', onError);
                video.removeEventListener('canplay', onCanPlay);
                
                resolve();
            };
            
            // 오류 이벤트
            const onError = (e) => {
                console.error('Video loading error:', e);
                
                // 이벤트 리스너 정리
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
                video.removeEventListener('error', onError);
                video.removeEventListener('canplay', onCanPlay);
                
                // 다른 방법으로 재시도
                this.tryAlternativeVideoLoad(url, resolve, reject);
            };
            
            // 재생 가능 이벤트 (백업)
            const onCanPlay = () => {
                if (!this.reactionVideo) {
                    this.reactionVideo = video;
                    this.duration = video.duration || 60; // 기본값 설정
                    this.setupVideoEvents();
                    console.log('Reaction video can play, duration:', this.duration);
                    
                    // 이벤트 리스너 정리
                    video.removeEventListener('loadedmetadata', onLoadedMetadata);
                    video.removeEventListener('error', onError);
                    video.removeEventListener('canplay', onCanPlay);
                    
                    resolve();
                }
            };
            
            // 이벤트 리스너 등록
            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onError);
            video.addEventListener('canplay', onCanPlay);
            
            // 타임아웃 설정 (10초)
            setTimeout(() => {
                if (!this.reactionVideo) {
                    video.removeEventListener('loadedmetadata', onLoadedMetadata);
                    video.removeEventListener('error', onError);
                    video.removeEventListener('canplay', onCanPlay);
                    reject(new Error('Video loading timeout'));
                }
            }, 10000);
            
            // 로딩 시작
            video.load();
        });
    }
    
    tryAlternativeVideoLoad(url, resolve, reject) {
        const video = document.getElementById('reaction-player');
        
        // 소스 엘리먼트를 사용한 방법
        video.innerHTML = `<source src="${url}" type="video/mp4">`;
        
        const onLoadedMetadata = () => {
            this.reactionVideo = video;
            this.duration = video.duration || 60;
            this.setupVideoEvents();
            console.log('Alternative video loading successful');
            resolve();
        };
        
        const onError = () => {
            reject(new Error('Failed to load reaction video from URL. Please check the URL or try a different video.'));
        };
        
        video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        video.addEventListener('error', onError, { once: true });
        
        video.load();
    }
    
    loadTimestampFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    this.timestampData = JSON.parse(e.target.result);
                    console.log('타임스탬프 데이터 로드:', this.timestampData);
                    
                    // 데이터 유효성 검사
                    if (!this.timestampData.sync_points || !Array.isArray(this.timestampData.sync_points)) {
                        throw new Error('유효하지 않은 타임스탬프 파일 형식입니다.');
                    }
                    
                    resolve();
                } catch (error) {
                    reject(new Error('타임스탬프 파일 파싱 실패: ' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('파일 읽기 실패'));
            reader.readAsText(file);
        });
    }
    
    setupVideoEvents() {
        if (!this.reactionVideo) return;
        
        this.reactionVideo.addEventListener('timeupdate', () => {
            this.currentTime = this.reactionVideo.currentTime;
            this.updatePlayhead();
            this.updateTimeDisplay();
        });
        
        this.reactionVideo.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
        });
        
        this.reactionVideo.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
        });
        
        this.reactionVideo.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updatePlayButton();
        });
    }
    
    startSyncCheck() {
        if (this.syncCheckInterval) {
            clearInterval(this.syncCheckInterval);
        }
        
        this.syncCheckInterval = setInterval(() => {
            this.handleTimestampEvents();
        }, 100); // 100ms마다 체크
    }
    
    extractYouTubeVideoId(url) {
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }
    
    renderTimeline() {
        if (!this.timestampData || !this.duration) {
            console.log('타임라인 렌더링 조건 미충족:', {
                timestampData: !!this.timestampData,
                duration: this.duration
            });
            return;
        }
        
        console.log('타임라인 렌더링 시작');
        
        // 시간 눈금 렌더링
        this.renderTimeRuler();
        
        // 타임스탬프 블록 렌더링
        this.renderTimestampBlocks();
        
        // 타임라인 크기 조정
        this.adjustTimelineWidth();
        
        // 초기 상태 저장 및 UI 업데이트
        if (this.undoStack.length === 0) {
            this.saveState();
        }
        this.updateUndoRedoButtons();
    }
    
    renderTimeRuler() {
        const ruler = document.querySelector('.time-ruler');
        ruler.innerHTML = '';
        
        const totalWidth = this.duration * this.pixelsPerSecond;
        ruler.style.width = totalWidth + 'px';
        
        // 10초 간격으로 눈금 표시
        for (let i = 0; i <= this.duration; i += 10) {
            const tick = document.createElement('div');
            tick.style.position = 'absolute';
            tick.style.left = (i * this.pixelsPerSecond) + 'px';
            tick.style.top = '0';
            tick.style.width = '1px';
            tick.style.height = '100%';
            tick.style.background = '#bdc3c7';
            
            const label = document.createElement('span');
            label.textContent = this.formatTime(i);
            label.style.position = 'absolute';
            label.style.left = '5px';
            label.style.top = '5px';
            label.style.fontSize = '12px';
            label.style.color = '#7f8c8d';
            
            tick.appendChild(label);
            ruler.appendChild(tick);
        }
    }
    
    renderTimestampBlocks() {
        const container = document.getElementById('timestamp-blocks');
        container.innerHTML = '';
        
        if (!this.timestampData.sync_points) return;
        
        const totalWidth = this.duration * this.pixelsPerSecond;
        container.style.width = totalWidth + 'px';
        container.style.position = 'relative';
        container.style.height = '50px';
        
        this.timestampData.sync_points.forEach((point, index) => {
            const block = this.createTimestampBlock(point, index);
            container.appendChild(block);
        });
        
        console.log('타임스탬프 블록 렌더링 완료:', this.timestampData.sync_points.length, '개');
    }
    
    createTimestampBlock(point, index) {
        const block = document.createElement('div');
        block.className = `timestamp-block ${point.event}`;
        block.dataset.index = index;
        
        const left = point.reaction_time * this.pixelsPerSecond;
        block.style.left = left + 'px';
        
        // 블록 너비 (다음 이벤트까지 또는 최소 너비)
        let width = 60; // 최소 너비 증가
        if (point.event === 'youtube_play' && index < this.timestampData.sync_points.length - 1) {
            const nextPoint = this.timestampData.sync_points[index + 1];
            if (nextPoint.event === 'youtube_pause') {
                width = Math.max(60, (nextPoint.reaction_time - point.reaction_time) * this.pixelsPerSecond);
            }
        }
        block.style.width = width + 'px';
        
        // 블록 내용
        const content = document.createElement('div');
        content.style.padding = '2px';
        content.style.fontSize = '10px';
        content.style.textAlign = 'center';
        content.innerHTML = `
            <div>${point.event === 'youtube_play' ? 'PLAY' : 'PAUSE'}</div>
            <div>${this.formatTime(point.reaction_time)}</div>
        `;
        block.appendChild(content);
        
        // 이벤트 리스너
        this.setupBlockEvents(block);
        
        return block;
    }
    
    setupBlockEvents(block) {
        let isDragging = false;
        let startX = 0;
        let startLeft = 0;
        
        block.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            startX = e.clientX;
            startLeft = parseInt(block.style.left);
            
            // 블록 선택
            this.selectBlock(block, e.ctrlKey);
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const newLeft = Math.max(0, startLeft + deltaX);
            const newTime = newLeft / this.pixelsPerSecond;
            
            // 드래그 중인 블록 이동
            block.style.left = newLeft + 'px';
            
            // 연결 이동 모드일 때 뒤따라오는 블록들도 이동
            if (this.rippleMode) {
                this.moveRippleBlocks(block, deltaX);
            }
        };
        
        const handleMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                this.updateTimestampData();
                this.saveState();
            }
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        // 더블클릭으로 편집
        block.addEventListener('dblclick', () => {
            this.editBlock(block);
        });
    }
    
    selectBlock(block, multiSelect = false) {
        if (!multiSelect) {
            this.selectedBlocks.forEach(b => b.classList.remove('selected'));
            this.selectedBlocks = [];
        }
        
        if (this.selectedBlocks.includes(block)) {
            block.classList.remove('selected');
            this.selectedBlocks = this.selectedBlocks.filter(b => b !== block);
        } else {
            block.classList.add('selected');
            this.selectedBlocks.push(block);
        }
    }
    
    moveRippleBlocks(draggedBlock, deltaX) {
        const draggedIndex = parseInt(draggedBlock.dataset.index);
        const blocks = document.querySelectorAll('.timestamp-block');
        
        blocks.forEach(block => {
            const blockIndex = parseInt(block.dataset.index);
            if (blockIndex > draggedIndex) {
                const currentLeft = parseInt(block.style.left);
                const newLeft = Math.max(0, currentLeft + deltaX);
                block.style.left = newLeft + 'px';
            }
        });
    }
    
    updateTimestampData() {
        const blocks = document.querySelectorAll('.timestamp-block');
        blocks.forEach(block => {
            const index = parseInt(block.dataset.index);
            const left = parseInt(block.style.left);
            const time = left / this.pixelsPerSecond;
            
            if (this.timestampData.sync_points[index]) {
                this.timestampData.sync_points[index].reaction_time = time;
            }
        });
        
        // 시간순으로 정렬
        this.timestampData.sync_points.sort((a, b) => a.reaction_time - b.reaction_time);
        
        // 블록 다시 렌더링
        this.renderTimestampBlocks();
    }
    
    adjustTimelineWidth() {
        const totalWidth = this.duration * this.pixelsPerSecond;
        const tracks = document.querySelectorAll('.track-content');
        tracks.forEach(track => {
            track.style.width = totalWidth + 'px';
        });
    }
    
    updatePlayhead() {
        const playhead = document.getElementById('playhead');
        const left = this.currentTime * this.pixelsPerSecond;
        playhead.style.left = left + 'px';
    }
    
    updateTimeDisplay() {
        document.getElementById('current-time').textContent = this.formatTime(this.currentTime);
        document.getElementById('total-time').textContent = this.formatTime(this.duration);
    }
    
    updatePlayButton() {
        const btn = document.getElementById('play-pause-btn');
        btn.textContent = this.isPlaying ? '일시정지' : '재생';
    }
    
    handleTimestampEvents() {
        if (!this.timestampData || !this.youtubePlayer || !this.isPlaying) return;
        
        // 현재 시간에 해당하는 타임스탬프 이벤트 찾기
        const tolerance = 0.2; // 0.2초 오차 허용
        const currentEvents = this.timestampData.sync_points.filter(point => {
            return Math.abs(point.reaction_time - this.currentTime) < tolerance;
        });
        
        currentEvents.forEach(event => {
            try {
                if (event.event === 'youtube_play') {
                    const youtubeTime = event.youtube_time || event.relative_youtube_time || 0;
                    this.youtubePlayer.seekTo(youtubeTime, true);
                    this.youtubePlayer.playVideo();
                    console.log('YouTube 재생:', youtubeTime);
                } else if (event.event === 'youtube_pause') {
                    this.youtubePlayer.pauseVideo();
                    console.log('YouTube 일시정지');
                }
            } catch (error) {
                console.error('YouTube 플레이어 제어 오류:', error);
            }
        });
    }
    
    togglePlayback() {
        if (!this.reactionVideo) {
            alert('먼저 리액션 영상을 로드해주세요.');
            return;
        }
        
        if (this.isPlaying) {
            this.reactionVideo.pause();
        } else {
            this.reactionVideo.play();
        }
    }
    
    testSync() {
        if (!this.reactionVideo || !this.youtubePlayer) {
            alert('먼저 모든 파일을 로드해주세요.');
            return;
        }
        
        // 처음부터 재생하여 동기화 테스트
        this.reactionVideo.currentTime = 0;
        this.youtubePlayer.seekTo(0, true);
        this.youtubePlayer.pauseVideo();
        this.reactionVideo.play();
    }
    
    toggleRippleMode() {
        this.rippleMode = !this.rippleMode;
        const btn = document.getElementById('ripple-toggle');
        btn.classList.toggle('active', this.rippleMode);
        btn.textContent = this.rippleMode ? 'Linked Move' : 'Individual Move';
    }
    
    addTimestamp() {
        if (!this.timestampData) {
            alert('먼저 타임스탬프 파일을 로드해주세요.');
            return;
        }
        
        const event = prompt('이벤트 타입을 입력하세요 (youtube_play 또는 youtube_pause):', 'youtube_play');
        if (!event || !['youtube_play', 'youtube_pause'].includes(event)) return;
        
        const youtubeTime = parseFloat(prompt('유튜브 시간을 입력하세요 (초):', '0'));
        if (isNaN(youtubeTime)) return;
        
        const newPoint = {
            event: event,
            reaction_time: this.currentTime,
            youtube_time: youtubeTime
        };
        
        this.timestampData.sync_points.push(newPoint);
        this.timestampData.sync_points.sort((a, b) => a.reaction_time - b.reaction_time);
        
        this.renderTimestampBlocks();
        this.saveState();
    }
    
    editBlock(block) {
        const index = parseInt(block.dataset.index);
        const point = this.timestampData.sync_points[index];
        
        const newTime = parseFloat(prompt('리액션 시간을 입력하세요 (초):', point.reaction_time.toFixed(2)));
        if (isNaN(newTime)) return;
        
        const newYoutubeTime = parseFloat(prompt('유튜브 시간을 입력하세요 (초):', point.youtube_time || point.relative_youtube_time || 0));
        if (isNaN(newYoutubeTime)) return;
        
        point.reaction_time = newTime;
        point.youtube_time = newYoutubeTime;
        
        this.renderTimestampBlocks();
        this.saveState();
    }
    
    saveState() {
        if (!this.timestampData) return;
        
        const currentState = JSON.stringify(this.timestampData);
        
        // 현재 상태가 마지막 저장된 상태와 다른 경우에만 저장
        if (this.undoStack.length === 0 || this.undoStack[this.undoStack.length - 1] !== currentState) {
            this.undoStack.push(currentState);
            
            // 스택 크기 제한 (최대 50개)
            if (this.undoStack.length > 50) {
                this.undoStack.shift();
            }
            
            // 새로운 상태 저장 시 redo 스택 초기화
            this.redoStack = [];
            
            this.updateUndoRedoButtons();
            console.log('상태 저장됨. Undo 스택 크기:', this.undoStack.length);
        }
    }
    
    undo() {
        if (this.undoStack.length <= 1) {
            console.log('되돌릴 상태가 없습니다.');
            return;
        }
        
        // 현재 상태를 redo 스택에 저장
        const currentState = this.undoStack.pop();
        this.redoStack.push(currentState);
        
        // 이전 상태로 복원
        const previousState = this.undoStack[this.undoStack.length - 1];
        this.timestampData = JSON.parse(previousState);
        
        this.renderTimestampBlocks();
        this.updateUndoRedoButtons();
        
        console.log('되돌리기 실행. Undo 스택:', this.undoStack.length, 'Redo 스택:', this.redoStack.length);
    }
    
    redo() {
        if (this.redoStack.length === 0) {
            console.log('다시 실행할 상태가 없습니다.');
            return;
        }
        
        // redo 스택에서 상태 가져와서 적용
        const nextState = this.redoStack.pop();
        this.undoStack.push(nextState);
        this.timestampData = JSON.parse(nextState);
        
        this.renderTimestampBlocks();
        this.updateUndoRedoButtons();
        
        console.log('다시 실행. Undo 스택:', this.undoStack.length, 'Redo 스택:', this.redoStack.length);
    }
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length <= 1;
            undoBtn.textContent = `Undo (${Math.max(0, this.undoStack.length - 1)})`;
        }
        
        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
            redoBtn.textContent = `Redo (${this.redoStack.length})`;
        }
    }
    
    clearHistory() {
        this.undoStack = [];
        this.redoStack = [];
        this.updateUndoRedoButtons();
        console.log('편집 히스토리 초기화');
    }
    
    exportTimestamp() {
        if (!this.timestampData) {
            alert('타임스탬프 데이터가 없습니다.');
            return;
        }
        
        // 내보내기 형식 선택
        const format = prompt('내보내기 형식을 선택하세요:\n1. JSON (기본)\n2. CSV\n3. TXT (간단한 텍스트)', '1');
        
        let dataStr, fileName, mimeType;
        
        switch(format) {
            case '2': // CSV
                dataStr = this.exportToCSV();
                fileName = 'edited_timestamp.csv';
                mimeType = 'text/csv';
                break;
            case '3': // TXT
                dataStr = this.exportToTXT();
                fileName = 'edited_timestamp.txt';
                mimeType = 'text/plain';
                break;
            default: // JSON
                dataStr = JSON.stringify(this.timestampData, null, 2);
                fileName = 'edited_timestamp.json';
                mimeType = 'application/json';
                break;
        }
        
        const dataBlob = new Blob([dataStr], {type: mimeType});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = fileName;
        link.click();
        
        // 내보내기 통계 표시
        this.showExportStats();
        
        alert(`타임스탬프 파일이 ${fileName}으로 다운로드되었습니다.`);
    }
    
    exportToCSV() {
        const headers = ['Event Type', 'Reaction Time (s)', 'YouTube Time (s)', 'Duration (s)'];
        const rows = [headers.join(',')];
        
        this.timestampData.sync_points.forEach(point => {
            const row = [
                point.event,
                point.reaction_time.toFixed(2),
                (point.youtube_time || 0).toFixed(2),
                (point.duration || 0).toFixed(2)
            ];
            rows.push(row.join(','));
        });
        
        return rows.join('\n');
    }
    
    exportToTXT() {
        const lines = ['타임스탬프 편집 결과', '=' * 30, ''];
        
        this.timestampData.sync_points.forEach((point, index) => {
            lines.push(`${index + 1}. ${point.event}`);
            lines.push(`   리액션 시간: ${this.formatTime(point.reaction_time)}`);
            lines.push(`   유튜브 시간: ${this.formatTime(point.youtube_time || 0)}`);
            if (point.duration) {
                lines.push(`   지속 시간: ${this.formatTime(point.duration)}`);
            }
            lines.push('');
        });
        
        lines.push(`총 ${this.timestampData.sync_points.length}개의 타임스탬프`);
        lines.push(`편집 완료 시간: ${new Date().toLocaleString()}`);
        
        return lines.join('\n');
    }
    
    showExportStats() {
        const stats = this.calculateStats();
        const statsText = `
편집 통계:
- 총 타임스탬프 개수: ${stats.totalCount}개
- PLAY 이벤트: ${stats.playCount}개
- PAUSE 이벤트: ${stats.pauseCount}개
- 총 편집 시간: ${this.formatTime(stats.totalDuration)}
- 평균 간격: ${this.formatTime(stats.averageInterval)}
        `.trim();
        
        console.log(statsText);
        
        // 통계를 화면에 표시 (선택사항)
        if (confirm('편집 통계를 확인하시겠습니까?')) {
            alert(statsText);
        }
    }
    
    calculateStats() {
        const points = this.timestampData.sync_points;
        const playCount = points.filter(p => p.event === 'youtube_play').length;
        const pauseCount = points.filter(p => p.event === 'youtube_pause').length;
        
        let totalDuration = 0;
        let totalInterval = 0;
        
        if (points.length > 0) {
            totalDuration = Math.max(...points.map(p => p.reaction_time));
            
            if (points.length > 1) {
                for (let i = 1; i < points.length; i++) {
                    totalInterval += points[i].reaction_time - points[i-1].reaction_time;
                }
            }
        }
        
        return {
            totalCount: points.length,
            playCount,
            pauseCount,
            totalDuration,
            averageInterval: points.length > 1 ? totalInterval / (points.length - 1) : 0
        };
    }
    
    addTimestamp() {
        if (!this.timestampData) {
            this.timestampData = { sync_points: [] };
        }
        
        const eventType = prompt('이벤트 타입을 선택하세요 (youtube_play/youtube_pause):', 'youtube_play');
        if (!eventType) return;
        
        const reactionTime = parseFloat(prompt('리액션 시간 (초):', this.currentTime || 0));
        if (isNaN(reactionTime)) return;
        
        const youtubeTime = parseFloat(prompt('유튜브 시간 (초):', this.currentTime || 0));
        if (isNaN(youtubeTime)) return;
        
        const newTimestamp = {
            event: eventType,
            reaction_time: reactionTime,
            youtube_time: youtubeTime
        };
        
        this.timestampData.sync_points.push(newTimestamp);
        this.timestampData.sync_points.sort((a, b) => a.reaction_time - b.reaction_time);
        
        this.renderTimestampBlocks();
        this.saveState();
        
        console.log('새 타임스탬프 추가:', newTimestamp);
    }
    
    editBlock(block) {
        const index = parseInt(block.dataset.index);
        const timestamp = this.timestampData.sync_points[index];
        
        if (!timestamp) return;
        
        const newEvent = prompt('이벤트 타입 (youtube_play/youtube_pause):', timestamp.event);
        if (newEvent === null) return;
        
        const newReactionTime = parseFloat(prompt('리액션 시간 (초):', timestamp.reaction_time));
        if (isNaN(newReactionTime)) return;
        
        const newYoutubeTime = parseFloat(prompt('유튜브 시간 (초):', timestamp.youtube_time || 0));
        if (isNaN(newYoutubeTime)) return;
        
        timestamp.event = newEvent;
        timestamp.reaction_time = newReactionTime;
        timestamp.youtube_time = newYoutubeTime;
        
        this.renderTimestampBlocks();
        this.saveState();
        
        console.log('블록 편집 완료:', timestamp);
    }
    
    resizeSelectedBlocks() {
        if (this.selectedBlocks.length === 0) {
            alert('크기를 조절할 블록을 선택해주세요.');
            return;
        }
        
        const newWidth = parseFloat(prompt('블록 너비 (초):', '1'));
        if (isNaN(newWidth) || newWidth <= 0) return;
        
        this.selectedBlocks.forEach(block => {
            const index = parseInt(block.dataset.index);
            const timestamp = this.timestampData.sync_points[index];
            
            if (timestamp) {
                // 블록 너비 조절
                const pixelWidth = Math.max(20, newWidth * this.pixelsPerSecond);
                block.style.width = pixelWidth + 'px';
                
                // 데이터에 duration 속성 추가
                timestamp.duration = newWidth;
            }
        });
        
        this.saveState();
        console.log(`${this.selectedBlocks.length}개 블록 크기 조절`);
    }
    
    
    handleKeyboard(e) {
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            this.undo();
        } else if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            this.redo();
        } else if (e.key === ' ') {
            e.preventDefault();
            this.togglePlayback();
        } else if (e.key === 'Delete') {
            e.preventDefault();
            this.deleteSelectedBlocks();
        } else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            this.resizeSelectedBlocks();
        }
    }
    
    deleteSelectedBlocks() {
        if (this.selectedBlocks.length === 0) return;
        
        const indices = this.selectedBlocks.map(block => parseInt(block.dataset.index));
        indices.sort((a, b) => b - a); // 역순으로 정렬하여 인덱스 변화 방지
        
        indices.forEach(index => {
            this.timestampData.sync_points.splice(index, 1);
        });
        
        this.selectedBlocks = [];
        this.renderTimestampBlocks();
        this.saveState();
    }
    
    setLoading(loading) {
        const container = document.querySelector('.container');
        const loadBtn = document.getElementById('load-btn');
        
        if (loading) {
            container.classList.add('loading');
            loadBtn.disabled = true;
            loadBtn.textContent = '로딩 중...';
        } else {
            container.classList.remove('loading');
            loadBtn.disabled = false;
            loadBtn.textContent = '로드';
        }
    }
    
    updateUI() {
        // 초기 UI 상태 업데이트
        this.updatePlayButton();
        this.updateTimeDisplay();
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

// YouTube IFrame API 준비 완료 시 앱 초기화
let app;
function onYouTubeIframeAPIReady() {
    console.log('YouTube API 준비 완료');
    app = new TimestampEditor();
}

// YouTube API가 이미 로드된 경우를 위한 대비
if (window.YT && window.YT.Player) {
    app = new TimestampEditor();
} else {
    // DOM이 로드된 후 앱 초기화 (YouTube API 없이도 기본 기능 사용 가능)
    document.addEventListener('DOMContentLoaded', () => {
        if (!app) {
            app = new TimestampEditor();
        }
    });
}

