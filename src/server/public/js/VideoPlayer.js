// VideoPlayer Module - Handles video playback and synchronization
class VideoPlayer {
    constructor() {
        this.youtubePlayer = null;
        this.reactionPlayer = null;
        this.reactionYoutubePlayer = null;
        this.isPlaying = false;
        this.youtubeReady = false;
        this.reactionYoutubeReady = false;
        this.youtubeVideoId = null;
        this.youtubeFirstPlayTime = null;
        this.youtubePaused = false;
        this.lastSyncTime = 0;
        this.lastReactionTime = 0;
        
        // YouTube-YouTube synchronization variables
        this.youtubeYoutubeMode = true;
        this.reactionYoutubeCurrentTime = 0;
        this.lastReactionYoutubeTime = 0;
        this.youtubeYoutubeSyncInterval = null;
        this.reactionYoutubeStateChangeTime = 0;
        this.youtubeYoutubeSyncEnabled = true;
        this.youtubeYoutubeSyncFrequency = 200;
        this.youtubeYoutubeSyncThreshold = 0.3;
        this.reactionYoutubeState = -1;
        
        this.setupEventListeners();
    }

    // YouTube API callback
    onYouTubeIframeAPIReady() {
        this.youtubeReady = true;
        console.log('YouTube API Ready');
    }

    // Create YouTube Player
    createYouTubePlayer(videoId, startTime = 0) {
        if (!this.youtubeReady) {
            console.error('YouTube API not ready');
            return false;
        }

        // 모바일 감지
        const isMobile = window.innerWidth <= 768;
        
        // 모바일용 적당한 해상도 설정 (오버레이 영상용)
        const playerVars = isMobile ? {
            'autoplay': 0,
            'controls': 1,
            'rel': 0,
            'showinfo': 0,
            'modestbranding': 1,
            'start': startTime,
            'vq': 'medium',  // 중간 해상도 (360p) - 적당한 화질
            'iv_load_policy': 3,  // 주석 비활성화
            'cc_load_policy': 0   // 자막 비활성화
        } : {
            'autoplay': 0,
            'controls': 1,
            'rel': 0,
            'showinfo': 0,
            'modestbranding': 1,
            'start': startTime
        };

        try {
            this.youtubePlayer = new YT.Player('youtube-player', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: playerVars,
                events: {
                    'onReady': (event) => this.onPlayerReady(event),
                    'onStateChange': (event) => this.onPlayerStateChange(event)
                }
            });
            return true;
        } catch (error) {
            console.error('Failed to create YouTube player:', error);
            return false;
        }
    }

    // Create Reaction YouTube Player
    createReactionYouTubePlayer(videoId, startTime = 0) {
        if (!this.youtubeReady) {
            console.error('YouTube API not ready');
            return false;
        }

        try {
            this.reactionYoutubePlayer = new YT.Player('reaction-youtube-container', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    'autoplay': 0,
                    'controls': 1,
                    'rel': 0,
                    'showinfo': 0,
                    'modestbranding': 1,
                    'start': startTime
                },
                events: {
                    'onReady': (event) => this.onReactionPlayerReady(event),
                    'onStateChange': (event) => this.onReactionPlayerStateChange(event)
                }
            });
            return true;
        } catch (error) {
            console.error('Failed to create reaction YouTube player:', error);
            return false;
        }
    }

    // Player Ready Event
    onPlayerReady(event) {
        console.log('YouTube Player Ready');
        this.youtubePlayer = event.target;
        this.youtubePlayer.setVolume(100);
    }

    // Reaction Player Ready Event
    onReactionPlayerReady(event) {
        console.log('Reaction YouTube Player Ready');
        this.reactionYoutubePlayer = event.target;
        this.reactionYoutubeReady = true;
        this.reactionYoutubePlayer.setVolume(100);
    }

    // Player State Change Event
    onPlayerStateChange(event) {
        // Handle YouTube player state changes
        if (event.data === YT.PlayerState.PLAYING) {
            this.youtubeStarted = true;
        }
    }

    // Reaction Player State Change Event
    onReactionPlayerStateChange(event) {
        this.reactionYoutubeState = event.data;
        this.reactionYoutubeStateChangeTime = Date.now();
        
        if (event.data === YT.PlayerState.PLAYING) {
            this.reactionYoutubeCurrentTime = this.reactionYoutubePlayer.getCurrentTime();
        }
    }

    // Setup Event Listeners
    setupEventListeners() {
        // Reaction player setup (HTML5 video)
        if (this.reactionPlayer) {
            this.reactionPlayer.addEventListener('loadedmetadata', () => {
                console.log('Status: Reaction Video Loaded');
            });
            
            this.reactionPlayer.addEventListener('ended', () => {
                this.stopSynchronizedPlayback();
            });
            
            this.reactionPlayer.addEventListener('timeupdate', () => {
                if (!this.youtubeYoutubeMode) {
                    const currentTime = this.reactionPlayer.currentTime;
                    this.handleSynchronization(currentTime);
                }
            });
        }
    }

    // Start Synchronized Playback
    startSynchronizedPlayback() {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.updateButtonStates(true);

        if (this.youtubeYoutubeMode) {
            this.startYoutubeYoutubeSync();
        } else {
            // File mode synchronization
            if (this.reactionPlayer) {
                this.reactionPlayer.play();
            }
        }

        if (this.youtubePlayer && this.youtubePlayer.playVideo) {
            this.youtubePlayer.playVideo();
        }
    }

    // Pause Synchronized Playback
    pauseSynchronizedPlayback() {
        if (!this.isPlaying) return;

        this.isPlaying = false;
        this.updateButtonStates(false);

        if (this.youtubeYoutubeMode) {
            this.stopYoutubeYoutubeSync();
        } else {
            if (this.reactionPlayer) {
                this.reactionPlayer.pause();
            }
        }

        if (this.youtubePlayer && this.youtubePlayer.pauseVideo) {
            this.youtubePlayer.pauseVideo();
        }
    }

    // Restart Synchronized Playback
    restartSynchronizedPlayback() {
        this.pauseSynchronizedPlayback();
        
        setTimeout(() => {
            if (this.youtubePlayer && this.youtubePlayer.seekTo) {
                this.youtubePlayer.seekTo(0);
            }
            if (this.reactionPlayer) {
                this.reactionPlayer.currentTime = 0;
            }
            if (this.reactionYoutubePlayer && this.reactionYoutubePlayer.seekTo) {
                this.reactionYoutubePlayer.seekTo(0);
            }
            
            this.startSynchronizedPlayback();
        }, 100);
    }

    // Stop Synchronized Playback
    stopSynchronizedPlayback() {
        this.pauseSynchronizedPlayback();
        this.isPlaying = false;
        this.updateButtonStates(false);
    }

    // YouTube-YouTube Synchronization
    startYoutubeYoutubeSync() {
        if (this.youtubeYoutubeSyncInterval) {
            clearInterval(this.youtubeYoutubeSyncInterval);
        }

        this.youtubeYoutubeSyncInterval = setInterval(() => {
            if (!this.isPlaying || !this.youtubeYoutubeSyncEnabled) return;

            if (this.reactionYoutubePlayer && this.youtubePlayer) {
                const reactionTime = this.reactionYoutubePlayer.getCurrentTime();
                const youtubeTime = this.youtubePlayer.getCurrentTime();
                
                if (Math.abs(reactionTime - youtubeTime) > this.youtubeYoutubeSyncThreshold) {
                    this.youtubePlayer.seekTo(reactionTime);
                }
            }
        }, this.youtubeYoutubeSyncFrequency);
    }

    // Stop YouTube-YouTube Synchronization
    stopYoutubeYoutubeSync() {
        if (this.youtubeYoutubeSyncInterval) {
            clearInterval(this.youtubeYoutubeSyncInterval);
            this.youtubeYoutubeSyncInterval = null;
        }
    }

    // Handle Synchronization (File Mode)
    handleSynchronization(currentTime) {
        // This method would be implemented for file mode synchronization
        // Currently handled by the main viewer logic
    }

    // Update Button States
    updateButtonStates(playing) {
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const restartBtn = document.getElementById('restart-btn');

        if (playBtn) playBtn.disabled = playing;
        if (pauseBtn) pauseBtn.disabled = !playing;
        if (restartBtn) restartBtn.disabled = false;
    }

    // Extract YouTube Video ID
    extractYouTubeVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    // Get Current State
    getCurrentState() {
        return {
            isPlaying: this.isPlaying,
            youtubeReady: this.youtubeReady,
            reactionYoutubeReady: this.reactionYoutubeReady,
            youtubeYoutubeMode: this.youtubeYoutubeMode
        };
    }

    // Cleanup
    destroy() {
        this.stopSynchronizedPlayback();
        this.stopYoutubeYoutubeSync();
        
        if (this.youtubePlayer) {
            this.youtubePlayer.destroy();
            this.youtubePlayer = null;
        }
        
        if (this.reactionYoutubePlayer) {
            this.reactionYoutubePlayer.destroy();
            this.reactionYoutubePlayer = null;
        }
    }
}

// Export for use in main viewer
window.VideoPlayer = VideoPlayer;
