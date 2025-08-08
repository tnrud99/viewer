// 타임스탬프 에디터 메인 애플리케이션
class TimestampEditor {
    constructor() {
        this.youtubePlayer = null;
        this.reactionVideo = null;
        this.timestampData = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.pixelsPerSecond = 10; // 최대 축소 상태를 기본값으로 설정
        this.rippleMode = true; // 연결 이동 모드
        this.selectedBlocks = [];
        this.undoStack = [];
        this.redoStack = [];
        this.syncCheckInterval = null;
        this.autoSync = true; // 자동 동기화 모드 (기본값)
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        
        // 고급 편집 기능 초기화
        if (typeof AdvancedEditingFeatures !== 'undefined') {
            this.initAdvancedFeatures();
        }
        
        // 타임라인 컨트롤 초기화
        if (typeof TimelineControls !== 'undefined') {
            this.initTimelineControls();
        }
        
        // 동기화 인터벌 설정
        this.setupSyncInterval();
    }
    
    // 🔧 누락된 초기화 메서드 구현
    initTimelineControls() {
        console.log('타임라인 컨트롤 초기화 중...');
        this.timelineControls = new TimelineControls(this);
        console.log('타임라인 컨트롤 초기화 완료');
    }
    
    initAdvancedFeatures() {
        console.log('고급 편집 기능 초기화 중...');
        this.advancedFeatures = new AdvancedEditingFeatures(this);
        console.log('고급 편집 기능 초기화 완료');
    }
    
    // 🔧 동기화 인터벌 설정
    setupSyncInterval() {
        // 정기적으로 타임스탬프 이벤트 체크 (100ms마다)
        this.syncCheckInterval = setInterval(() => {
            if (this.isPlaying) {
                this.handleTimestampEvents();
            }
        }, 100);
        
        console.log('동기화 인터벌 설정 완료');
    }
    
    setupEventListeners() {
        // 파일 로딩
        document.getElementById('load-btn').addEventListener('click', () => this.loadFiles());
        
        // 파일 업로드 관련 이벤트 리스너 제거
        
        // 재생 컨트롤
        document.getElementById('play-pause-btn').addEventListener('click', () => this.togglePlayback());
        
        // Resync 버튼 이벤트 리스너 추가
        const resyncBtn = document.getElementById('resync-btn');
        if (resyncBtn) {
            resyncBtn.addEventListener('click', () => this.resyncYouTubeVideo());
        }
        
        // 타임라인 컨트롤
        document.getElementById('ripple-toggle').addEventListener('click', () => this.toggleRippleMode());
        document.getElementById('add-timestamp-btn').addEventListener('click', () => this.addTimestamp());
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());
        
        // 🔧 줌 컨트롤 이벤트 리스너 추가 (TimelineControls 초기화 전 백업)
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                if (this.timelineControls) {
                    this.timelineControls.zoomIn();
                } else {
                    // 백업 줌인 로직
                    this.pixelsPerSecond = Math.min(200, this.pixelsPerSecond * 1.2);
                    this.renderTimeline();
                    console.log('줌인:', this.pixelsPerSecond);
                }
            });
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                if (this.timelineControls) {
                    this.timelineControls.zoomOut();
                } else {
                    // 백업 줌아웃 로직
                    this.pixelsPerSecond = Math.max(5, this.pixelsPerSecond / 1.2);
                    this.renderTimeline();
                    console.log('줌아웃:', this.pixelsPerSecond);
                }
            });
        }
        
        // 내보내기
        document.getElementById('export-btn').addEventListener('click', () => this.exportTimestamp());
        
        // 키보드 단축키
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    async loadFiles() {
        const youtubeUrl = document.getElementById('youtube-url').value;
        const reactionUrl = document.getElementById('reaction-url').value;
        const timestampFile = document.getElementById('timestamp-file').files[0];
        
        console.log('Loading files with:', {
            youtubeUrl,
            reactionUrl,
            timestampFile: timestampFile ? timestampFile.name : 'none'
        });
        
        if (!youtubeUrl) {
            alert('Please enter a YouTube URL.');
            return;
        }
        
        if (!reactionUrl) {
            alert('Please enter a reaction video URL.');
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
            console.log('Loading timestamp file...');
            await this.loadTimestampFile(timestampFile);
            
            // Load YouTube player
            console.log('Loading YouTube player...');
            await this.loadYouTubePlayer(youtubeUrl);
            
            // Load reaction video from URL
            console.log('Loading reaction video from URL...');
            await this.loadReactionVideoFromUrl(reactionUrl);
            
            // Render timeline
            console.log('Rendering timeline...');
            this.renderTimeline();
            
            // Start sync check
            this.startSyncCheck();
            
            this.setLoading(false);
            console.log('All files loaded successfully');
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
                        this.setupOriginalVideoEvents();
                        resolve();
                    },
                    'onError': (error) => {
                        reject(new Error('유튜브 플레이어 로딩 실패: ' + error.data));
                    }
                }
            });
        });
    }
    
    setupOriginalVideoEvents() {
        if (!this.youtubePlayer) return;
        
        // Original video의 상태 변경을 주기적으로 체크
        setInterval(() => {
            if (this.youtubePlayer && this.youtubePlayer.getPlayerState) {
                const state = this.youtubePlayer.getPlayerState();
                
                // Original video가 멈추면 Reaction video도 멈춤
                if (state === 2 && this.isPlaying) { // 2 = paused
                    this.syncReactionVideoPause();
                }
            }
        }, 100);
    }
    
    syncReactionVideoPause() {
        if (!this.autoSync) return; // 자동 동기화가 꺼져있으면 무시
        
        if (this.reactionPlayer && this.reactionPlayer.pauseVideo) {
            try {
                this.reactionPlayer.pauseVideo();
                this.isPlaying = false;
                this.updatePlayButton();
                console.log('Reaction video paused due to original video pause');
            } catch (error) {
                console.error('Failed to pause reaction video:', error);
            }
        } else if (this.reactionVideo && this.reactionVideo.pause) {
            try {
                this.reactionVideo.pause();
                this.isPlaying = false;
                this.updatePlayButton();
                console.log('Reaction video paused due to original video pause');
            } catch (error) {
                console.error('Failed to pause reaction video:', error);
            }
        }
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
            const videoId = this.extractYouTubeVideoId(url);
            if (!videoId) {
                reject(new Error('유효하지 않은 YouTube URL입니다.'));
                return;
            }
            
            console.log('Loading reaction video from YouTube URL:', url, 'Video ID:', videoId);
            
            // 기존 플레이어가 있으면 제거
            if (this.reactionPlayer) {
                this.reactionPlayer.destroy();
            }
            
            // YouTube API가 로드되지 않은 경우 대기
            if (!window.YT || !window.YT.Player) {
                setTimeout(() => this.loadReactionVideoFromUrl(url).then(resolve).catch(reject), 1000);
                return;
            }
            
            this.reactionPlayer = new YT.Player('reaction-player', {
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
                        console.log('리액션 YouTube 플레이어 준비 완료');
                        this.reactionVideo = this.reactionPlayer;
                        this.duration = this.reactionPlayer.getDuration();
                        this.setupVideoEvents();
                        resolve();
                    },
                    'onError': (error) => {
                        reject(new Error('리액션 YouTube 플레이어 로딩 실패: ' + error.data));
                    }
                }
            });
        });
    }
    
    // YouTube iframe API 사용으로 변경되어 복잡한 대체 로딩 메서드들 제거
    
    // 복잡한 대체 로딩 메서드들 제거 - 간단한 방식으로 변경
    
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
        
        // YouTube iframe API의 경우 다른 방식으로 이벤트 처리
        if (this.reactionPlayer) {
            // YouTube 플레이어의 상태 변경을 주기적으로 체크
            setInterval(() => {
                if (this.reactionPlayer && this.reactionPlayer.getPlayerState) {
                    const state = this.reactionPlayer.getPlayerState();
                    const currentTime = this.reactionPlayer.getCurrentTime();
                    
                    this.currentTime = currentTime;
                    this.updatePlayhead();
                    this.updateTimeDisplay();
                    
                    // 재생 상태 업데이트
                    if (state === 1 && !this.isPlaying) {
                        this.isPlaying = true;
                        this.updatePlayButton();
                    } else if ((state === 2 || state === 0) && this.isPlaying) {
                        this.isPlaying = false;
                        this.updatePlayButton();
                        
                        // Reaction video가 멈추면 Original video도 멈춤
                        this.syncOriginalVideoPause();
                    }
                }
            }, 100);
        } else {
            // 일반 HTML5 비디오 엘리먼트
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
                
                // Reaction video가 멈추면 Original video도 멈춤
                this.syncOriginalVideoPause();
            });
            
            this.reactionVideo.addEventListener('ended', () => {
                this.isPlaying = false;
                this.updatePlayButton();
                
                // Reaction video가 끝나면 Original video도 멈춤
                this.syncOriginalVideoPause();
            });
        }
    }
    
    syncOriginalVideoPause() {
        if (!this.autoSync) return; // 자동 동기화가 꺼져있으면 무시
        
        if (this.youtubePlayer && this.youtubePlayer.pauseVideo) {
            try {
                this.youtubePlayer.pauseVideo();
                console.log('Original video paused due to reaction video pause');
            } catch (error) {
                console.error('Failed to pause original video:', error);
            }
        }
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
        
        // play-pause 쌍으로 블록 생성
        this.createPlayPauseBlocks(container);
        
        console.log('타임스탬프 블록 렌더링 완료:', this.timestampData.sync_points.length, '개');
    }
    
    createPlayPauseBlocks(container) {
        const points = this.timestampData.sync_points;
        
        for (let i = 0; i < points.length; i++) {
            const currentPoint = points[i];
            
            if (currentPoint.event === 'youtube_play') {
                // play 이벤트를 찾았으면 다음 pause 이벤트를 찾아서 쌍으로 만듦
                const nextPauseIndex = points.findIndex((p, idx) => 
                    idx > i && p.event === 'youtube_pause'
                );
                
                if (nextPauseIndex !== -1) {
                    const pausePoint = points[nextPauseIndex];
                    const block = this.createPlayPauseBlock(currentPoint, pausePoint, i, nextPauseIndex);
                    container.appendChild(block);
                } else {
                    // pause가 없으면 play만으로 블록 생성
                    const block = this.createTimestampBlock(currentPoint, i);
                    container.appendChild(block);
                }
            } else if (currentPoint.event === 'youtube_pause' && i === 0) {
                // 첫 번째 pause는 조정 불가능한 표시용 블록
                const block = this.createStaticPauseBlock(currentPoint, i);
                container.appendChild(block);
            }
        }
    }
    
    createPlayPauseBlock(playPoint, pausePoint, playIndex, pauseIndex) {
        const block = document.createElement('div');
        block.className = 'timestamp-block play-pause-block';
        block.dataset.playIndex = playIndex;
        block.dataset.pauseIndex = pauseIndex;
        block.dataset.startTime = playPoint.reaction_time;
        block.dataset.endTime = pausePoint.reaction_time;
        
        const left = playPoint.reaction_time * this.pixelsPerSecond;
        const width = (pausePoint.reaction_time - playPoint.reaction_time) * this.pixelsPerSecond;
        
        block.style.left = left + 'px';
        block.style.width = Math.max(60, width) + 'px';
        
        // 블록 내용
        const content = document.createElement('div');
        content.style.padding = '2px';
        content.style.fontSize = '10px';
        content.style.textAlign = 'center';
        content.innerHTML = `
            <div>PLAY-PAUSE</div>
            <div>${this.formatTime(playPoint.reaction_time)} - ${this.formatTime(pausePoint.reaction_time)}</div>
        `;
        block.appendChild(content);
        
        // 이벤트 리스너
        this.setupPlayPauseBlockEvents(block);
        
        return block;
    }
    
    createStaticPauseBlock(pausePoint, index) {
        const block = document.createElement('div');
        block.className = 'timestamp-block static-pause-block';
        block.dataset.index = index;
        block.dataset.static = 'true';
        
        const left = pausePoint.reaction_time * this.pixelsPerSecond;
        block.style.left = left + 'px';
        block.style.width = '60px';
        
        // 블록 내용
        const content = document.createElement('div');
        content.style.padding = '2px';
        content.style.fontSize = '10px';
        content.style.textAlign = 'center';
        content.innerHTML = `
            <div>INITIAL PAUSE</div>
            <div>${this.formatTime(pausePoint.reaction_time)}</div>
        `;
        block.appendChild(content);
        
        // 정적 블록이므로 드래그 이벤트 없음
        block.style.cursor = 'default';
        
        return block;
    }
    
    setupPlayPauseBlockEvents(block) {
        let isDragging = false;
        let startX = 0;
        let startLeft = 0;
        let startWidth = 0;
        
        block.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            startX = e.clientX;
            startLeft = parseInt(block.style.left);
            startWidth = parseInt(block.style.width);
            
            // 블록 선택
            this.selectBlock(block, e.ctrlKey);
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const newLeft = Math.max(0, startLeft + deltaX);
            const newStartTime = newLeft / this.pixelsPerSecond;
            const newEndTime = (newLeft + startWidth) / this.pixelsPerSecond;
            
            // 블록 이동
            block.style.left = newLeft + 'px';
            
            // 데이터 업데이트
            const playIndex = parseInt(block.dataset.playIndex);
            const pauseIndex = parseInt(block.dataset.pauseIndex);
            
            if (this.timestampData.sync_points[playIndex]) {
                this.timestampData.sync_points[playIndex].reaction_time = newStartTime;
            }
            if (this.timestampData.sync_points[pauseIndex]) {
                this.timestampData.sync_points[pauseIndex].reaction_time = newEndTime;
            }
            
            // 블록 내용 업데이트
            const content = block.querySelector('div');
            if (content) {
                content.innerHTML = `
                    <div>PLAY-PAUSE</div>
                    <div>${this.formatTime(newStartTime)} - ${this.formatTime(newEndTime)}</div>
                `;
            }
        };
        
        const handleMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                this.saveState();
            }
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        // 더블클릭으로 편집
        block.addEventListener('dblclick', () => {
            this.editPlayPauseBlock(block);
        });
        
        // 컨텍스트 메뉴
        block.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showPlayPauseContextMenu(e, block);
        });
    }
    
    editPlayPauseBlock(block) {
        const playIndex = parseInt(block.dataset.playIndex);
        const pauseIndex = parseInt(block.dataset.pauseIndex);
        
        const playPoint = this.timestampData.sync_points[playIndex];
        const pausePoint = this.timestampData.sync_points[pauseIndex];
        
        const newStartTime = parseFloat(prompt('시작 시간 (초):', playPoint.reaction_time.toFixed(2)));
        if (isNaN(newStartTime)) return;
        
        const newEndTime = parseFloat(prompt('종료 시간 (초):', pausePoint.reaction_time.toFixed(2)));
        if (isNaN(newEndTime) || newEndTime <= newStartTime) return;
        
        playPoint.reaction_time = newStartTime;
        pausePoint.reaction_time = newEndTime;
        
        this.renderTimestampBlocks();
        this.saveState();
    }
    
    showPlayPauseContextMenu(e, block) {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${e.clientX}px;
            top: ${e.clientY}px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 5px 0;
            box-shadow: var(--shadow);
            z-index: 1000;
            min-width: 150px;
        `;
        
        const menuItems = [
            { text: '구간 편집', action: () => this.editPlayPauseBlock(block) },
            { text: '구간 복제', action: () => this.duplicatePlayPauseBlock(block) },
            { text: '구간 삭제', action: () => this.deletePlayPauseBlock(block) },
            { text: '구간 정보', action: () => this.showPlayPauseBlockInfo(block) }
        ];
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = item.text;
            menuItem.addEventListener('click', () => {
                item.action();
                menu.remove();
            });
            menu.appendChild(menuItem);
        });
        
        document.body.appendChild(menu);
        
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            });
        }, 100);
    }
    
    duplicatePlayPauseBlock(block) {
        const playIndex = parseInt(block.dataset.playIndex);
        const pauseIndex = parseInt(block.dataset.pauseIndex);
        
        const playPoint = this.timestampData.sync_points[playIndex];
        const pausePoint = this.timestampData.sync_points[pauseIndex];
        
        const duration = pausePoint.reaction_time - playPoint.reaction_time;
        const offset = 5; // 5초 뒤에 복제
        
        const newPlayPoint = {
            ...playPoint,
            reaction_time: playPoint.reaction_time + offset
        };
        
        const newPausePoint = {
            ...pausePoint,
            reaction_time: pausePoint.reaction_time + offset
        };
        
        this.timestampData.sync_points.push(newPlayPoint, newPausePoint);
        this.timestampData.sync_points.sort((a, b) => a.reaction_time - b.reaction_time);
        
        this.renderTimestampBlocks();
        this.saveState();
    }
    
    deletePlayPauseBlock(block) {
        const playIndex = parseInt(block.dataset.playIndex);
        const pauseIndex = parseInt(block.dataset.pauseIndex);
        
        // 인덱스가 큰 것부터 삭제 (인덱스 변화 방지)
        const indices = [playIndex, pauseIndex].sort((a, b) => b - a);
        indices.forEach(index => {
            this.timestampData.sync_points.splice(index, 1);
        });
        
        this.renderTimestampBlocks();
        this.saveState();
    }
    
    showPlayPauseBlockInfo(block) {
        const playIndex = parseInt(block.dataset.playIndex);
        const pauseIndex = parseInt(block.dataset.pauseIndex);
        
        const playPoint = this.timestampData.sync_points[playIndex];
        const pausePoint = this.timestampData.sync_points[pauseIndex];
        
        const duration = pausePoint.reaction_time - playPoint.reaction_time;
        
        const info = `
구간 정보:
- 시작 시간: ${this.formatTime(playPoint.reaction_time)}
- 종료 시간: ${this.formatTime(pausePoint.reaction_time)}
- 지속 시간: ${this.formatTime(duration)}
- 유튜브 시작: ${this.formatTime(playPoint.youtube_time || 0)}
- 유튜브 종료: ${this.formatTime(pausePoint.youtube_time || 0)}
        `.trim();
        
        alert(info);
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
        
        // 이벤트 리스너 (정적 블록이 아닌 경우에만)
        if (!block.classList.contains('static-pause-block')) {
            this.setupBlockEvents(block);
        }
        
        return block;
    }
    
    setupBlockEvents(block) {
        // 더블클릭으로 편집
        block.addEventListener('dblclick', () => {
            this.editBlock(block);
        });
        
        // 컨텍스트 메뉴 (우클릭)
        block.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showBlockContextMenu(e, block);
        });
    }
    
    showBlockContextMenu(e, block) {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${e.clientX}px;
            top: ${e.clientY}px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 5px 0;
            box-shadow: var(--shadow);
            z-index: 1000;
            min-width: 150px;
        `;
        
        const menuItems = [
            { text: '블록 편집', action: () => this.editBlock(block) },
            { text: '블록 복제', action: () => this.duplicateBlock(block) },
            { text: '블록 삭제', action: () => this.deleteBlock(block) },
            { text: '시간 정보', action: () => this.showBlockInfo(block) }
        ];
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = item.text;
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
    
    duplicateBlock(block) {
        const index = parseInt(block.dataset.index);
        const originalPoint = this.timestampData.sync_points[index];
        
        const newPoint = {
            ...originalPoint,
            reaction_time: originalPoint.reaction_time + 5 // 5초 뒤에 복제
        };
        
        this.timestampData.sync_points.push(newPoint);
        this.timestampData.sync_points.sort((a, b) => a.reaction_time - b.reaction_time);
        
        this.renderTimestampBlocks();
        this.saveState();
        
        console.log('블록 복제 완료');
    }
    
    deleteBlock(block) {
        const index = parseInt(block.dataset.index);
        this.timestampData.sync_points.splice(index, 1);
        
        this.renderTimestampBlocks();
        this.saveState();
        
        console.log('블록 삭제 완료');
    }
    
    showBlockInfo(block) {
        const index = parseInt(block.dataset.index);
        const point = this.timestampData.sync_points[index];
        
        const info = `
블록 정보:
- 이벤트: ${point.event}
- 리액션 시간: ${this.formatTime(point.reaction_time)}
- 유튜브 시간: ${this.formatTime(point.youtube_time || 0)}
- 인덱스: ${index}
        `.trim();
        
        alert(info);
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
    
    // moveRippleBlocks는 drag-drop.js에서 처리됨
    
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
        
        // 🔧 개선된 타임스탬프 이벤트 처리
        const tolerance = 0.15; // 0.15초 오차 허용 (더 정확하게)
        const currentEvents = this.timestampData.sync_points.filter(point => {
            return Math.abs(point.reaction_time - this.currentTime) < tolerance;
        });
        
        // 이미 처리된 이벤트 중복 방지
        if (!this.processedEvents) {
            this.processedEvents = new Set();
        }
        
        currentEvents.forEach(event => {
            const eventKey = `${event.reaction_time}_${event.event}`;
            
            // 이미 처리된 이벤트는 건너뛰기
            if (this.processedEvents.has(eventKey)) return;
            
            try {
                if (event.event === 'youtube_play') {
                    const youtubeTime = event.youtube_time || event.relative_youtube_time || 0;
                    
                    // YouTube 플레이어 상태 확인
                    if (this.youtubePlayer.getPlayerState() !== 1) { // 1 = PLAYING
                        this.youtubePlayer.seekTo(youtubeTime, true);
                        this.youtubePlayer.playVideo();
                        console.log('✅ YouTube 재생:', youtubeTime);
                    }
                    
                } else if (event.event === 'youtube_pause') {
                    
                    // YouTube 플레이어 상태 확인
                    if (this.youtubePlayer.getPlayerState() === 1) { // 1 = PLAYING
                        this.youtubePlayer.pauseVideo();
                        console.log('✅ YouTube 일시정지');
                    }
                }
                
                // 처리된 이벤트로 마킹
                this.processedEvents.add(eventKey);
                
                // 일정 시간 후 처리된 이벤트 목록에서 제거 (재활성화를 위해)
                setTimeout(() => {
                    this.processedEvents.delete(eventKey);
                }, 1000);
                
            } catch (error) {
                console.error('❌ YouTube 플레이어 제어 오류:', error);
            }
        });
    }
    
    // 🔄 Resync 버튼 기능 구현
    resyncYouTubeVideo() {
        if (!this.timestampData || !this.youtubePlayer) {
            console.log('❌ 타임스탬프 데이터 또는 YouTube 플레이어가 없습니다.');
            return;
        }
        
        // 현재 리액션 비디오 시간 가져오기
        let currentReactionTime = 0;
        if (this.reactionPlayer) {
            currentReactionTime = this.reactionPlayer.getCurrentTime();
        } else if (this.reactionVideo) {
            currentReactionTime = this.reactionVideo.currentTime;
        }
        
        console.log(`🔄 재동기화 시작: 현재 시간 ${currentReactionTime}초`);
        
        // 현재 시간에서 가장 가까운 sync point 찾기
        const nearestPoint = this.findNearestSyncPoint(currentReactionTime);
        
        if (nearestPoint) {
            console.log(`📍 가장 가까운 sync point: ${nearestPoint.reaction_time}초 (${nearestPoint.event})`);
            
            // 해당 sync point로 YouTube 비디오 동기화
            this.syncToPoint(nearestPoint);
            
            console.log('✅ 재동기화 완료');
        } else {
            console.log('❌ 가까운 sync point를 찾을 수 없습니다.');
        }
    }
    
    // 가장 가까운 sync point 찾기
    findNearestSyncPoint(currentTime) {
        if (!this.timestampData || !this.timestampData.sync_points) {
            return null;
        }
        
        let nearestPoint = null;
        let minDistance = Infinity;
        
        this.timestampData.sync_points.forEach(point => {
            const distance = Math.abs(point.reaction_time - currentTime);
            if (distance < minDistance) {
                minDistance = distance;
                nearestPoint = point;
            }
        });
        
        return nearestPoint;
    }
    
    // 특정 sync point로 동기화
    syncToPoint(syncPoint) {
        try {
            const youtubeTime = syncPoint.youtube_time || syncPoint.relative_youtube_time || 0;
            
            // YouTube 비디오를 해당 시간으로 이동
            this.youtubePlayer.seekTo(youtubeTime, true);
            
            // sync point의 이벤트에 따라 YouTube 상태 조정
            if (syncPoint.event === 'youtube_play') {
                this.youtubePlayer.playVideo();
                console.log(`▶️ YouTube 재생: ${youtubeTime}초`);
            } else if (syncPoint.event === 'youtube_pause') {
                this.youtubePlayer.pauseVideo();
                console.log(`⏸️ YouTube 일시정지: ${youtubeTime}초`);
            }
            
        } catch (error) {
            console.error('❌ YouTube 동기화 오류:', error);
        }
    }
    
    togglePlayback() {
        if (!this.reactionVideo) {
            return; // 알림 제거
        }
        
        if (this.reactionPlayer) {
            // YouTube iframe API 사용
            if (this.isPlaying) {
                this.reactionPlayer.pauseVideo();
            } else {
                this.reactionPlayer.playVideo();
            }
        } else {
            // 일반 HTML5 비디오 엘리먼트
            if (this.isPlaying) {
                this.reactionVideo.pause();
            } else {
                this.reactionVideo.play();
            }
        }
    }
    

    
    toggleRippleMode() {
        this.rippleMode = !this.rippleMode;
        const btn = document.getElementById('ripple-toggle');
        btn.classList.toggle('active', this.rippleMode);
        btn.textContent = this.rippleMode ? 'Linked Move' : 'Individual Move';
        
        // 모드 변경 시 사용자에게 알림
        const mode = this.rippleMode ? 'Linked Move' : 'Individual Move';
        console.log(`Mode changed to: ${mode}`);
        
        // 시각적 피드백 (선택사항)
        this.showModeIndicator(mode);
    }
    
    showModeIndicator(mode) {
        // 기존 인디케이터 제거
        const existingIndicator = document.querySelector('.mode-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // 새 인디케이터 생성
        const indicator = document.createElement('div');
        indicator.className = 'mode-indicator';
        indicator.textContent = `Mode: ${mode}`;
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 1000;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(indicator);
        
        // 2초 후 자동 제거
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 300);
        }, 2000);
    }
    
    // Auto Sync 토글 기능 제거 - 기본값으로 고정
    
    showSyncIndicator(status) {
        const indicator = document.createElement('div');
        indicator.className = 'sync-indicator';
        indicator.textContent = `Auto Sync: ${status}`;
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 1000;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(indicator);
        
        // 2초 후 자동 제거
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 300);
        }, 2000);
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
        
        // JSON으로만 내보내기
        const dataStr = JSON.stringify(this.timestampData, null, 2);
        const fileName = 'edited_timestamp.json';
        const mimeType = 'application/json';
        
        const dataBlob = new Blob([dataStr], {type: mimeType});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = fileName;
        link.click();
        
        // 내보내기 통계 표시
        this.showExportStats();
        
        alert(`타임스탬프 파일이 ${fileName}으로 다운로드되었습니다.`);
    }
    
    // CSV와 TXT 내보내기 기능 제거 - JSON만 사용
    
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
        // 🔄 Resync 키보드 단축키 추가
        else if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            this.resyncYouTubeVideo();
            console.log('🔄 키보드 단축키로 재동기화 실행');
        }
        // 🔧 줌 키보드 단축키 추가
        else if (e.ctrlKey && e.key === '=') {
            e.preventDefault();
            // 줌인
            if (this.timelineControls) {
                this.timelineControls.zoomIn();
            } else {
                this.pixelsPerSecond = Math.min(200, this.pixelsPerSecond * 1.2);
                this.renderTimeline();
            }
            console.log('🔍 키보드 줌인:', this.pixelsPerSecond);
        } else if (e.ctrlKey && e.key === '-') {
            e.preventDefault();
            // 줌아웃
            if (this.timelineControls) {
                this.timelineControls.zoomOut();
            } else {
                this.pixelsPerSecond = Math.max(5, this.pixelsPerSecond / 1.2);
                this.renderTimeline();
            }
            console.log('🔍 키보드 줌아웃:', this.pixelsPerSecond);
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

