#!/usr/bin/env node

/**
 * Editor 독립 빌드 스크립트
 * Editor 컴포넌트만 빌드하고 검증
 */

const fs = require('fs');
const path = require('path');

class EditorBuilder {
    constructor() {
        this.rootDir = path.resolve(__dirname, '..');
        this.editorDir = path.join(this.rootDir, 'src', 'editor');
        this.sharedDir = path.join(this.rootDir, 'src', 'shared');
        this.buildDir = path.join(this.rootDir, 'dist', 'editor');
        
        this.errors = [];
        this.warnings = [];
    }
    
    async build() {
        console.log('🔧 Building Editor component...');
        
        try {
            await this.validateDependencies();
            await this.checkFileIntegrity();
            await this.validateJavaScript();
            await this.generateBuildInfo();
            
            if (this.errors.length === 0) {
                console.log('✅ Editor build completed successfully');
                if (this.warnings.length > 0) {
                    console.log(`⚠️  ${this.warnings.length} warnings found:`);
                    this.warnings.forEach(warning => console.log(`   - ${warning}`));
                }
                return true;
            } else {
                console.log('❌ Editor build failed');
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
        
        const requiredEditorFiles = [
            'src/editor/index.html',
            'src/editor/js/app.js',
            'src/editor/js/timeline-controls.js',
            'src/editor/js/drag-drop.js',
            'src/editor/js/advanced-editing.js',
            'src/editor/css/style.css',
            'src/editor/utils/editor-utils.js'
        ];
        
        [...requiredSharedFiles, ...requiredEditorFiles].forEach(file => {
            const filePath = path.join(this.rootDir, file);
            if (!fs.existsSync(filePath)) {
                this.errors.push(`Missing required file: ${file}`);
            }
        });
        
        console.log(`✓ Dependency validation completed`);
    }
    
    async checkFileIntegrity() {
        console.log('🔍 Checking file integrity...');
        
        // Editor HTML 파일 검사
        const htmlPath = path.join(this.editorDir, 'index.html');
        if (fs.existsSync(htmlPath)) {
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // 필수 요소 검사
            const requiredElements = [
                'id="youtube-player"',
                'id="reaction-player"',
                'id="timeline-container"',
                'id="zoom-in"',
                'id="zoom-out"'
            ];
            
            requiredElements.forEach(element => {
                if (!htmlContent.includes(element)) {
                    this.errors.push(`Missing required HTML element: ${element}`);
                }
            });
            
            // 스크립트 로드 확인
            if (!htmlContent.includes('js/app.js')) {
                this.errors.push('app.js not loaded in HTML');
            }
        }
        
        console.log(`✓ File integrity check completed`);
    }
    
    async validateJavaScript() {
        console.log('🔧 Validating JavaScript...');
        
        // app.js 검사
        const appJsPath = path.join(this.editorDir, 'js', 'app.js');
        if (fs.existsSync(appJsPath)) {
            const appJsContent = fs.readFileSync(appJsPath, 'utf8');
            
            // 필수 클래스 및 메서드 검사
            const requiredElements = [
                'class TimestampEditor',
                'initTimelineControls()',
                'initAdvancedFeatures()',
                'setupSyncInterval()',
                'handleTimestampEvents()'
            ];
            
            requiredElements.forEach(element => {
                if (!appJsContent.includes(element)) {
                    this.errors.push(`Missing required JavaScript element: ${element}`);
                }
            });
            
            // Viewer 관련 코드가 포함되어 있는지 검사 (독립성 확인)
            const viewerElements = [
                'onReactionPlayerStateChange',
                'startYoutubeYoutubeSync',
                'youtubeYoutubeMode'
            ];
            
            viewerElements.forEach(element => {
                if (appJsContent.includes(element)) {
                    this.warnings.push(`Potential Viewer dependency found: ${element}`);
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
            component: 'Editor',
            buildTime: new Date().toISOString(),
            version: '1.0.0',
            dependencies: {
                shared: [
                    'config.js',
                    'youtube-api.js',
                    'timestamp-parser.js',
                    'loader.js'
                ],
                editor: [
                    'app.js',
                    'timeline-controls.js',
                    'drag-drop.js',
                    'advanced-editing.js',
                    'editor-utils.js'
                ]
            },
            integrity: {
                errors: this.errors.length,
                warnings: this.warnings.length
            },
            features: [
                'Timeline editing',
                'Drag and drop',
                'Zoom controls',
                'Keyboard shortcuts',
                'Undo/Redo',
                'Export functionality'
            ]
        };
        
        const buildInfoPath = path.join(this.buildDir, 'build-info.json');
        fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
        
        console.log(`✓ Build info generated: ${buildInfoPath}`);
    }
}

// 스크립트 실행
if (require.main === module) {
    const builder = new EditorBuilder();
    builder.build().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = EditorBuilder;
