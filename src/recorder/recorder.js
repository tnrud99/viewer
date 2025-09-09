/**
 * YouTube Reaction Video Recorder - JavaScript Functions
 */

// Global variables
let youtubePlayer = null;
let youtubePlayerOverlay = null;
let mediaRecorder = null;
let recordedBlobs = [];
let webcamStream = null;
let recordingStartTime = 0;
let recordingTimer = null;
let isRecording = false;
let isPaused = false;
let youtubeReady = false;
let youtubeFirstPlayTime = null; // Time when YouTube video was first played

// Recording format settings
let currentRecordingFormat = 'mp4'; // 'mp4', 'webm-h264', 'webm-vp9'
let supportedFormats = [];
ㅓㅁ토해
// Layout settings
let currentMode = 'overlay'; // 'split' or 'overlay'
let overlayPosition = 'top-right';
let overlaySize = 45;
let overlayVisible = true;
let youtubeVolume = 100;

let timestampData = {
    youtube_video_id: '',
    youtube_title: '',
    reaction_video: '',
    recording_format: '',
    created_at: '',
    layout: {
        mode: 'overlay',
        overlay_position: 'top-right',
        overlay_size: 45,
        hide_overlay: false
    },
    sync_points: []
};

// YouTube API callback
function onYouTubeIframeAPIReady() {
    youtubeReady = true;
    console.log('YouTube API Ready');
}

// Check supported video formats
function checkSupportedFormats() {
    const formatTests = [
        { id: 'mp4', mime: 'video/mp4;codecs=h264', name: 'MP4 (H.264)', priority: 1 },
        { id: 'webm-h264', mime: 'video/webm;codecs=h264,opus', name: 'WebM (H.264)', priority: 2 },
        { id: 'webm-vp9', mime: 'video/webm;codecs=vp9,opus', name: 'WebM (VP9)', priority: 3 }
    ];
    
    supportedFormats = formatTests.filter(format => 
        MediaRecorder.isTypeSupported(format.mime)
    ).sort((a, b) => a.priority - b.priority);
    
    console.log('Supported formats:', supportedFormats);
    return supportedFormats;
}

// Get optimal recording format
function getOptimalFormat() {
    if (supportedFormats.length === 0) {
        checkSupportedFormats();
    }
    
    // Always try to use MP4 first, fallback to others if not supported
    const mp4Format = supportedFormats.find(f => f.id === 'mp4');
    if (mp4Format) {
        console.log('✅ MP4 supported - using MP4 for optimal compatibility');
        return mp4Format;
    }
    
    // Fallback to highest priority supported format
    const fallbackFormat = supportedFormats.length > 0 ? supportedFormats[0] : null;
    if (fallbackFormat) {
        console.log(`⚠️ MP4 not supported - using ${fallbackFormat.name} as fallback`);
        
        // Show fallback warning to user
        showFallbackWarning(fallbackFormat);
    }
    
    return fallbackFormat;
}

// Get recording options for selected format
function getRecordingOptions(formatId) {
    const format = supportedFormats.find(f => f.id === formatId);
    if (!format) {
        console.warn(`Format ${formatId} not supported, using fallback`);
        return getOptimalFormat()?.mime || 'video/webm;codecs=vp9,opus';
    }
    
    return format.mime;
}

// Execute after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check supported formats on page load
    checkSupportedFormats();
    
    // Set optimal format as default
    const optimalFormat = getOptimalFormat();
    if (optimalFormat) {
        currentRecordingFormat = optimalFormat.id;
        console.log(`Default format set to: ${optimalFormat.name}`);
    }
    
    // Element references
    const youtubeUrlInput = document.getElementById('youtube-url');
    const webcamBtn = document.getElementById('webcam-btn');
    const recordBtn = document.getElementById('record-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const timerElement = document.getElementById('timer');
    const webcamVideo = document.getElementById('webcam-video');
    const timestampItemsElement = document.getElementById('timestamp-items');
    const recordingStatusElement = document.getElementById('recording-status');
    const reDownloadBtn = document.getElementById('re-download-btn');
    const mirrorToggleBtn = document.getElementById('mirror-toggle');
    const helpModalBtn = document.getElementById('main-help-btn');
    const helpModal = document.getElementById('help-modal');
    const helpModalClose = document.getElementById('help-modal-close');
    
    // Mirror state
    let isMirrored = false;
    
    // Initialize Re-download button as disabled
    reDownloadBtn.disabled = true;
    
    // Modal elements
    const urlModalBtn = document.getElementById('url-modal-btn');
    const urlModal = document.getElementById('url-modal');
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');

    // 유튜브 영상 로드 (Modal Confirm 버튼)
    modalConfirm.addEventListener('click', function() {
        const youtubeUrl = youtubeUrlInput.value.trim();
        
        if (!youtubeUrl) {
            showAlert('Please enter a valid YouTube URL to continue.', 'error');
            return;
        }

        // Extract YouTube video ID
        const videoId = extractYouTubeVideoId(youtubeUrl);
        if (!videoId) {
            showAlert('Invalid YouTube URL format. Please check and try again.', 'error');
            return;
        }

        // Initialize timestamp data
        timestampData.youtube_video_id = videoId;
        timestampData.recording_format = currentRecordingFormat;
        timestampData.created_at = new Date().toISOString();
        timestampData.sync_points = [];
        
        // Clear timestamp list
        clearTimestampList();
        
        // Remove existing players
        if (youtubePlayer) {
            youtubePlayer.destroy();
        }
        if (youtubePlayerOverlay) {
            youtubePlayerOverlay.destroy();
        }

        // Create new YouTube player for split mode
        youtubePlayer = new YT.Player('youtube-player', {
            height: '300',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'playsinline': 1,
                'controls': 1,
                'autoplay': 0,
                'rel': 0
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });

        // Create new YouTube player for overlay mode
        youtubePlayerOverlay = new YT.Player('youtube-player-overlay', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                'playsinline': 1,
                'controls': 1,
                'autoplay': 0,
                'rel': 0
            },
            events: {
                'onReady': onPlayerReadyOverlay,
                'onStateChange': onPlayerStateChange
            }
        });

        // Close modal
        urlModal.style.display = 'none';
        
        console.log('Loading YouTube video...');
        updateStepProgress(1, 'completed');
    });

    // Modal event listeners
    urlModalBtn.addEventListener('click', function() {
        urlModal.style.display = 'flex';
        youtubeUrlInput.focus();
    });

    modalClose.addEventListener('click', function() {
        urlModal.style.display = 'none';
    });

    modalCancel.addEventListener('click', function() {
        urlModal.style.display = 'none';
    });

    // Close modal when clicking outside
    urlModal.addEventListener('click', function(e) {
        if (e.target === urlModal) {
            urlModal.style.display = 'none';
        }
    });

    // Enter key to confirm
    youtubeUrlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            modalConfirm.click();
        }
    });

    // Mirror toggle functionality
    mirrorToggleBtn.addEventListener('change', function() {
        isMirrored = this.checked;
        
        if (isMirrored) {
            webcamVideo.style.transform = 'scaleX(-1)';
        } else {
            webcamVideo.style.transform = 'scaleX(1)';
        }
    });

    // Layout toggle functionality
    const layoutToggleBtn = document.getElementById('layout-toggle');
    const videoGrid = document.querySelector('.video-grid');
    let isExpanded = false;

    layoutToggleBtn.addEventListener('change', function() {
        isExpanded = this.checked;
        
        if (isExpanded) {
            videoGrid.classList.add('expanded');
        } else {
            videoGrid.classList.remove('expanded');
        }
    });

    // Enable webcam
    webcamBtn.addEventListener('click', async function() {
        try {
            webcamStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }, 
                audio: true 
            });
            
            // Set webcam stream for both modes
            webcamVideo.srcObject = webcamStream;
            const webcamVideoOverlay = document.getElementById('webcam-video-overlay');
            if (webcamVideoOverlay) {
                webcamVideoOverlay.srcObject = webcamStream;
            }
            
            // Initialize overlay settings form values
            initializeOverlaySettings();
            
            webcamBtn.disabled = true;
            recordBtn.disabled = false;
            
            showAlert('Webcam successfully activated.', 'success');
            console.log('Webcam activated');
            updateStepProgress(2, 'completed');
            updateStepProgress(3, 'active');
        } catch (error) {
            showAlert('Webcam access error: ' + error.message, 'error');
        }
    });

    // Start recording
    recordBtn.addEventListener('click', function() {
        if (!webcamStream) {
            showAlert('Please enable your webcam first before starting recording.', 'error');
            return;
        }
        
        if (!youtubePlayer) {
            showAlert('Please load a YouTube video first before starting recording.', 'error');
            return;
        }
        
        startRecording();
        recordBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        
        // Change button text to show recording state
        recordBtn.textContent = 'Recording...';
        
        // Show recording status
        recordingStatusElement.style.display = 'flex';
        
        // Add first timestamp (start point)
        addTimestamp('start');
        
        // Show format-specific recording message
        const formatName = supportedFormats.find(f => f.id === currentRecordingFormat)?.name || currentRecordingFormat;
        
        if (currentRecordingFormat === 'mp4') {
            showAlert(`✅ Recording started with ${formatName}. Your video will be ready for professional editing software.`, 'success');
        } else {
            showAlert(`⚠️ Recording started with ${formatName}. This format may require conversion for video editing software.`, 'warning');
        }
        
        console.log('Recording...');
    });

    // Pause recording
    pauseBtn.addEventListener('click', function() {
        if (isRecording && !isPaused) {
            pauseRecording();
            pauseBtn.textContent = 'Resume';
            updateStatus('Paused');
        } else if (isRecording && isPaused) {
            resumeRecording();
            pauseBtn.textContent = 'Pause';
            console.log('Recording...');
        }
    });

    // Stop recording
    stopBtn.addEventListener('click', function() {
        stopRecording();
        recordBtn.disabled = false;
        recordBtn.textContent = 'Start';
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        
        // Hide recording status
        recordingStatusElement.style.display = 'none';
        
        // Add last timestamp (end point)
        addTimestamp('end');
        
        console.log('Recording completed');
        pauseBtn.textContent = 'Pause';
        
        // Enable re-download button
        reDownloadBtn.disabled = false;
        reDownloadBtn.textContent = 'Re-download';
        
        // Download recorded video
        downloadRecordedVideo();
        
        // Download timestamp data
        downloadTimestampData();
    });





    // Re-download button
    reDownloadBtn.addEventListener('click', function() {
        downloadRecordedVideo();
        downloadTimestampData();
    });

    // Help modal functionality
    // Ensure modal is hidden on page load
    helpModal.classList.remove('show');
    
    helpModalBtn.addEventListener('click', function() {
        helpModal.classList.add('show');
    });

    helpModalClose.addEventListener('click', function() {
        helpModal.classList.remove('show');
    });

    // Close help modal when clicking outside
    helpModal.addEventListener('click', function(e) {
        if (e.target === helpModal) {
            helpModal.classList.remove('show');
        }
    });

    // Mode toggle functionality
    const splitModeBtn = document.getElementById('split-mode-btn');
    const overlayModeBtn = document.getElementById('overlay-mode-btn');
    
    if (splitModeBtn) {
        splitModeBtn.addEventListener('click', function() {
            setMode('split');
        });
        
        // Split mode hover info
        splitModeBtn.addEventListener('mouseenter', function() {
            showInfoMessage('Split mode for easier recording and viewing', this);
        });
        
        splitModeBtn.addEventListener('mouseleave', function() {
            hideInfoMessage();
        });
    }
    
    if (overlayModeBtn) {
        overlayModeBtn.addEventListener('click', function() {
            setMode('overlay');
        });
        
        // Overlay mode hover info
        overlayModeBtn.addEventListener('mouseenter', function() {
            showInfoMessage('This is how the final video will look', this);
        });
        
        overlayModeBtn.addEventListener('mouseleave', function() {
            hideInfoMessage();
        });
    }

    // Floating panel functionality
    const overlaySettingsPanel = document.getElementById('overlay-settings-panel');
    const overlaySettingsBtn = document.getElementById('overlay-settings-btn');
    const overlaySettingsToggle = document.getElementById('overlay-settings-toggle');
    const overlayPositionSelect = document.getElementById('overlay-position');
    const overlaySizeSlider = document.getElementById('overlay-size');
    const overlaySizeValue = document.getElementById('overlay-size-value');
    const youtubeVolumeSlider = document.getElementById('youtube-volume');
    const youtubeVolumeValue = document.getElementById('youtube-volume-value');
    const toggleOverlayBtn = document.getElementById('toggle-overlay');

    // Panel show/hide functionality
    if (overlaySettingsBtn) {
        overlaySettingsBtn.addEventListener('click', function() {
            overlaySettingsPanel.classList.toggle('show');
        });
    }

    // Panel toggle functionality (collapse/expand)
    if (overlaySettingsToggle) {
        overlaySettingsToggle.addEventListener('click', function() {
            overlaySettingsPanel.classList.toggle('collapsed');
            this.textContent = overlaySettingsPanel.classList.contains('collapsed') ? '+' : '−';
        });
    }

    // Handle outside clicks to close panel
    if (overlaySettingsPanel) {
        document.addEventListener('click', function(e) {
            if (!overlaySettingsPanel.contains(e.target) && 
                !overlaySettingsBtn.contains(e.target) && 
                overlaySettingsPanel.classList.contains('show')) {
                overlaySettingsPanel.classList.remove('show');
            }
        });
    }

    if (overlayPositionSelect) {
        overlayPositionSelect.addEventListener('change', function(e) {
            overlayPosition = e.target.value;
            updateOverlayLayout();
            updateTimestampDataLayout();
        });
    }

    if (overlaySizeSlider) {
        overlaySizeSlider.addEventListener('input', function(e) {
            overlaySize = parseInt(e.target.value);
            if (overlaySizeValue) {
                overlaySizeValue.textContent = `${overlaySize}%`;
            }
            updateOverlayLayout();
            updateTimestampDataLayout();
        });
    }

    if (youtubeVolumeSlider) {
        youtubeVolumeSlider.addEventListener('input', function(e) {
            youtubeVolume = parseInt(e.target.value);
            if (youtubeVolumeValue) {
                youtubeVolumeValue.textContent = `${youtubeVolume}%`;
            }
            updateYouTubeVolume();
            updateTimestampDataLayout();
        });
    }

    if (toggleOverlayBtn) {
        toggleOverlayBtn.addEventListener('click', function() {
            overlayVisible = !overlayVisible;
            toggleOverlayBtn.textContent = overlayVisible ? 'Hide Overlay' : 'Show Overlay';
            updateOverlayLayout();
            updateTimestampDataLayout();
        });
    }

    // Mirror toggle for overlay mode
    const mirrorToggleOverlay = document.getElementById('mirror-toggle-overlay');
    if (mirrorToggleOverlay) {
        mirrorToggleOverlay.addEventListener('change', function() {
            const webcamVideoOverlay = document.getElementById('webcam-video-overlay');
            if (this.checked) {
                webcamVideoOverlay.style.transform = 'scaleX(-1)';
            } else {
                webcamVideoOverlay.style.transform = 'scaleX(1)';
            }
        });
    }

    // Initialize layout
    initializeLayout();



    // Modal event listeners (이미 위에서 처리됨)
    // urlModalBtn, modalClose, modalCancel, modalConfirm 이벤트는 이미 위에서 처리됨
});

// Set mode function
function setMode(mode) {
    currentMode = mode;
    updateModeDisplay();
    updateLayout();
    updateTimestampDataLayout();
}

// Update mode display
function updateModeDisplay() {
    const splitModeBtn = document.getElementById('split-mode-btn');
    const overlayModeBtn = document.getElementById('overlay-mode-btn');
    
    if (splitModeBtn && overlayModeBtn) {
        // Remove active class from both buttons
        splitModeBtn.classList.remove('active');
        overlayModeBtn.classList.remove('active');
        
        // Add active class to current mode button
        if (currentMode === 'split') {
            splitModeBtn.classList.add('active');
        } else {
            overlayModeBtn.classList.add('active');
        }
    }
}

// Initialize layout
function initializeLayout() {
    updateModeDisplay();
    updateLayout();
    updateTimestampDataLayout();
}

// Initialize overlay settings form values
function initializeOverlaySettings() {
    const overlayPositionSelect = document.getElementById('overlay-position');
    const overlaySizeSlider = document.getElementById('overlay-size');
    const overlaySizeValue = document.getElementById('overlay-size-value');
    const youtubeVolumeSlider = document.getElementById('youtube-volume');
    const youtubeVolumeValue = document.getElementById('youtube-volume-value');
    const toggleOverlayBtn = document.getElementById('toggle-overlay');
    
    if (overlayPositionSelect) {
        overlayPositionSelect.value = overlayPosition;
    }
    if (overlaySizeSlider) {
        overlaySizeSlider.value = overlaySize;
    }
    if (overlaySizeValue) {
        overlaySizeValue.textContent = `${overlaySize}%`;
    }
    if (youtubeVolumeSlider) {
        youtubeVolumeSlider.value = youtubeVolume;
    }
    if (youtubeVolumeValue) {
        youtubeVolumeValue.textContent = `${youtubeVolume}%`;
    }
    if (toggleOverlayBtn) {
        toggleOverlayBtn.textContent = overlayVisible ? 'Hide Overlay' : 'Show Overlay';
    }
}

// Update layout based on current mode
function updateLayout() {
    const splitModeLayout = document.getElementById('split-mode-layout');
    const overlayModeLayout = document.getElementById('overlay-mode-layout');
    const stepProgressContainer = document.querySelector('.step-progress-container');
    
    if (currentMode === 'overlay') {
        splitModeLayout.style.display = 'none';
        overlayModeLayout.style.display = 'block';
        updateOverlayLayout();
        // Reduce gap in overlay mode
        if (stepProgressContainer) {
            stepProgressContainer.style.marginBottom = 'var(--space-xs)';
        }
    } else {
        splitModeLayout.style.display = 'grid';
        overlayModeLayout.style.display = 'none';
        // Restore normal gap in split mode
        if (stepProgressContainer) {
            stepProgressContainer.style.marginBottom = 'var(--space-sm)';
        }
    }
}

// Update overlay layout
function updateOverlayLayout() {
    const youtubeOverlay = document.getElementById('youtube-overlay');
    if (!youtubeOverlay) return;
    
    // Remove all position classes
    youtubeOverlay.classList.remove('overlay-top-right', 'overlay-top-left', 'overlay-bottom-right', 'overlay-bottom-left');
    
    // Add selected position class
    youtubeOverlay.classList.add('overlay-' + overlayPosition);
    
    // Set overlay size (width only, height will be calculated by aspect-ratio)
    youtubeOverlay.style.width = `${overlaySize}%`;
    youtubeOverlay.style.height = 'auto'; // Let CSS aspect-ratio handle the height
    
    // Set visibility
    youtubeOverlay.style.display = overlayVisible ? 'block' : 'none';
}

// Update YouTube volume
function updateYouTubeVolume() {
    if (youtubePlayer && youtubePlayer.setVolume) {
        youtubePlayer.setVolume(youtubeVolume);
    }
    if (youtubePlayerOverlay && youtubePlayerOverlay.setVolume) {
        youtubePlayerOverlay.setVolume(youtubeVolume);
    }
}

// Update timestamp data layout
function updateTimestampDataLayout() {
    timestampData.layout = {
        mode: currentMode,
        overlay_position: overlayPosition,
        overlay_size: overlaySize,
        youtube_volume: youtubeVolume,
        hide_overlay: !overlayVisible
    };
}

// YouTube player ready callback for split mode
function onPlayerReady(event) {
    const title = event.target.getVideoData().title;
    timestampData.youtube_title = title;
    
    console.log('YouTube video loaded');
    showAlert('YouTube video loaded: ' + title, 'success');
}

// YouTube player ready callback for overlay mode
function onPlayerReadyOverlay(event) {
    const title = event.target.getVideoData().title;
    timestampData.youtube_title = title;
    
    console.log('YouTube video loaded (Overlay Mode)');
}

// YouTube player state change callback
function onPlayerStateChange(event) {
    // YouTube states: -1(unstarted), 0(ended), 1(playing), 2(paused), 3(buffering), 5(cued)
    if (isRecording) {
        switch(event.data) {
            case YT.PlayerState.PLAYING:
                // Record the time when YouTube video was first played
                if (youtubeFirstPlayTime === null) {
                    youtubeFirstPlayTime = (Date.now() - recordingStartTime) / 1000;
                    console.log('YouTube first play time:', youtubeFirstPlayTime, 'seconds');
                }
                // Add timestamp when YouTube starts playing
                addTimestamp('youtube_play');
                break;
            case YT.PlayerState.PAUSED:
                // Add timestamp when YouTube is paused
                addTimestamp('youtube_pause');
                break;
            case YT.PlayerState.ENDED:
                // Add timestamp when YouTube video ends
                addTimestamp('youtube_ended');
                break;
        }
    }
}

// Start recording
function startRecording() {
    recordedBlobs = [];
    
    // Get recording options for current format
    const mimeType = getRecordingOptions(currentRecordingFormat);
    const options = { mimeType: mimeType };
    
    console.log(`Starting recording with format: ${currentRecordingFormat} (${mimeType})`);
    
    try {
        // Apply mirror effect to recording if enabled
        if (isMirrored) {
            // Create a canvas to apply mirror effect
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const videoTrack = webcamStream.getVideoTracks()[0];
            
            // Set canvas size
            canvas.width = 1280;
            canvas.height = 720;
            
            // Create new stream with mirror effect
            const canvasStream = canvas.captureStream();
            const audioTrack = webcamStream.getAudioTracks()[0];
            
            if (audioTrack) {
                canvasStream.addTrack(audioTrack);
            }
            
            // Apply mirror effect in real-time
            const video = document.createElement('video');
            video.srcObject = webcamStream;
            video.play();
            
            function drawMirrored() {
                ctx.save();
                ctx.scale(-1, 1);
                ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
                ctx.restore();
                requestAnimationFrame(drawMirrored);
            }
            
            video.onloadedmetadata = () => {
                drawMirrored();
            };
            
            mediaRecorder = new MediaRecorder(canvasStream, options);
        } else {
            mediaRecorder = new MediaRecorder(webcamStream, options);
        }
    } catch (error) {
        console.error('MediaRecorder creation error:', error);
        
        // Try fallback format if current format fails
        if (currentRecordingFormat !== 'webm-vp9') {
            console.log('Trying fallback format...');
            currentRecordingFormat = 'webm-vp9';
            startRecording(); // Retry with fallback
            return;
        }
        
        showAlert('Cannot start recording: ' + error.message, 'error');
        return;
    }
    
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start(100); // Collect data every 100ms
    
    isRecording = true;
    isPaused = false;
    recordingStartTime = Date.now();
    youtubeFirstPlayTime = null; // Reset YouTube first play time when recording starts
    
    // Start timer
    startTimer();
}

// Pause recording
function pauseRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.pause();
        isPaused = true;
        
        // Pause timer
        clearInterval(recordingTimer);
        
        // Add timestamp
        addTimestamp('pause');
    }
}

// Resume recording
function resumeRecording() {
    if (mediaRecorder && isRecording && isPaused) {
        mediaRecorder.resume();
        isPaused = false;
        
        // Resume timer
        startTimer();
        
        // Add timestamp
        addTimestamp('resume');
    }
}

// Stop recording
function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        isPaused = false;
        
        // Stop timer
        clearInterval(recordingTimer);
    }
}

// Handle recording data
function handleDataAvailable(event) {
    if (event.data && event.data.size > 0) {
        recordedBlobs.push(event.data);
    }
}

// Start timer
function startTimer() {
    const timerElement = document.getElementById('timer');
    const startTime = Date.now() - (isPaused ? 0 : getElapsedTime());
    
    recordingTimer = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        timerElement.textContent = formatTime(elapsedTime);
    }, 1000);
}

// Calculate elapsed time
function getElapsedTime() {
    return Date.now() - recordingStartTime;
}

// Format time (milliseconds -> HH:MM:SS)
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
    ].join(':');
}

// Clear timestamp list
function clearTimestampList() {
    const timestampItemsElement = document.getElementById('timestamp-items');
    timestampItemsElement.innerHTML = `
        <div style="text-align: center; color: var(--color-text-muted); padding: var(--space-lg);">
            No timestamps yet. Start recording to add timestamps.
        </div>
    `;
}

// Add timestamp
function addTimestamp(event) {
    if (!isRecording && event !== 'end') return;
    
    const reactionTime = (Date.now() - recordingStartTime) / 1000;
    
    // 'start' 이벤트일 때와 유튜브가 아직 재생되지 않았을 때는 유튜브 시간을 null로 설정
    let currentYoutubeTime = null;
    if (event !== 'start' && youtubeFirstPlayTime !== null) {
        currentYoutubeTime = youtubePlayer ? youtubePlayer.getCurrentTime() : null;
    }
    
    // Calculate relative YouTube time (based on first play time)
    let relativeYoutubeTime = null;
    
    // Apply relative time only if YouTube first play time is recorded and event is not 'start'
    if (youtubeFirstPlayTime !== null && event !== 'start' && currentYoutubeTime !== null) {
        // Adjust YouTube time to match reaction video time
        relativeYoutubeTime = reactionTime - youtubeFirstPlayTime;
    }
    
    const timestamp = {
        reaction_time: reactionTime,
        youtube_time: currentYoutubeTime, // Original YouTube time (null if not playing yet)
        relative_youtube_time: relativeYoutubeTime, // Relative YouTube time (null if not playing yet)
        event: event,
        youtube_first_play_time: youtubeFirstPlayTime // Store first play time info
    };
    
    timestampData.sync_points.push(timestamp);
    
    // Display timestamp in list with improved formatting
    displayTimestamp(timestamp);
}

// Display timestamp with improved UI
function displayTimestamp(timestamp) {
    const timestampItemsElement = document.getElementById('timestamp-items');
    
    // Remove placeholder if exists
    if (timestampItemsElement.children.length === 1 && 
        timestampItemsElement.children[0].style.textAlign === 'center') {
        timestampItemsElement.innerHTML = '';
    }
    
    const item = document.createElement('div');
    item.className = 'timestamp-item';
    
    const timeElement = document.createElement('div');
    timeElement.className = 'timestamp-time';
    timeElement.textContent = formatTime(timestamp.reaction_time * 1000);
    
    const eventElement = document.createElement('div');
    eventElement.className = 'timestamp-event';
    eventElement.textContent = getEventDisplayName(timestamp.event);
    
    const youtubeElement = document.createElement('div');
    youtubeElement.className = 'timestamp-youtube';
    
    if (timestamp.youtube_time !== null) {
        if (timestamp.youtube_first_play_time !== null && timestamp.relative_youtube_time !== null) {
            youtubeElement.textContent = `YouTube: ${timestamp.youtube_time.toFixed(2)}s (relative: ${timestamp.relative_youtube_time.toFixed(2)}s)`;
        } else {
            youtubeElement.textContent = `YouTube: ${timestamp.youtube_time.toFixed(2)}s`;
        }
    } else {
        youtubeElement.textContent = 'YouTube: Not playing yet';
    }
    
    item.appendChild(timeElement);
    item.appendChild(eventElement);
    item.appendChild(youtubeElement);
    
    timestampItemsElement.appendChild(item);
    
    // Auto scroll
    timestampItemsElement.scrollTop = timestampItemsElement.scrollHeight;
}

// Get display name for event types
function getEventDisplayName(event) {
    const eventNames = {
        'start': 'START',
        'end': 'END',
        'sync': 'SYNC',
        'pause': 'PAUSE',
        'resume': 'RESUME',
        'youtube_play': 'YT PLAY',
        'youtube_pause': 'YT PAUSE',
        'youtube_ended': 'YT END'
    };
    return eventNames[event] || event.toUpperCase();
}

// Download recorded video
function downloadRecordedVideo() {
    if (recordedBlobs.length === 0) {
        showAlert('No recorded video available.', 'error');
        return;
    }
    
    // Get file extension based on current format
    const getFileExtension = (format) => {
        switch(format) {
            case 'mp4': return 'mp4';
            case 'webm-h264': return 'webm';
            case 'webm-vp9': return 'webm';
            default: return 'webm';
        }
    };
    
    const getMimeType = (format) => {
        switch(format) {
            case 'mp4': return 'video/mp4';
            case 'webm-h264': return 'video/webm';
            case 'webm-vp9': return 'video/webm';
            default: return 'video/webm';
        }
    };
    
    const extension = getFileExtension(currentRecordingFormat);
    const mimeType = getMimeType(currentRecordingFormat);
    const filename = `reaction_${Date.now()}.${extension}`;
    
    const blob = new Blob(recordedBlobs, { type: mimeType });
    timestampData.reaction_video = filename;
    timestampData.recording_format = currentRecordingFormat;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Release URL after delay
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
    
    const formatName = supportedFormats.find(f => f.id === currentRecordingFormat)?.name || currentRecordingFormat;
    
    // Show format-specific download message
    if (currentRecordingFormat === 'mp4') {
        showAlert(`✅ Recorded video (${formatName}) has been downloaded. Ready for Final Cut Pro, Premiere Pro, and other editing software.`, 'success');
    } else {
        showAlert(`⚠️ Recorded video (${formatName}) has been downloaded. This format may require conversion for video editing software.`, 'warning');
    }
}

// Download timestamp data
function downloadTimestampData() {
    if (timestampData.sync_points.length === 0) {
        showAlert('No timestamp data available.', 'error');
        return;
    }
    
    const dataStr = JSON.stringify(timestampData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const filename = `timestamp_${Date.now()}.json`;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Release URL after delay
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
    
    showAlert('Timestamp data has been downloaded.', 'success');
}

// Extract YouTube video ID
function extractYouTubeVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// Update status
function updateStatus(text) {
    // Status updates are now silent - no UI updates
    console.log('Status:', text);
}

// Show alert message
// Update step progress
function updateStepProgress(stepNumber, status) {
    const stepElement = document.getElementById(`step-${stepNumber}`);
    if (stepElement) {
        stepElement.className = `step-item ${status}`;
        
        // Update step 3 content when it becomes active
        if (stepNumber === 3 && status === 'active') {
            const stepContent = stepElement.querySelector('.step-content');
            stepContent.innerHTML = `
                <div class="step-title">Start Recording</div>
                <div class="step-status">Ready to record</div>
            `;
        }
    }
}

function showAlert(text, type) {
    // Create alert element
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type}`;
    
    // Add icon based on type
    let icon = '';
    switch(type) {
        case 'success':
            icon = '✅ ';
            break;
        case 'error':
            icon = '❌ ';
            break;
        case 'warning':
            icon = '⚠️ ';
            break;
        case 'info':
            icon = 'ℹ️ ';
            break;
    }
    
    alertElement.innerHTML = `<strong>${icon}${text}</strong>`;
    
    // Add to page
    document.body.appendChild(alertElement);
    
    // Position it at the top right
    alertElement.style.position = 'fixed';
    alertElement.style.top = '20px';
    alertElement.style.right = '20px';
    alertElement.style.zIndex = '10000';
    alertElement.style.minWidth = '300px';
    alertElement.style.maxWidth = '400px';
    alertElement.style.padding = '12px 16px';
    alertElement.style.borderRadius = '8px';
    alertElement.style.fontSize = '14px';
    alertElement.style.fontWeight = '500';
    alertElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    alertElement.style.backdropFilter = 'blur(10px)';
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.parentNode.removeChild(alertElement);
        }
    }, 4000);
}

// Show info message for mode buttons
function showInfoMessage(text, button) {
    // Remove existing info message
    hideInfoMessage();
    
    // Create info message element
    const infoElement = document.createElement('div');
    infoElement.id = 'mode-info-message';
    infoElement.textContent = text;
    
    // Add to page
    document.body.appendChild(infoElement);
    
    // Get button position
    const buttonRect = button.getBoundingClientRect();
    
    // Position it above the button
    infoElement.style.position = 'fixed';
    infoElement.style.top = (buttonRect.top - 35) + 'px';
    infoElement.style.left = (buttonRect.left + buttonRect.width / 2) + 'px';
    infoElement.style.transform = 'translateX(-50%)';
    infoElement.style.zIndex = '10000';
    infoElement.style.padding = '6px 10px';
    infoElement.style.borderRadius = '6px';
    infoElement.style.fontSize = '12px';
    infoElement.style.fontWeight = '500';
    infoElement.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    infoElement.style.color = 'white';
    infoElement.style.boxShadow = 'var(--shadow-md)';
    infoElement.style.backdropFilter = 'blur(10px)';
    infoElement.style.transition = 'opacity 0.2s ease';
    infoElement.style.whiteSpace = 'nowrap';
}

// Hide info message
function hideInfoMessage() {
    const infoElement = document.getElementById('mode-info-message');
    if (infoElement) {
        infoElement.style.opacity = '0';
        setTimeout(() => {
            if (infoElement.parentNode) {
                infoElement.parentNode.removeChild(infoElement);
            }
        }, 200);
    }
}

// Show fallback warning when MP4 is not supported
function showFallbackWarning(fallbackFormat) {
    const userAgent = navigator.userAgent;
    let browserInfo = '';
    let osInfo = '';
    
    // Detect browser
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        browserInfo = 'Safari';
    } else if (userAgent.includes('Chrome')) {
        browserInfo = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
        browserInfo = 'Firefox';
    } else if (userAgent.includes('Edge')) {
        browserInfo = 'Edge';
    } else {
        browserInfo = 'your browser';
    }
    
    // Detect OS
    if (userAgent.includes('Mac')) {
        osInfo = 'macOS';
    } else if (userAgent.includes('Windows')) {
        osInfo = 'Windows';
    } else if (userAgent.includes('Linux')) {
        osInfo = 'Linux';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        osInfo = 'iOS';
    } else if (userAgent.includes('Android')) {
        osInfo = 'Android';
    } else {
        osInfo = 'your system';
    }
    
    const warningMessage = `⚠️ MP4 recording not supported in ${browserInfo} on ${osInfo}. Using ${fallbackFormat.name} format instead. This file may require conversion for video editing software.`;
    
    showAlert(warningMessage, 'warning');
}



// Modal event listeners (이미 위에서 처리됨)
