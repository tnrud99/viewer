export class FileManager {
    constructor(timelineRenderer) {
        this.timelineRenderer = timelineRenderer;
        this.timestampData = null;
        this.createdAt = null;
        this.reactionVideoUrl = null;
        
        this.setupFileControls();
        this.setupReactionUrlControls();
        // loadSampleData는 초기화 후 별도로 호출
    }

    setupFileControls() {
        const loadBtn = document.getElementById('load-btn');
        const fileInput = document.getElementById('timestamp-file');
        const exportBtn = document.getElementById('export-btn');

        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileLoad(e);
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportTimestamps();
            });
        }
    }

    setupReactionUrlControls() {
        const urlInput = document.getElementById('reaction-video-url');
        const setUrlBtn = document.getElementById('set-reaction-url-btn');
        const currentUrlSpan = document.getElementById('current-reaction-url');

        if (setUrlBtn) {
            setUrlBtn.addEventListener('click', () => this.setReactionVideoUrl());
        }
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.setReactionVideoUrl();
                }
            });
        }
    }

    loadSampleData() {
        // 실제 timestamp_1751179878134.json 파일에서 데이터 로드
        fetch('./timestamp_1751179878134.json')
            .then(response => response.json())
            .then(data => {
                this.timestampData = data;
                this.createdAt = data.created_at;
                this.timelineRenderer.setTimestamps(data.sync_points);
                this.timelineRenderer.renderTimeline();
                
                // 히스토리 매니저에 원본 데이터 설정
                if (window.simpleEditor && window.simpleEditor.getHistoryManager) {
                    console.log('Setting original data and initial state from loaded file. Sync points:', data.sync_points.length);
                    window.simpleEditor.getHistoryManager().setOriginalData(data.sync_points);
                    window.simpleEditor.getHistoryManager().addState(data.sync_points);
                } else {
                    console.log('Cannot set history: simpleEditor or historyManager not available (loaded file)');
                }
                
                this.updateFileInfo();
            })
            .catch(error => {
                console.error('Error loading sample timestamp file:', error);
                // 파일 로드 실패 시 기본 데이터 사용
                this.loadDefaultSampleData();
            });
    }

    loadDefaultSampleData() {
        // 기본 샘플 데이터 (fallback)
        this.timestampData = {
            "youtube_video_id": "AbZH7XWDW_k",
            "youtube_title": "TAEYEON 태연 'INVU' MV",
            "reaction_video": "reaction_1751179878125.webm",
            "created_at": "2025-06-29T06:45:25.168Z",
            "layout": {
                "reaction_position": "left",
                "youtube_position": "right",
                "reaction_size": 0.5,
                "youtube_size": 0.5
            },
            "sync_points": [
                {
                    "reaction_time": 0,
                    "youtube_time": null,
                    "relative_youtube_time": null,
                    "event": "start",
                    "youtube_first_play_time": null
                },
                {
                    "reaction_time": 11.061,
                    "youtube_time": 0.019108165939331054,
                    "relative_youtube_time": 0.0009999999999994458,
                    "event": "youtube_play",
                    "youtube_first_play_time": 11.06
                },
                {
                    "reaction_time": 21.974,
                    "youtube_time": 10.883888,
                    "relative_youtube_time": 10.914,
                    "event": "youtube_pause",
                    "youtube_first_play_time": 11.06
                },
                {
                    "reaction_time": 51.624,
                    "youtube_time": 11.035833165939332,
                    "relative_youtube_time": 40.564,
                    "event": "youtube_play",
                    "youtube_first_play_time": 11.06
                },
                {
                    "reaction_time": 61.03,
                    "youtube_time": 20.43695,
                    "relative_youtube_time": 49.97,
                    "event": "youtube_pause",
                    "youtube_first_play_time": 11.06
                },
                {
                    "reaction_time": 83.673,
                    "youtube_time": 100.350219,
                    "relative_youtube_time": 72.613,
                    "event": "youtube_play",
                    "youtube_first_play_time": 11.06
                },
                {
                    "reaction_time": 92.975,
                    "youtube_time": 109.646435,
                    "relative_youtube_time": 81.91499999999999,
                    "event": "youtube_pause",
                    "youtube_first_play_time": 11.06
                },
                {
                    "reaction_time": 128.754,
                    "youtube_time": 109.646435,
                    "relative_youtube_time": 117.69399999999999,
                    "event": "end",
                    "youtube_first_play_time": 11.06
                }
            ]
        };

        this.createdAt = this.timestampData.created_at;
        this.timelineRenderer.setTimestamps(this.timestampData.sync_points);
        this.timelineRenderer.renderTimeline();
        
        // 히스토리 매니저에 원본 데이터 설정
        if (window.simpleEditor && window.simpleEditor.getHistoryManager) {
            console.log('Setting original data and initial state from default sample. Sync points:', this.timestampData.sync_points.length);
            window.simpleEditor.getHistoryManager().setOriginalData(this.timestampData.sync_points);
            window.simpleEditor.getHistoryManager().addState(this.timestampData.sync_points);
        } else {
            console.log('Cannot set history: simpleEditor or historyManager not available (default sample)');
        }
        
        this.updateFileInfo();
    }

    handleFileLoad(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.loadTimestampData(data);
            } catch (error) {
                alert('Error loading file: Invalid JSON format');
                console.error('File load error:', error);
            }
        };
        reader.readAsText(file);
    }

    loadTimestampData(data) {
        if (!data.sync_points || !Array.isArray(data.sync_points)) {
            alert('Error: Invalid timestamp file format');
            return;
        }

        this.timestampData = data;
        this.createdAt = data.created_at;
        this.timelineRenderer.setTimestamps(data.sync_points);
        this.timelineRenderer.renderTimeline();
        
        // 히스토리 매니저에 원본 데이터 설정
        if (window.simpleEditor && window.simpleEditor.getHistoryManager) {
            window.simpleEditor.getHistoryManager().setOriginalData(data.sync_points);
            window.simpleEditor.getHistoryManager().addState(data.sync_points);
        }
        
        this.updateFileInfo();
    }

    updateFileInfo() {
        const fileNameDisplay = document.getElementById('file-name');
        if (fileNameDisplay) {
            fileNameDisplay.textContent = 'timestamp_1751179878134.json (샘플 데이터)';
        }
    }

    setReactionVideoUrl() {
        const urlInput = document.getElementById('reaction-video-url');
        const currentUrlSpan = document.getElementById('current-reaction-url');
        
        if (!urlInput) return;
        
        const url = urlInput.value.trim();
        
        if (!url) {
            alert('Please enter a valid YouTube URL');
            return;
        }
        
        // YouTube URL 유효성 검사
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(youtubeRegex);
        
        if (!match) {
            alert('Please enter a valid YouTube URL');
            return;
        }
        
        const videoId = match[4];
        this.reactionVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        // UI 업데이트
        if (currentUrlSpan) {
            currentUrlSpan.textContent = `Current: ${this.reactionVideoUrl}`;
            currentUrlSpan.className = 'current-url has-url';
        }
        
        // 입력창 클리어
        urlInput.value = '';
        
        console.log('Reaction video URL set:', this.reactionVideoUrl);
        
        // PreviewManager에 새로운 URL 전달
        if (window.simpleEditor && window.simpleEditor.getPreviewManager) {
            window.simpleEditor.getPreviewManager().updateReactionVideoUrl(this.reactionVideoUrl);
        }
    }

    exportTimestamps() {
        // 현재 타임스탬프 데이터 가져오기
        const currentTimestamps = this.timelineRenderer.timestamps;
        
        // timestamp_1751179878134.json과 동일한 구조로 변환
        const validatedTimestamps = currentTimestamps.map(timestamp => ({
            reaction_time: timestamp.reaction_time,
            youtube_time: timestamp.youtube_time || null,
            relative_youtube_time: timestamp.relative_youtube_time || null,
            event: timestamp.event,
            youtube_first_play_time: timestamp.youtube_first_play_time || null
        }));

        const exportData = {
            youtube_video_id: "AbZH7XWDW_k",
            youtube_title: "TAEYEON 태연 'INVU' MV",
            reaction_video: "reaction_1751179878125.webm",
            created_at: this.createdAt || new Date().toISOString(),
            layout: {
                reaction_position: "left",
                youtube_position: "right",
                reaction_size: 0.5,
                youtube_size: 0.5
            },
            sync_points: validatedTimestamps
        };

        console.log('Exporting timestamps with correct format:', exportData);
        
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timestamp_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    getTimestampData() {
        return this.timestampData;
    }

    getCreatedAt() {
        return this.createdAt;
    }
}
