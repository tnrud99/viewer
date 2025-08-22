export class PreviewManager {
    constructor() {
        this.reactionPreviewPlayer = null;
        this.originalPreviewPlayer = null;
        this.previewState = {
            isPlaying: false,
            previewTimer: null,
            previewDuration: 6 // 6초 프리뷰
        };
        
        this.setupPreviewArea();
    }

    setupPreviewArea() {
        // YouTube IFrame API 로드 후 플레이어 생성
        if (typeof YT !== 'undefined' && YT.Player) {
            this.createPreviewPlayers();
        } else {
            window.addEventListener('load', () => {
                this.createPreviewPlayers();
            });
        }
    }

    createPreviewPlayers() {
        // Reaction Video Player (빈 플레이어로 초기화)
        this.reactionPreviewPlayer = new YT.Player('reaction-preview-player', {
            height: '200',
            width: '100%',
            videoId: '', // 배포용으로 빈 값으로 설정
            playerVars: {
                'playsinline': 1,
                'controls': 1,
                'rel': 0,
                'modestbranding': 1
            }
        });

        // Original Video Player (빈 플레이어로 초기화)
        this.originalPreviewPlayer = new YT.Player('original-preview-player', {
            height: '200',
            width: '100%',
            videoId: '', // 배포용으로 빈 값으로 설정
            playerVars: {
                'playsinline': 1,
                'controls': 1,
                'rel': 0,
                'modestbranding': 1
            }
        });

        // 초기 상태에서 Pause 버튼 비활성화
        this.updatePauseButton(false);
    }

    startSmartPreview(point) {
        if (!this.reactionPreviewPlayer || !this.originalPreviewPlayer) {
            console.warn('Preview players not ready');
            return;
        }

        // 이전 프리뷰 정리
        this.stopPreview();

        // 이벤트 타입에 따른 프리뷰 실행
        if (point.event === 'youtube_play') {
            this.handlePlayPreview(point);
        } else if (point.event === 'youtube_pause') {
            this.handlePausePreview(point);
        }

        this.updatePreviewInfo(point);
        this.updatePreviewControls(true);
    }

    handlePlayPreview(point) {
        // 현재 PLAY 포인트의 인덱스 찾기
        const currentIndex = this.findPointIndex(point);
        if (currentIndex === -1) return;
        
        // 다음 PAUSE 포인트 찾기
        const nextPausePoint = this.findNextPausePoint(currentIndex);
        if (!nextPausePoint) return;
        
        // 세그먼트 길이 계산 (PLAY부터 PAUSE까지)
        const segmentDuration = nextPausePoint.reaction_time - point.reaction_time;
        
        // Reaction video starts at PLAY point
        this.reactionPreviewPlayer.seekTo(point.reaction_time, true);
        this.reactionPreviewPlayer.playVideo();
        
        let originalStartTime = 0;
        if (point.relative_youtube_time !== null && point.relative_youtube_time !== undefined) {
            originalStartTime = point.relative_youtube_time;
        } else if (point.youtube_time !== null) {
            originalStartTime = point.youtube_time;
        }
        
        // Original video starts 3s after reaction video starts
        setTimeout(() => {
            this.originalPreviewPlayer.seekTo(originalStartTime, true);
            this.originalPreviewPlayer.playVideo();
        }, 3000);
        
        // 세그먼트 길이만큼 재생 후 정지
        if (this.previewState.previewTimer) {
            clearTimeout(this.previewState.previewTimer);
        }
        this.previewState.previewTimer = setTimeout(() => {
            this.stopPreview();
        }, (segmentDuration + 3) * 1000); // 3초 지연 + 세그먼트 길이
    }

    handlePausePreview(point) {
        const reactionStartTime = point.reaction_time; // Both start at point
        this.reactionPreviewPlayer.seekTo(reactionStartTime, true);
        this.reactionPreviewPlayer.playVideo();
        
        let originalStartTime = 0;
        if (point.relative_youtube_time !== null && point.relative_youtube_time !== undefined) {
            originalStartTime = point.relative_youtube_time;
        } else if (point.youtube_time !== null) {
            originalStartTime = point.youtube_time;
        }
        
        this.originalPreviewPlayer.seekTo(originalStartTime, true);
        this.originalPreviewPlayer.playVideo();
        
        if (this.previewState.previewTimer) {
            clearTimeout(this.previewState.previewTimer);
        }
        
        // Pause original video after 3s
        this.previewState.previewTimer = setTimeout(() => {
            this.originalPreviewPlayer.pauseVideo(); // Only original pauses
            
            // Stop all after 6s (3s after original paused)
            setTimeout(() => {
                this.stopPreview();
            }, 3000);
        }, 3000);
    }

    stopPreview() {
        if (this.reactionPreviewPlayer) {
            this.reactionPreviewPlayer.pauseVideo();
        }
        if (this.originalPreviewPlayer) {
            this.originalPreviewPlayer.pauseVideo();
        }
        
        if (this.previewState.previewTimer) {
            clearTimeout(this.previewState.previewTimer);
            this.previewState.previewTimer = null;
        }
        
        this.previewState.isPlaying = false;
        this.updatePreviewControls(false);
    }

    // 모든 비디오 일시정지
    pauseAllVideos() {
        if (this.reactionPreviewPlayer && this.reactionPreviewPlayer.pauseVideo) {
            this.reactionPreviewPlayer.pauseVideo();
        }
        if (this.originalPreviewPlayer && this.originalPreviewPlayer.pauseVideo) {
            this.originalPreviewPlayer.pauseVideo();
        }
        
        // 프리뷰 상태도 정리
        this.stopPreview();
    }

    updatePreviewInfo(point) {
        const reactionTimeDisplay = document.getElementById('reaction-time');
        const originalTimeDisplay = document.getElementById('original-time');
        const durationDisplay = document.getElementById('preview-duration');

        if (reactionTimeDisplay) {
            reactionTimeDisplay.textContent = this.formatTime(point.reaction_time);
        }

        if (originalTimeDisplay) {
            let originalTime = 0;
            if (point.relative_youtube_time !== null && point.relative_youtube_time !== undefined) {
                originalTime = point.relative_youtube_time;
            } else if (point.youtube_time !== null) {
                originalTime = point.youtube_time;
            }
            originalTimeDisplay.textContent = this.formatTime(originalTime);
        }

        if (durationDisplay) {
            durationDisplay.textContent = this.previewState.previewDuration + 's';
        }
    }

    updatePreviewControls(enabled) {
        // 프리뷰 컨트롤 상태 업데이트 (필요시)
        this.previewState.isPlaying = enabled;
        
        // Pause 버튼 활성화/비활성화
        this.updatePauseButton(enabled);
    }

    // Pause 버튼 상태 업데이트
    updatePauseButton(isPlaying) {
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.disabled = !isPlaying;
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    getPreviewState() {
        return this.previewState;
    }

    getReactionPlayer() {
        return this.reactionPreviewPlayer;
    }

    getOriginalPlayer() {
        return this.originalPreviewPlayer;
    }

    updateReactionVideoUrl(url) {
        this.reactionVideoUrl = url;
        
        // URL에서 video ID 추출
        const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (videoIdMatch && this.reactionPreviewPlayer) {
            const videoId = videoIdMatch[1];
            this.reactionPreviewPlayer.loadVideoById(videoId);
        }
    }

    // 현재 포인트의 인덱스 찾기
    findPointIndex(point) {
        if (!window.simpleEditor || !window.simpleEditor.getTimelineRenderer) {
            return -1;
        }
        
        const timestamps = window.simpleEditor.getTimelineRenderer().timestamps;
        return timestamps.findIndex(ts => 
            ts.reaction_time === point.reaction_time && 
            ts.event === point.event
        );
    }

    // 다음 PAUSE 포인트 찾기
    findNextPausePoint(currentIndex) {
        if (!window.simpleEditor || !window.simpleEditor.getTimelineRenderer) {
            return null;
        }
        
        const timestamps = window.simpleEditor.getTimelineRenderer().timestamps;
        
        // 현재 인덱스 이후의 첫 번째 PAUSE 포인트 찾기
        for (let i = currentIndex + 1; i < timestamps.length; i++) {
            if (timestamps[i].event === 'youtube_pause') {
                return timestamps[i];
            }
        }
        
        return null;
    }
}
