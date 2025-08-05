/**
 * YouTube Reaction Video Recorder - JavaScript Functions
 */

// Global variables
let youtubePlayer = null;
let mediaRecorder = null;
let recordedBlobs = [];
let webcamStream = null;
let recordingStartTime = 0;
let recordingTimer = null;
let isRecording = false;
let isPaused = false;
let youtubeReady = false;
let youtubeFirstPlayTime = null; // Time when YouTube video was first played
let timestampData = {
    youtube_video_id: '',
    youtube_title: '',
    reaction_video: '',
    created_at: '',
    layout: {
        reaction_position: 'left',
        youtube_position: 'right',
        reaction_size: 0.5,
        youtube_size: 0.5
    },
    sync_points: []
};

// YouTube API callback
function onYouTubeIframeAPIReady() {
    youtubeReady = true;
    document.getElementById('status').textContent = 'Status: YouTube API Ready';
}

// Execute after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Element references
    const youtubeUrlInput = document.getElementById('youtube-url');
    const loadBtn = document.getElementById('load-btn');
    const webcamBtn = document.getElementById('webcam-btn');
    const recordBtn = document.getElementById('record-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const markBtn = document.getElementById('mark-btn');
    const timerElement = document.getElementById('timer');
    const statusElement = document.getElementById('status');
    const messageElement = document.getElementById('message');
    const webcamVideo = document.getElementById('webcam-video');
    const timestampItemsElement = document.getElementById('timestamp-items');

    // 유튜브 영상 로드
    loadBtn.addEventListener('click', function() {
        const youtubeUrl = youtubeUrlInput.value.trim();
        
        if (!youtubeUrl) {
            showMessage('Please enter a YouTube URL.', 'error');
            return;
        }

        // Extract YouTube video ID
        const videoId = extractYouTubeVideoId(youtubeUrl);
        if (!videoId) {
            showMessage('Not a valid YouTube URL.', 'error');
            return;
        }

        // Initialize timestamp data
        timestampData.youtube_video_id = videoId;
        timestampData.created_at = new Date().toISOString();
        timestampData.sync_points = [];
        
        // Remove existing player
        if (youtubePlayer) {
            youtubePlayer.destroy();
        }

        // Create new YouTube player
        youtubePlayer = new YT.Player('youtube-player', {
            height: '360',
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

        statusElement.textContent = 'Status: Loading YouTube video...';
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
            
            webcamVideo.srcObject = webcamStream;
            webcamBtn.disabled = true;
            recordBtn.disabled = false;
            
            showMessage('Webcam successfully activated.', 'success');
            statusElement.textContent = 'Status: Webcam activated';
        } catch (error) {
            showMessage('Webcam access error: ' + error.message, 'error');
        }
    });

    // Start recording
    recordBtn.addEventListener('click', function() {
        if (!webcamStream) {
            showMessage('Please activate webcam first.', 'error');
            return;
        }
        
        if (!youtubePlayer) {
            showMessage('Please load a YouTube video first.', 'error');
            return;
        }
        
        startRecording();
        recordBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        markBtn.disabled = false;
        
        // Add first timestamp (start point)
        addTimestamp('start');
        
        statusElement.textContent = 'Status: Recording...';
        recordBtn.classList.add('recording');
    });

    // Pause recording
    pauseBtn.addEventListener('click', function() {
        if (isRecording && !isPaused) {
            pauseRecording();
            pauseBtn.textContent = 'Resume';
            statusElement.textContent = 'Status: Paused';
        } else if (isRecording && isPaused) {
            resumeRecording();
            pauseBtn.textContent = 'Pause';
            statusElement.textContent = 'Status: Recording...';
        }
    });

    // Stop recording
    stopBtn.addEventListener('click', function() {
        stopRecording();
        recordBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        markBtn.disabled = true;
        
        // Add last timestamp (end point)
        addTimestamp('end');
        
        statusElement.textContent = 'Status: Recording completed';
        recordBtn.classList.remove('recording');
        pauseBtn.textContent = 'Pause';
        
        // Download recorded video
        downloadRecordedVideo();
        
        // Download timestamp data
        downloadTimestampData();
    });

    // Add timestamp marker
    markBtn.addEventListener('click', function() {
        addTimestamp('sync');
        showMessage('Timestamp added successfully.', 'success');
    });
});

// YouTube player ready callback
function onPlayerReady(event) {
    const title = event.target.getVideoData().title;
    timestampData.youtube_title = title;
    
    document.getElementById('status').textContent = 'Status: YouTube video loaded';
    showMessage('YouTube video loaded: ' + title, 'success');
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
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    
    try {
        mediaRecorder = new MediaRecorder(webcamStream, options);
    } catch (error) {
        console.error('MediaRecorder creation error:', error);
        showMessage('Cannot start recording: ' + error.message, 'error');
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
    
    // Display timestamp in list (with relative time)
    const timestampItemsElement = document.getElementById('timestamp-items');
    const item = document.createElement('div');
    item.className = 'timestamp-item';
    
    // Change display format (add relative time)
    let displayText = `${formatTime(reactionTime * 1000)} - ${event}`;
    
    if (currentYoutubeTime !== null) {
        if (youtubeFirstPlayTime !== null && relativeYoutubeTime !== null) {
            displayText += ` (YouTube original: ${currentYoutubeTime.toFixed(2)}s, relative: ${relativeYoutubeTime.toFixed(2)}s)`;
        } else {
            displayText += ` (YouTube: ${currentYoutubeTime.toFixed(2)}s)`;
        }
    } else {
        displayText += ` (YouTube: 아직 재생되지 않음)`;
    }
    
    item.textContent = displayText;
    timestampItemsElement.appendChild(item);
    
    // Auto scroll
    timestampItemsElement.scrollTop = timestampItemsElement.scrollHeight;
}

// Download recorded video
function downloadRecordedVideo() {
    const blob = new Blob(recordedBlobs, { type: 'video/webm' });
    const filename = `reaction_${Date.now()}.webm`;
    timestampData.reaction_video = filename;
    
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
    
    showMessage('Recorded video has been downloaded.', 'success');
}

// Download timestamp data
function downloadTimestampData() {
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
    
    showMessage('Timestamp data has been downloaded.', 'success');
}

// Extract YouTube video ID
function extractYouTubeVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// Display message
function showMessage(text, type) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = text;
    messageElement.className = 'message ' + type;
    
    // Hide message after 3 seconds
    setTimeout(() => {
        messageElement.className = 'message';
    }, 3000);
}
