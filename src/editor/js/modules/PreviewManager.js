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
        // Reaction Video Player
        this.reactionPreviewPlayer = new YT.Player('reaction-preview-player', {
            height: '200',
            width: '100%',
            videoId: 'niYgb0IfP4U',
            playerVars: {
                'playsinline': 1,
                'controls': 1,
                'rel': 0,
                'modestbranding': 1
            }
        });

        // Original Video Player
        this.originalPreviewPlayer = new YT.Player('original-preview-player', {
            height: '200',
            width: '100%',
            videoId: 'AbZH7XWDW_k',
            playerVars: {
                'playsinline': 1,
                'controls': 1,
                'rel': 0,
                'modestbranding': 1
            }
        });
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
        const reactionStartTime = Math.max(0, point.reaction_time - 2); // Reaction starts 2s before
        this.reactionPreviewPlayer.seekTo(reactionStartTime, true);
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
        
        if (this.previewState.previewTimer) {
            clearTimeout(this.previewState.previewTimer);
        }
        this.previewState.previewTimer = setTimeout(() => {
            this.stopPreview();
        }, this.previewState.previewDuration * 1000);
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
            console.log('Reaction video updated to:', videoId);
        }
    }
}
