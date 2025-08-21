import { TIMELINE_CONFIG } from '../config/TimelineConfig.js';

export class ZoomController {
    constructor(container, positionCalculator, timelineRenderer) {
        this.container = container;
        this.positionCalculator = positionCalculator;
        this.timelineRenderer = timelineRenderer;
        this.zoomLevel = TIMELINE_CONFIG.DEFAULT_ZOOM;
        this.minZoom = 0.1;
        this.maxZoom = 5.0;
        this.zoomStep = 0.1;
        
        this.setupZoomControls();
        this.setupWheelZoom();
    }

    setupZoomControls() {
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const zoomLevelDisplay = document.getElementById('zoomLevel');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                this.zoomIn();
            });
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                this.zoomOut();
            });
        }

        this.updateZoomDisplay();
    }

    setupWheelZoom() {
        this.container.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                
                if (e.deltaY < 0) {
                    this.zoomIn();
                } else {
                    this.zoomOut();
                }
            }
        });
    }

    zoomIn() {
        const newZoom = Math.min(this.zoomLevel + this.zoomStep, this.maxZoom);
        this.setZoom(newZoom);
    }

    zoomOut() {
        const newZoom = Math.max(this.zoomLevel - this.zoomStep, this.minZoom);
        this.setZoom(newZoom);
    }

    setZoom(newZoom) {
        this.zoomLevel = newZoom;
        this.positionCalculator.updateZoom(this.zoomLevel);
        this.timelineRenderer.renderTimeline();
        this.updateZoomDisplay();
        this.updateTimelineWidth();
    }

    updateZoomDisplay() {
        const zoomLevelDisplay = document.getElementById('zoomLevel');
        if (zoomLevelDisplay) {
            zoomLevelDisplay.textContent = Math.round(this.zoomLevel * 100) + '%';
        }
    }

    updateTimelineWidth() {
        const timestamps = this.timelineRenderer.timestamps;
        if (!timestamps || timestamps.length === 0) return;

        const maxTime = Math.max(...timestamps.map(t => t.reaction_time));
        const newWidth = this.positionCalculator.getTimelineWidth(maxTime);
        
        this.container.style.width = newWidth + 'px';
    }

    getZoomLevel() {
        return this.zoomLevel;
    }

    getPositionCalculator() {
        return this.positionCalculator;
    }
}
