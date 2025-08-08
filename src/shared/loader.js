/**
 * 공통 모듈 로더
 * Editor와 Viewer에서 필요한 공통 모듈을 안전하게 로드
 */

class ModuleLoader {
    constructor() {
        this.loadedModules = new Set();
        this.loadPromises = new Map();
    }
    
    /**
     * 스크립트를 동적으로 로드
     * @param {string} src - 스크립트 소스 URL
     * @param {string} id - 스크립트 ID (중복 로드 방지용)
     * @returns {Promise} - 로드 완료 Promise
     */
    loadScript(src, id = null) {
        const scriptId = id || src;
        
        // 이미 로드된 스크립트인지 확인
        if (this.loadedModules.has(scriptId)) {
            return Promise.resolve();
        }
        
        // 이미 로딩 중인 스크립트인지 확인
        if (this.loadPromises.has(scriptId)) {
            return this.loadPromises.get(scriptId);
        }
        
        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            
            script.onload = () => {
                this.loadedModules.add(scriptId);
                this.loadPromises.delete(scriptId);
                resolve();
            };
            
            script.onerror = () => {
                this.loadPromises.delete(scriptId);
                reject(new Error(`Failed to load script: ${src}`));
            };
            
            document.head.appendChild(script);
        });
        
        this.loadPromises.set(scriptId, promise);
        return promise;
    }
    
    /**
     * 공통 모듈들을 로드
     * @param {Array} modules - 로드할 모듈 목록
     * @returns {Promise} - 모든 모듈 로드 완료 Promise
     */
    async loadSharedModules(modules = []) {
        const defaultModules = [
            { src: 'src/shared/constants/config.js', id: 'shared-config' },
            { src: 'src/shared/utils/youtube-api.js', id: 'youtube-api-utils' },
            { src: 'src/shared/utils/timestamp-parser.js', id: 'timestamp-parser' }
        ];
        
        const allModules = [...defaultModules, ...modules];
        const loadPromises = allModules.map(module => {
            const src = module.src.startsWith('http') ? module.src : this.resolvePath(module.src);
            return this.loadScript(src, module.id);
        });
        
        try {
            await Promise.all(loadPromises);
            console.log('All shared modules loaded successfully');
        } catch (error) {
            console.error('Failed to load some shared modules:', error);
            throw error;
        }
    }
    
    /**
     * Editor 전용 모듈들을 로드
     * @returns {Promise} - 모든 Editor 모듈 로드 완료 Promise
     */
    async loadEditorModules() {
        const editorModules = [
            { src: 'src/editor/utils/editor-utils.js', id: 'editor-utils' }
        ];
        
        const loadPromises = editorModules.map(module => {
            const src = this.resolvePath(module.src);
            return this.loadScript(src, module.id);
        });
        
        try {
            await Promise.all(loadPromises);
            console.log('All editor modules loaded successfully');
        } catch (error) {
            console.error('Failed to load some editor modules:', error);
            throw error;
        }
    }
    
    /**
     * Viewer 전용 모듈들을 로드
     * @returns {Promise} - 모든 Viewer 모듈 로드 완료 Promise
     */
    async loadViewerModules() {
        const viewerModules = [
            { src: 'src/viewer/utils/viewer-utils.js', id: 'viewer-utils' }
        ];
        
        const loadPromises = viewerModules.map(module => {
            const src = this.resolvePath(module.src);
            return this.loadScript(src, module.id);
        });
        
        try {
            await Promise.all(loadPromises);
            console.log('All viewer modules loaded successfully');
        } catch (error) {
            console.error('Failed to load some viewer modules:', error);
            throw error;
        }
    }
    
    /**
     * YouTube API 로드
     * @returns {Promise} - YouTube API 로드 완료 Promise
     */
    loadYouTubeAPI() {
        return this.loadScript('https://www.youtube.com/iframe_api', 'youtube-api');
    }
    
    /**
     * 상대 경로를 절대 경로로 변환
     * @param {string} path - 상대 경로
     * @returns {string} - 절대 경로
     */
    resolvePath(path) {
        // 현재 페이지의 경로를 기준으로 상대 경로 계산
        const currentPath = window.location.pathname;
        const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
        
        // src/ 폴더를 기준으로 경로 계산
        if (path.startsWith('src/')) {
            // src/editor/에서 실행되는 경우
            if (currentDir.includes('/src/editor')) {
                return '../../' + path;
            }
            // src/viewer/에서 실행되는 경우
            else if (currentDir.includes('/src/viewer')) {
                return '../' + path;
            }
            // 루트에서 실행되는 경우
            else {
                return path;
            }
        }
        
        return path;
    }
    
    /**
     * 모듈 로드 상태 확인
     * @param {string} moduleId - 모듈 ID
     * @returns {boolean} - 로드 여부
     */
    isModuleLoaded(moduleId) {
        return this.loadedModules.has(moduleId);
    }
    
    /**
     * 모든 필수 모듈이 로드되었는지 확인
     * @param {Array} requiredModules - 필수 모듈 ID 목록
     * @returns {boolean} - 모든 모듈 로드 여부
     */
    areModulesLoaded(requiredModules) {
        return requiredModules.every(moduleId => this.loadedModules.has(moduleId));
    }
}

// 글로벌 로더 인스턴스 생성
if (typeof window !== 'undefined') {
    window.moduleLoader = new ModuleLoader();
    
    // 편의 함수들을 글로벌에 추가
    window.loadSharedModules = (modules) => window.moduleLoader.loadSharedModules(modules);
    window.loadEditorModules = () => window.moduleLoader.loadEditorModules();
    window.loadViewerModules = () => window.moduleLoader.loadViewerModules();
    window.loadYouTubeAPI = () => window.moduleLoader.loadYouTubeAPI();
}
