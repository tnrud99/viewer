export class LayoutManager {
    constructor() {
        this.overlayPosition = "top-right";
        this.overlaySize = 40;
        this.youtubeVolume = 100;
        this.overlayVisible = true;
        
        this.panel = null;
        this.isPanelOpen = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        // 초기 레이아웃 설정 (기본값: overlay 모드)
        this.updatePreviewLayout();
    }
    
    setupEventListeners() {
        // Layout Settings 버튼
        const layoutBtn = document.getElementById('layout-settings-btn');
        if (layoutBtn) {
            layoutBtn.addEventListener('click', () => this.togglePanel());
        }
        
        // Panel 외부 클릭으로 닫기
        this.panel = document.getElementById('layout-settings-panel');
        if (this.panel) {
            document.addEventListener('click', (e) => {
                if (!this.panel.contains(e.target) && 
                    !layoutBtn.contains(e.target) && 
                    this.isPanelOpen) {
                    this.closePanel();
                }
            });
        }
        
        // 실시간 업데이트를 위한 이벤트 리스너
        this.setupRealtimeUpdates();
    }
    
    setupRealtimeUpdates() {
        // Overlay Position 변경
        const overlayPosition = document.getElementById('overlay-position');
        if (overlayPosition) {
            overlayPosition.addEventListener('change', (e) => {
                this.overlayPosition = e.target.value;
                this.updatePreviewLayout();
            });
        }
        
        // Overlay Size 변경
        const overlaySize = document.getElementById('overlay-size');
        const overlaySizeValue = document.getElementById('overlay-size-value');
        if (overlaySize) {
            overlaySize.addEventListener('input', (e) => {
                this.overlaySize = parseInt(e.target.value);
                if (overlaySizeValue) {
                    overlaySizeValue.textContent = `${this.overlaySize}%`;
                }
                this.updatePreviewLayout();
            });
        }
        
        // YouTube Volume 변경
        const youtubeVolume = document.getElementById('youtube-volume');
        const youtubeVolumeValue = document.getElementById('youtube-volume-value');
        if (youtubeVolume) {
            youtubeVolume.addEventListener('input', (e) => {
                this.youtubeVolume = parseInt(e.target.value);
                if (youtubeVolumeValue) {
                    youtubeVolumeValue.textContent = `${this.youtubeVolume}%`;
                }
                // Volume 적용 로직 (필요시 구현)
            });
        }
        
        // Overlay Toggle 버튼
        const toggleOverlay = document.getElementById('toggle-overlay');
        if (toggleOverlay) {
            toggleOverlay.addEventListener('click', () => {
                this.overlayVisible = !this.overlayVisible;
                toggleOverlay.textContent = this.overlayVisible ? 'Hide Overlay' : 'Show Overlay';
                this.updatePreviewLayout();
            });
        }
    }
    
    togglePanel() {
        if (this.isPanelOpen) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }
    
    openPanel() {
        if (this.panel) {
            this.panel.classList.add('show');
            this.isPanelOpen = true;
            this.updateFormValues();
        }
    }
    
    closePanel() {
        if (this.panel) {
            this.panel.classList.remove('show');
            this.isPanelOpen = false;
        }
    }
    
    updateFormValues() {
        // Overlay Position 값 업데이트
        const overlayPosition = document.getElementById('overlay-position');
        if (overlayPosition) {
            overlayPosition.value = this.overlayPosition;
        }
        
        // Overlay Size 값 업데이트
        const overlaySize = document.getElementById('overlay-size');
        const overlaySizeValue = document.getElementById('overlay-size-value');
        if (overlaySize) {
            overlaySize.value = this.overlaySize;
        }
        if (overlaySizeValue) {
            overlaySizeValue.textContent = `${this.overlaySize}%`;
        }
        
        // YouTube Volume 값 업데이트
        const youtubeVolume = document.getElementById('youtube-volume');
        const youtubeVolumeValue = document.getElementById('youtube-volume-value');
        if (youtubeVolume) {
            youtubeVolume.value = this.youtubeVolume;
        }
        if (youtubeVolumeValue) {
            youtubeVolumeValue.textContent = `${this.youtubeVolume}%`;
        }
        
        // Overlay Toggle 버튼 상태 업데이트
        const toggleOverlay = document.getElementById('toggle-overlay');
        if (toggleOverlay) {
            toggleOverlay.textContent = this.overlayVisible ? 'Hide Overlay' : 'Show Overlay';
        }
    }
    
    updatePreviewLayout() {
        const originalOverlay = document.getElementById('original-overlay');
        if (!originalOverlay) return;
        
        // Overlay 가시성 설정
        if (!this.overlayVisible) {
            originalOverlay.style.display = 'none';
            return;
        }
        
        // Remove all position classes
        originalOverlay.classList.remove('overlay-top-right', 'overlay-top-left', 'overlay-bottom-right', 'overlay-bottom-left');
        
        // Add selected position class
        originalOverlay.classList.add('overlay-' + this.overlayPosition);
        
        // Display overlay
        originalOverlay.style.display = 'block';
        
        // Set overlay size
        originalOverlay.style.width = `${this.overlaySize}%`;
        originalOverlay.style.height = `${this.overlaySize}%`;
        
        // Position에 따른 CSS 속성 설정 (Viewer와 동일)
        originalOverlay.style.position = 'absolute';
        originalOverlay.style.background = '#000';
        originalOverlay.style.borderRadius = 'var(--radius-md)';
        originalOverlay.style.overflow = 'hidden';
        originalOverlay.style.zIndex = '20';
        originalOverlay.style.boxShadow = 'var(--shadow-lg)';
        
        // Position별 위치 설정
        switch(this.overlayPosition) {
            case 'top-right':
                originalOverlay.style.top = 'calc(var(--space-md) + 20px)';
                originalOverlay.style.right = 'var(--space-md)';
                originalOverlay.style.bottom = 'auto';
                originalOverlay.style.left = 'auto';
                break;
            case 'top-left':
                originalOverlay.style.top = 'calc(var(--space-md) + 20px)';
                originalOverlay.style.left = 'var(--space-md)';
                originalOverlay.style.bottom = 'auto';
                originalOverlay.style.right = 'auto';
                break;
            case 'bottom-right':
                originalOverlay.style.bottom = '60px';
                originalOverlay.style.right = 'var(--space-md)';
                originalOverlay.style.top = 'auto';
                originalOverlay.style.left = 'auto';
                break;
            case 'bottom-left':
                originalOverlay.style.bottom = '60px';
                originalOverlay.style.left = 'var(--space-md)';
                originalOverlay.style.top = 'auto';
                originalOverlay.style.right = 'auto';
                break;
        }
    }
    
    loadLayoutFromData(data) {
        if (data && data.layout) {
            this.overlayPosition = data.layout.overlay_position || "top-right";
            this.overlaySize = data.layout.overlay_size || 40;
            this.youtubeVolume = data.layout.youtube_volume || 100;
            this.overlayVisible = data.layout.hide_overlay !== true;  // Viewer 형식에 맞춤
            
            this.updateFormValues();
            this.updatePreviewLayout();
        }
    }
    
    // saveLayout 메서드 제거 (더 이상 필요 없음)
    
    getLayout() {
        return {
            overlay_position: this.overlayPosition,
            overlay_size: this.overlaySize,
            youtube_volume: this.youtubeVolume,
            hide_overlay: !this.overlayVisible  // Viewer 형식에 맞춤
        };
    }
}
