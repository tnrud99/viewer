// FileManager Module - Handles file uploads, downloads, and file operations
class FileManager {
    constructor() {
        this.supportedVideoFormats = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
        this.supportedImageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        this.maxFileSize = 100 * 1024 * 1024; // 100MB
        this.setupEventListeners();
    }

    // Setup event listeners for file operations
    setupEventListeners() {
        // Timestamp file input
        const timestampFileInput = document.getElementById('timestampFileInput');
        if (timestampFileInput) {
            timestampFileInput.addEventListener('change', (e) => {
                this.handleTimestampFileUpload(e.target.files[0]);
            });
        }

        // Reaction video input
        const reactionVideoInput = document.getElementById('reactionVideoInput');
        if (reactionVideoInput) {
            reactionVideoInput.addEventListener('change', (e) => {
                this.handleVideoFileUpload(e.target.files[0]);
            });
        }

        // Load button
        const loadBtn = document.getElementById('loadBtn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                this.loadFiles();
            });
        }
    }

    // Handle timestamp file upload
    handleTimestampFileUpload(file) {
        if (!file) return;

        if (!this.validateFile(file, 'json')) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const timestampData = JSON.parse(e.target.result);
                this.processTimestampData(timestampData);
            } catch (error) {
                this.showError('Invalid JSON file: ' + error.message);
            }
        };
        reader.onerror = () => {
            this.showError('Failed to read timestamp file');
        };
        reader.readAsText(file);
    }

    // Handle video file upload
    handleVideoFileUpload(file) {
        if (!file) return;

        if (!this.validateFile(file, 'video')) {
            return;
        }

        const videoUrl = URL.createObjectURL(file);
        this.loadVideoFile(videoUrl, file.name);
    }

    // Validate file
    validateFile(file, type) {
        // Check file size
        if (file.size > this.maxFileSize) {
            this.showError(`File too large. Maximum size is ${this.formatFileSize(this.maxFileSize)}`);
            return false;
        }

        // Check file type
        const extension = file.name.split('.').pop().toLowerCase();
        
        switch (type) {
            case 'json':
                if (extension !== 'json') {
                    this.showError('Please select a JSON file');
                    return false;
                }
                break;
            case 'video':
                if (!this.supportedVideoFormats.includes(extension)) {
                    this.showError(`Unsupported video format. Supported: ${this.supportedVideoFormats.join(', ')}`);
                    return false;
                }
                break;
            case 'image':
                if (!this.supportedImageFormats.includes(extension)) {
                    this.showError(`Unsupported image format. Supported: ${this.supportedImageFormats.join(', ')}`);
                    return false;
                }
                break;
        }

        return true;
    }

    // Process timestamp data
    processTimestampData(timestampData) {
        try {
            // Validate timestamp data structure
            if (!this.validateTimestampData(timestampData)) {
                this.showError('Invalid timestamp data structure');
                return;
            }

            // Store timestamp data globally
            window.timestampData = timestampData;
            
            // Pre-process events for quick lookup
            this.preprocessTimestampEvents(timestampData);
            
            this.showSuccess('Timestamp file loaded successfully');
            
            // Notify other modules
            this.notifyTimestampLoaded(timestampData);
            
        } catch (error) {
            this.showError('Failed to process timestamp data: ' + error.message);
        }
    }

    // Validate timestamp data structure
    validateTimestampData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }

        if (!data.sync_points || !Array.isArray(data.sync_points)) {
            return false;
        }

        // Check if sync points have required properties
        for (const point of data.sync_points) {
            if (!point.reaction_time || !point.relative_youtube_time || !point.event) {
                return false;
            }
        }

        return true;
    }

    // Preprocess timestamp events
    preprocessTimestampEvents(timestampData) {
        if (!timestampData.sync_points || timestampData.sync_points.length === 0) {
            return;
        }

        // Clear existing events
        window.pauseEvents = [];
        window.playEvents = [];
        window.debugInfo = [];
        
        // Process all events
        timestampData.sync_points.forEach(point => {
            // Store first play time
            if (point.youtube_first_play_time !== undefined && point.youtube_first_play_time !== null) {
                window.youtubeFirstPlayTime = point.youtube_first_play_time;
            }
            
            // Categorize events
            if (point.event === 'youtube_pause') {
                window.pauseEvents.push(point);
            } else if (point.event === 'youtube_play') {
                window.playEvents.push(point);
            }
        });
        
        // Sort events by reaction_time
        window.pauseEvents.sort((a, b) => a.reaction_time - b.reaction_time);
        window.playEvents.sort((a, b) => a.reaction_time - b.reaction_time);
        
        // Find first sync point (first play event)
        window.firstSyncPoint = window.playEvents.length > 0 ? window.playEvents[0] : null;
        
        if (window.firstSyncPoint) {
            console.log("First sync point loaded:", window.firstSyncPoint);
            console.log("All pause events:", window.pauseEvents);
            console.log("All play events:", window.playEvents);
            
            this.addDebugMessage("Timestamp file loaded successfully");
            this.addDebugMessage(`Found ${window.playEvents.length} play events and ${window.pauseEvents.length} pause events`);
        }
    }

    // Load video file
    loadVideoFile(videoUrl, fileName) {
        const reactionPlayer = document.getElementById('reaction-player');
        const reactionYoutubeContainer = document.getElementById('reaction-youtube-container');
        
        if (reactionPlayer && reactionYoutubeContainer) {
            // Hide YouTube container, show video player
            reactionYoutubeContainer.style.display = 'none';
            reactionPlayer.style.display = 'block';
            
            // Set video source
            reactionPlayer.src = videoUrl;
            reactionPlayer.load();
            
            this.showSuccess(`Video file loaded: ${fileName}`);
            
            // Notify other modules
            this.notifyVideoLoaded(videoUrl, fileName);
        }
    }

    // Load files (main load function)
    loadFiles() {
        const timestampFile = document.getElementById('timestampFileInput')?.files[0];
        const videoFile = document.getElementById('reactionVideoInput')?.files[0];
        
        if (!timestampFile && !videoFile) {
            this.showError('Please select at least one file to load');
            return;
        }
        
        if (timestampFile) {
            this.handleTimestampFileUpload(timestampFile);
        }
        
        if (videoFile) {
            this.handleVideoFileUpload(videoFile);
        }
    }

    // Download timestamp data
    downloadTimestampData(data, filename = 'timestamp-data.json') {
        try {
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            
            URL.revokeObjectURL(url);
            
            this.showSuccess('Timestamp data downloaded successfully');
        } catch (error) {
            this.showError('Failed to download timestamp data: ' + error.message);
        }
    }

    // Export current state
    exportCurrentState() {
        const state = {
            timestamp: window.timestampData,
            settings: window.settingsManager ? window.settingsManager.getAllSettings() : {},
            videoPlayer: window.videoPlayer ? window.videoPlayer.getCurrentState() : {},
            timestamp: new Date().toISOString()
        };
        
        this.downloadTimestampData(state, 'viewer-state.json');
    }

    // Import state
    importState(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const state = JSON.parse(e.target.result);
                    
                    // Apply imported state
                    if (state.timestamp) {
                        this.processTimestampData(state.timestamp);
                    }
                    
                    if (state.settings && window.settingsManager) {
                        window.settingsManager.updateSettings(state.settings);
                    }
                    
                    this.showSuccess('State imported successfully');
                    resolve(state);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Show success message
    showSuccess(message) {
        if (window.uiManager) {
            window.uiManager.showMessage(message, 'success');
        } else {
            console.log('Success:', message);
        }
    }

    // Show error message
    showError(message) {
        if (window.uiManager) {
            window.uiManager.showMessage(message, 'error');
        } else {
            console.error('Error:', message);
        }
    }

    // Add debug message
    addDebugMessage(message) {
        if (window.debugInfo) {
            window.debugInfo.push({
                timestamp: new Date().toISOString(),
                message: message
            });
        }
    }

    // Notify timestamp loaded
    notifyTimestampLoaded(timestampData) {
        const event = new CustomEvent('timestampLoaded', {
            detail: { timestampData }
        });
        document.dispatchEvent(event);
    }

    // Notify video loaded
    notifyVideoLoaded(videoUrl, fileName) {
        const event = new CustomEvent('videoLoaded', {
            detail: { videoUrl, fileName }
        });
        document.dispatchEvent(event);
    }

    // Get file info
    getFileInfo(file) {
        return {
            name: file.name,
            size: this.formatFileSize(file.size),
            type: file.type,
            lastModified: new Date(file.lastModified).toLocaleString()
        };
    }

    // Check if file is supported
    isFileSupported(file, type) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        switch (type) {
            case 'video':
                return this.supportedVideoFormats.includes(extension);
            case 'image':
                return this.supportedImageFormats.includes(extension);
            case 'json':
                return extension === 'json';
            default:
                return false;
        }
    }

    // Get supported formats
    getSupportedFormats(type) {
        switch (type) {
            case 'video':
                return this.supportedVideoFormats;
            case 'image':
                return this.supportedImageFormats;
            default:
                return [];
        }
    }
}

// Export for use in main viewer
window.FileManager = FileManager;
