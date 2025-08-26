// SettingsManager Module - Handles application settings and configuration
class SettingsManager {
    constructor() {
        this.settings = {
            overlayPosition: 'top-right',
            overlaySize: 50,
            isOverlayVisible: true,
            youtubeVolume: 100,
            reactionSource: 'youtube',
            syncMode: 'precise',
            eventDetectionWindow: 0.5,
            youtubeYoutubeSyncFrequency: 200,
            youtubeYoutubeSyncThreshold: 0.3
        };
        
        this.loadSettings();
        this.setupEventListeners();
    }

    // Load settings from localStorage
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('viewer-settings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                this.settings = { ...this.settings, ...parsed };
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    // Save settings to localStorage
    saveSettings() {
        try {
            localStorage.setItem('viewer-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    // Get setting value
    getSetting(key) {
        return this.settings[key];
    }

    // Set setting value
    setSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        this.notifySettingChange(key, value);
    }

    // Update multiple settings at once
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        
        Object.keys(newSettings).forEach(key => {
            this.notifySettingChange(key, newSettings[key]);
        });
    }

    // Reset settings to defaults
    resetSettings() {
        this.settings = {
            overlayPosition: 'top-right',
            overlaySize: 50,
            isOverlayVisible: true,
            youtubeVolume: 100,
            reactionSource: 'youtube',
            syncMode: 'precise',
            eventDetectionWindow: 0.5,
            youtubeYoutubeSyncFrequency: 200,
            youtubeYoutubeSyncThreshold: 0.3
        };
        this.saveSettings();
        this.notifySettingsReset();
    }

    // Setup event listeners for settings controls
    setupEventListeners() {
        // Overlay position select
        const overlayPositionSelect = document.getElementById('overlayPosition');
        if (overlayPositionSelect) {
            overlayPositionSelect.value = this.settings.overlayPosition;
            overlayPositionSelect.addEventListener('change', (e) => {
                this.setSetting('overlayPosition', e.target.value);
            });
        }

        // Overlay size slider
        const overlaySizeSlider = document.getElementById('overlaySize');
        if (overlaySizeSlider) {
            overlaySizeSlider.value = this.settings.overlaySize;
            overlaySizeSlider.addEventListener('input', (e) => {
                this.setSetting('overlaySize', parseInt(e.target.value));
            });
        }

        // YouTube volume slider
        const youtubeVolumeSlider = document.getElementById('youtubeVolume');
        if (youtubeVolumeSlider) {
            youtubeVolumeSlider.value = this.settings.youtubeVolume;
            youtubeVolumeSlider.addEventListener('input', (e) => {
                this.setSetting('youtubeVolume', parseInt(e.target.value));
            });
        }

        // Reaction source radio buttons
        const sourceRadios = document.querySelectorAll('input[name="reactionSource"]');
        sourceRadios.forEach(radio => {
            if (radio.value === this.settings.reactionSource) {
                radio.checked = true;
            }
            radio.addEventListener('change', (e) => {
                this.setSetting('reactionSource', e.target.value);
            });
        });

        // Overlay visibility toggle
        const overlayToggleBtn = document.getElementById('overlayToggleBtn');
        if (overlayToggleBtn) {
            overlayToggleBtn.checked = this.settings.isOverlayVisible;
            overlayToggleBtn.addEventListener('change', (e) => {
                this.setSetting('isOverlayVisible', e.target.checked);
            });
        }
    }

    // Notify other modules of setting changes
    notifySettingChange(key, value) {
        // Dispatch custom event for setting changes
        const event = new CustomEvent('settingChanged', {
            detail: { key, value, settings: this.settings }
        });
        document.dispatchEvent(event);

        // Update UI components
        this.updateUIForSetting(key, value);
    }

    // Notify settings reset
    notifySettingsReset() {
        const event = new CustomEvent('settingsReset', {
            detail: { settings: this.settings }
        });
        document.dispatchEvent(event);
    }

    // Update UI components based on setting changes
    updateUIForSetting(key, value) {
        switch (key) {
            case 'overlayPosition':
                this.updateOverlayPosition(value);
                break;
            case 'overlaySize':
                this.updateOverlaySize(value);
                break;
            case 'isOverlayVisible':
                this.updateOverlayVisibility(value);
                break;
            case 'youtubeVolume':
                this.updateYoutubeVolume(value);
                break;
            case 'reactionSource':
                this.updateReactionSource(value);
                break;
        }
    }

    // Update overlay position
    updateOverlayPosition(position) {
        const youtubeContainer = document.getElementById('youtube-container');
        if (youtubeContainer) {
            youtubeContainer.className = `overlay-${position}`;
        }
    }

    // Update overlay size
    updateOverlaySize(size) {
        const youtubeContainer = document.getElementById('youtube-container');
        if (youtubeContainer) {
            youtubeContainer.style.width = `${size}%`;
        }
    }

    // Update overlay visibility
    updateOverlayVisibility(visible) {
        const youtubeContainer = document.getElementById('youtube-container');
        if (youtubeContainer) {
            youtubeContainer.style.display = visible ? 'block' : 'none';
        }
    }

    // Update YouTube volume
    updateYoutubeVolume(volume) {
        if (window.videoPlayer && window.videoPlayer.youtubePlayer) {
            window.videoPlayer.youtubePlayer.setVolume(volume);
        }
    }

    // Update reaction source
    updateReactionSource(source) {
        // This would trigger UI updates for source selection
        console.log('Reaction source changed to:', source);
    }

    // Get all settings
    getAllSettings() {
        return { ...this.settings };
    }

    // Export settings
    exportSettings() {
        const dataStr = JSON.stringify(this.settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'viewer-settings.json';
        link.click();
        
        URL.revokeObjectURL(url);
    }

    // Import settings
    importSettings(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedSettings = JSON.parse(e.target.result);
                    this.updateSettings(importedSettings);
                    resolve(importedSettings);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // Validate settings
    validateSettings(settings) {
        const validators = {
            overlayPosition: (value) => ['top-right', 'top-left', 'bottom-right', 'bottom-left'].includes(value),
            overlaySize: (value) => typeof value === 'number' && value >= 10 && value <= 100,
            isOverlayVisible: (value) => typeof value === 'boolean',
            youtubeVolume: (value) => typeof value === 'number' && value >= 0 && value <= 100,
            reactionSource: (value) => ['youtube', 'file'].includes(value),
            syncMode: (value) => ['precise', 'relaxed'].includes(value),
            eventDetectionWindow: (value) => typeof value === 'number' && value > 0,
            youtubeYoutubeSyncFrequency: (value) => typeof value === 'number' && value > 0,
            youtubeYoutubeSyncThreshold: (value) => typeof value === 'number' && value > 0
        };

        const errors = [];
        Object.keys(settings).forEach(key => {
            if (validators[key] && !validators[key](settings[key])) {
                errors.push(`Invalid value for ${key}: ${settings[key]}`);
            }
        });

        return errors;
    }
}

// Export for use in main viewer
window.SettingsManager = SettingsManager;
