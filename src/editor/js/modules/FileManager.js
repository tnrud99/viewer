export class FileManager {
    constructor(timelineRenderer) {
        this.timelineRenderer = timelineRenderer;
        this.timestampData = null;
        this.createdAt = null;
        
        this.setupFileControls();
        this.loadSampleData();
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

    loadSampleData() {
        // 샘플 데이터 로드
        this.timestampData = {
            "sync_points": [
                {
                    "reaction_time": 0,
                    "youtube_time": 0,
                    "relative_youtube_time": 0,
                    "event": "start",
                    "youtube_video_id": "AbZH7XWDW_k",
                    "youtube_title": "Sample Video"
                },
                {
                    "reaction_time": 11.061,
                    "youtube_time": 0.001,
                    "relative_youtube_time": 0.001,
                    "event": "youtube_play",
                    "youtube_video_id": "AbZH7XWDW_k",
                    "youtube_title": "Sample Video"
                },
                {
                    "reaction_time": 13.061,
                    "youtube_time": 2.001,
                    "relative_youtube_time": 2.001,
                    "event": "youtube_pause",
                    "youtube_video_id": "AbZH7XWDW_k",
                    "youtube_title": "Sample Video"
                },
                {
                    "reaction_time": 25.123,
                    "youtube_time": 5.002,
                    "relative_youtube_time": 5.002,
                    "event": "youtube_play",
                    "youtube_video_id": "AbZH7XWDW_k",
                    "youtube_title": "Sample Video"
                },
                {
                    "reaction_time": 28.456,
                    "youtube_time": 8.005,
                    "relative_youtube_time": 8.005,
                    "event": "youtube_pause",
                    "youtube_video_id": "AbZH7XWDW_k",
                    "youtube_title": "Sample Video"
                },
                {
                    "reaction_time": 45.789,
                    "youtube_time": 15.008,
                    "relative_youtube_time": 15.008,
                    "event": "youtube_play",
                    "youtube_video_id": "AbZH7XWDW_k",
                    "youtube_title": "Sample Video"
                },
                {
                    "reaction_time": 50.123,
                    "youtube_time": 20.012,
                    "relative_youtube_time": 20.012,
                    "event": "youtube_pause",
                    "youtube_video_id": "AbZH7XWDW_k",
                    "youtube_title": "Sample Video"
                },
                {
                    "reaction_time": 60.456,
                    "youtube_time": 30.015,
                    "relative_youtube_time": 30.015,
                    "event": "youtube_play",
                    "youtube_video_id": "AbZH7XWDW_k",
                    "youtube_title": "Sample Video"
                },
                {
                    "reaction_time": 65.789,
                    "youtube_time": 35.018,
                    "relative_youtube_time": 35.018,
                    "event": "youtube_pause",
                    "youtube_video_id": "AbZH7XWDW_k",
                    "youtube_title": "Sample Video"
                },
                {
                    "reaction_time": 120.123,
                    "youtube_time": 90.021,
                    "relative_youtube_time": 90.021,
                    "event": "end",
                    "youtube_video_id": "AbZH7XWDW_k",
                    "youtube_title": "Sample Video"
                }
            ],
            "created_at": "2025-06-29T06:45:25.168Z",
            "reaction_video_url": "https://www.youtube.com/watch?v=niYgb0IfP4U",
            "original_video_url": "https://www.youtube.com/watch?v=AbZH7XWDW_k"
        };

        this.createdAt = this.timestampData.created_at;
        this.timelineRenderer.setTimestamps(this.timestampData.sync_points);
        this.timelineRenderer.renderTimeline();
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
        this.updateFileInfo();
    }

    updateFileInfo() {
        const fileNameDisplay = document.getElementById('file-name');
        if (fileNameDisplay) {
            fileNameDisplay.textContent = 'timestamp_1751179878134.json (샘플 데이터)';
        }
    }

    exportTimestamps() {
        const exportData = {
            sync_points: this.timelineRenderer.timestamps,
            created_at: this.createdAt || new Date().toISOString(),
            reaction_video_url: "https://www.youtube.com/watch?v=niYgb0IfP4U",
            original_video_url: "https://www.youtube.com/watch?v=AbZH7XWDW_k"
        };

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
