#!/usr/bin/env node

/**
 * Viewer 독립 빌드 스크립트
 * Viewer 컴포넌트만 빌드하고 검증
 */

const fs = require('fs');
const path = require('path');

class ViewerBuilder {
    constructor() {
        this.rootDir = path.resolve(__dirname, '..');
        this.viewerDir = path.join(this.rootDir, 'src', 'viewer');
        this.sharedDir = path.join(this.rootDir, 'src', 'shared');
        this.buildDir = path.join(this.rootDir, 'dist', 'viewer');
        
        this.errors = [];
        this.warnings = [];
    }
    
    async build() {
        console.log('📺 Building Viewer component...');
        
        try {
            await this.validateDependencies();
            await this.checkFileIntegrity();
            await this.validateJavaScript();
            await this.generateBuildInfo();
            
            if (this.errors.length === 0) {
                console.log('✅ Viewer build completed successfully');
                if (this.warnings.length > 0) {
                    console.log(`⚠️  ${this.warnings.length} warnings found:`);
                    this.warnings.forEach(warning => console.log(`   - ${warning}`));
                }
                return true;
            } else {
                console.log('❌ Viewer build failed');
                this.errors.forEach(error => console.log(`   - ${error}`));
                return false;
            }
        } catch (error) {
            console.error('💥 Build process crashed:', error.message);
            return false;
        }
    }
    
    async validateDependencies() {
        console.log('📦 Validating dependencies...');
        
        const requiredSharedFiles = [
            'src/shared/constants/config.js',
            'src/shared/utils/youtube-api.js',
            'src/shared/utils/timestamp-parser.js',
            'src/shared/loader.js'
        ];
        
        const requiredViewerFiles = [
            'src/viewer/viewer.html',
            'src/viewer/index.html',
            'src/viewer/create-ve-url-enhanced.html',
            'src/viewer/utils/viewer-utils.js'
        ];
        
        [...requiredSharedFiles, ...requiredViewerFiles].forEach(file => {
            const filePath = path.join(this.rootDir, file);
            if (!fs.existsSync(filePath)) {
                this.errors.push(`Missing required file: ${file}`);
            }
        });
        
        console.log(`✓ Dependency validation completed`);
    }
    
    async checkFileIntegrity() {
        console.log('🔍 Checking file integrity...');
        
        // Viewer HTML 파일 검사
        const htmlPath = path.join(this.viewerDir, 'viewer.html');
        if (fs.existsSync(htmlPath)) {
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // 필수 요소 검사
            const requiredElements = [
                'id="youtube-player"',
                'id="reaction-youtube-container"',
                'id="play-btn"',
                'id="pause-btn"',
                'id="stop-btn"',
                'id="status"'
            ];
            
            requiredElements.forEach(element => {
                if (!htmlContent.includes(element)) {
                    this.errors.push(`Missing required HTML element: ${element}`);
                }
            });
            
            // YouTube API 로드 확인
            if (!htmlContent.includes('youtube.com/iframe_api')) {
                this.errors.push('YouTube API not loaded in HTML');
            }
        }
        
        console.log(`✓ File integrity check completed`);
    }
    
    async validateJavaScript() {
        console.log('🔧 Validating JavaScript...');
        
        // viewer.html의 인라인 스크립트 검사
        const htmlPath = path.join(this.viewerDir, 'viewer.html');
        if (fs.existsSync(htmlPath)) {
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // 필수 함수 및 변수 검사
            const requiredElements = [
                'function onYouTubeIframeAPIReady',
                'function handleSynchronization',
                'function startSynchronizedPlayback',
                'function onReactionPlayerStateChange',
                'let timestampData',
                'let youtubePlayer'
            ];
            
            requiredElements.forEach(element => {
                if (!htmlContent.includes(element)) {
                    this.errors.push(`Missing required JavaScript element: ${element}`);
                }
            });
            
            // Editor 관련 코드가 포함되어 있는지 검사 (독립성 확인)
            const editorElements = [
                'class TimestampEditor',
                'timeline-controls',
                'drag-drop',
                'advanced-editing'
            ];
            
            editorElements.forEach(element => {
                if (htmlContent.includes(element)) {
                    this.warnings.push(`Potential Editor dependency found: ${element}`);
                }
            });
        }
        
        console.log(`✓ JavaScript validation completed`);
    }
    
    async generateBuildInfo() {
        console.log('📄 Generating build info...');
        
        // 빌드 디렉토리 생성
        if (!fs.existsSync(this.buildDir)) {
            fs.mkdirSync(this.buildDir, { recursive: true });
        }
        
        const buildInfo = {
            component: 'Viewer',
            buildTime: new Date().toISOString(),
            version: '1.0.0',
            dependencies: {
                shared: [
                    'config.js',
                    'youtube-api.js',
                    'timestamp-parser.js',
                    'loader.js'
                ],
                viewer: [
                    'viewer-utils.js'
                ],
                external: [
                    'YouTube IFrame API'
                ]
            },
            integrity: {
                errors: this.errors.length,
                warnings: this.warnings.length
            },
            features: [
                'Synchronized video playback',
                'YouTube-YouTube mode',
                'File-YouTube mode',
                'Overlay controls',
                'Seek detection',
                'VE URL support',
                'Server integration'
            ]
        };
        
        const buildInfoPath = path.join(this.buildDir, 'build-info.json');
        fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
        
        console.log(`✓ Build info generated: ${buildInfoPath}`);
    }
}

// 스크립트 실행
if (require.main === module) {
    const builder = new ViewerBuilder();
    builder.build().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = ViewerBuilder;
