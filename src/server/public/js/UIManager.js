// UIManager Module - Handles UI interactions and state management
class UIManager {
    constructor() {
        this.overlayPosition = 'top-right';
        this.overlaySize = 50;
        this.isOverlayVisible = true;
        this.youtubeVolume = 100;
        this.reactionSource = 'youtube';
        
        this.setupEventListeners();
    }

    // Setup Event Listeners
    setupEventListeners() {
        this.setupOverlayControls();
        this.setupButtonControls();
        this.setupHelpControls();
        this.setupMobileControls();
    }

    // Setup Overlay Controls
    setupOverlayControls() {
        // Desktop overlay toggle functionality
        const overlayToggleBtn = document.getElementById('overlayToggleBtn');
        if (overlayToggleBtn) {
            overlayToggleBtn.addEventListener('change', (e) => {
                this.isOverlayVisible = e.target.checked;
                this.updateOverlayVisibility();
            });
        }

        // Mobile overlay controls toggle functionality
        const overlayControlsToggleBtn = document.querySelector('.overlay-toggle-btn');
        if (overlayControlsToggleBtn) {
            overlayControlsToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const compactControls = document.querySelector('.compact-controls');
                if (compactControls) {
                    const isVisible = compactControls.style.display !== 'none';
                    compactControls.style.display = isVisible ? 'none' : 'grid';
                    overlayControlsToggleBtn.classList.toggle('collapsed', !isVisible);
                }
            });
        }

        // Overlay settings title click functionality
        const overlaySettingsTitle = document.querySelector('.overlay-settings-title');
        if (overlaySettingsTitle) {
            overlaySettingsTitle.addEventListener('click', (e) => {
                e.preventDefault();
                const compactControls = document.querySelector('.compact-controls');
                if (compactControls) {
                    const isVisible = compactControls.style.display !== 'none';
                    compactControls.style.display = isVisible ? 'none' : 'grid';
                    const toggleBtn = document.querySelector('.overlay-toggle-btn');
                    if (toggleBtn) {
                        toggleBtn.classList.toggle('collapsed', !isVisible);
                    }
                }
            });
        }

        // Overlay settings button
        const overlaySettingsBtn = document.getElementById('overlay-settings-btn');
        if (overlaySettingsBtn) {
            overlaySettingsBtn.addEventListener('click', () => {
                const overlaySettingsPanel = document.querySelector('.overlay-settings-panel');
                if (overlaySettingsPanel) {
                    overlaySettingsPanel.classList.toggle('show');
                }
            });
        }

        // Overlay position select
        const overlayPositionSelect = document.getElementById('overlayPosition');
        if (overlayPositionSelect) {
            overlayPositionSelect.addEventListener('change', (e) => {
                this.overlayPosition = e.target.value;
                this.updateOverlayPosition();
            });
        }

        // Overlay size slider
        const overlaySizeSlider = document.getElementById('overlaySize');
        if (overlaySizeSlider) {
            overlaySizeSlider.addEventListener('input', (e) => {
                this.overlaySize = parseInt(e.target.value);
                this.updateOverlaySize();
            });
        }

        // Toggle overlay button
        const toggleOverlayBtn = document.getElementById('toggleOverlay');
        if (toggleOverlayBtn) {
            toggleOverlayBtn.addEventListener('click', () => {
                this.isOverlayVisible = !this.isOverlayVisible;
                this.updateOverlayVisibility();
            });
        }

        // YouTube volume slider
        const youtubeVolumeSlider = document.getElementById('youtubeVolume');
        if (youtubeVolumeSlider) {
            youtubeVolumeSlider.addEventListener('input', (e) => {
                this.youtubeVolume = parseInt(e.target.value);
                this.updateYoutubeVolume();
            });
        }
    }

    // Setup Button Controls
    setupButtonControls() {
        // Play button
        const playBtn = document.getElementById('play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (window.videoPlayer) {
                    window.videoPlayer.startSynchronizedPlayback();
                }
            });
        }

        // Pause button
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                if (window.videoPlayer) {
                    window.videoPlayer.pauseSynchronizedPlayback();
                }
            });
        }

        // Restart button
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                if (window.videoPlayer) {
                    window.videoPlayer.restartSynchronizedPlayback();
                }
            });
        }

        // Full button
        const fullBtn = document.getElementById('full-btn');
        if (fullBtn) {
            fullBtn.addEventListener('click', async () => {
                if (window.fullscreenManager) {
                    await window.fullscreenManager.enterFullMode();
                }
            });
        }

        // Resync button
        const resyncBtn = document.getElementById('resyncBtn');
        if (resyncBtn) {
            resyncBtn.addEventListener('click', () => {
                this.resyncVideos();
            });
        }
    }

    // Setup Help Controls
    setupHelpControls() {
        // Help button
        const helpBtn = document.getElementById('help-btn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                const helpFaq = document.getElementById('help-faq');
                if (helpFaq) {
                    helpFaq.style.display = helpFaq.style.display === 'none' ? 'block' : 'none';
                }
            });
        }

        // Help close button
        const helpCloseBtn = document.querySelector('.help-close-btn');
        const helpFaq = document.getElementById('help-faq');
        if (helpCloseBtn && helpFaq) {
            helpCloseBtn.addEventListener('click', () => {
                helpFaq.style.display = 'none';
                
                // Scroll back to top smoothly
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    }

    // Setup Mobile Controls
    setupMobileControls() {
        // Info icon tooltip
        const infoIcon = document.getElementById('infoIcon');
        const appleTooltip = document.getElementById('appleTooltip');
        
        if (infoIcon && appleTooltip) {
            infoIcon.addEventListener('mouseenter', () => {
                appleTooltip.classList.add('show');
            });
            
            infoIcon.addEventListener('mouseleave', () => {
                appleTooltip.classList.remove('show');
            });
            
            appleTooltip.addEventListener('mouseleave', () => {
                appleTooltip.classList.remove('show');
            });
        }
    }

    // Update Overlay Position
    updateOverlayPosition() {
        const youtubeContainer = document.getElementById('youtube-container');
        if (youtubeContainer) {
            youtubeContainer.className = `overlay-${this.overlayPosition}`;
        }
    }

    // Update Overlay Size
    updateOverlaySize() {
        const youtubeContainer = document.getElementById('youtube-container');
        if (youtubeContainer) {
            youtubeContainer.style.width = `${this.overlaySize}%`;
        }
    }

    // Update Overlay Visibility
    updateOverlayVisibility() {
        const youtubeContainer = document.getElementById('youtube-container');
        if (youtubeContainer) {
            youtubeContainer.style.display = this.isOverlayVisible ? 'block' : 'none';
        }
    }

    // Update YouTube Volume
    updateYoutubeVolume() {
        if (window.videoPlayer && window.videoPlayer.youtubePlayer) {
            window.videoPlayer.youtubePlayer.setVolume(this.youtubeVolume);
        }
    }

    // Resync Videos
    resyncVideos() {
        if (window.videoPlayer) {
            window.videoPlayer.restartSynchronizedPlayback();
        }
    }

    // Show Message
    showMessage(text, type = 'info') {
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.textContent = text;
            messageDiv.className = `message ${type}`;
            messageDiv.style.display = 'block';
            
            setTimeout(() => {
                this.hideMessage();
            }, 3000);
        }
    }

    // Hide Message
    hideMessage() {
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.style.display = 'none';
        }
    }

    // Enable/Disable Controls
    enableControls(enabled) {
        const controls = document.querySelectorAll('.btn, .inline-btn, input, select');
        controls.forEach(control => {
            control.disabled = !enabled;
        });
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

    // Get Current Settings
    getCurrentSettings() {
        return {
            overlayPosition: this.overlayPosition,
            overlaySize: this.overlaySize,
            isOverlayVisible: this.isOverlayVisible,
            youtubeVolume: this.youtubeVolume,
            reactionSource: this.reactionSource
        };
    }

    // Apply Settings
    applySettings(settings) {
        if (settings.overlayPosition) {
            this.overlayPosition = settings.overlayPosition;
            this.updateOverlayPosition();
        }
        if (settings.overlaySize) {
            this.overlaySize = settings.overlaySize;
            this.updateOverlaySize();
        }
        if (settings.isOverlayVisible !== undefined) {
            this.isOverlayVisible = settings.isOverlayVisible;
            this.updateOverlayVisibility();
        }
        if (settings.youtubeVolume) {
            this.youtubeVolume = settings.youtubeVolume;
            this.updateYoutubeVolume();
        }
        if (settings.reactionSource) {
            this.reactionSource = settings.reactionSource;
        }
    }
}

// Export for use in main viewer
window.UIManager = UIManager;
