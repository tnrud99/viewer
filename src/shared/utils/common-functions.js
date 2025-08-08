/**
 * 모든 컴포넌트에서 공통으로 사용하는 기본 함수들
 * Recorder, VE URL 생성기, Editor, Viewer에서 공통 사용
 */

class CommonFunctions {
    /**
     * 메시지 표시 (모든 컴포넌트 공통)
     * @param {string} message - 표시할 메시지
     * @param {string} type - 메시지 타입 ('success', 'error', 'info', 'warning')
     * @param {number} duration - 표시 시간 (ms)
     */
    static showMessage(message, type = 'info', duration = 3000) {
        const messageElement = document.getElementById('message');
        if (!messageElement) {
            // 메시지 요소가 없으면 alert 사용
            alert(`[${type.toUpperCase()}] ${message}`);
            return;
        }
        
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
        messageElement.style.display = 'block';
        
        // 자동 숨김
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, duration);
        
        // 콘솔에도 로그
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    /**
     * 필수 필드 검증 (VE URL 생성기들 공통)
     * @param {Array} fields - 검증할 필드들 [{id, name, required}]
     * @returns {boolean} - 검증 통과 여부
     */
    static validateFields(fields) {
        for (const field of fields) {
            const element = document.getElementById(field.id);
            if (!element) continue;
            
            if (field.required) {
                if (field.type === 'file') {
                    if (!element.files || element.files.length === 0) {
                        this.showMessage(`Please select ${field.name}.`, 'error');
                        element.focus();
                        return false;
                    }
                } else {
                    if (!element.value.trim()) {
                        this.showMessage(`Please enter ${field.name}.`, 'error');
                        element.focus();
                        return false;
                    }
                }
            }
            
            // URL 검증
            if (field.type === 'url' && element.value.trim()) {
                if (!this.isValidURL(element.value.trim())) {
                    this.showMessage(`Please enter a valid ${field.name}.`, 'error');
                    element.focus();
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * URL 유효성 검사
     * @param {string} url - 검사할 URL
     * @returns {boolean} - 유효 여부
     */
    static isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * 클립보드에 텍스트 복사
     * @param {string} text - 복사할 텍스트
     * @returns {Promise<boolean>} - 복사 성공 여부
     */
    static async copyToClipboard(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            }
        } catch (error) {
            console.error('Copy to clipboard failed:', error);
            return false;
        }
    }
    
    /**
     * 파일 읽기 (Promise 기반)
     * @param {File} file - 읽을 파일
     * @param {string} readAs - 읽기 방식 ('text', 'dataURL', 'arrayBuffer')
     * @returns {Promise} - 파일 내용 Promise
     */
    static readFile(file, readAs = 'text') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('File reading failed'));
            
            switch (readAs) {
                case 'dataURL':
                    reader.readAsDataURL(file);
                    break;
                case 'arrayBuffer':
                    reader.readAsArrayBuffer(file);
                    break;
                default:
                    reader.readAsText(file);
            }
        });
    }
    
    /**
     * JSON 파일 파싱 및 검증
     * @param {File} file - JSON 파일
     * @param {Function} validator - 검증 함수 (선택적)
     * @returns {Promise<Object>} - 파싱된 JSON 객체
     */
    static async parseJSONFile(file, validator = null) {
        try {
            const text = await this.readFile(file, 'text');
            const data = JSON.parse(text);
            
            if (validator && typeof validator === 'function') {
                const validation = validator(data);
                if (!validation.isValid) {
                    throw new Error(`Invalid JSON structure: ${validation.errors.join(', ')}`);
                }
            }
            
            return data;
        } catch (error) {
            throw new Error(`JSON parsing failed: ${error.message}`);
        }
    }
    
    /**
     * Base64 인코딩 (UTF-8 지원)
     * @param {string} str - 인코딩할 문자열
     * @returns {string} - Base64 인코딩된 문자열
     */
    static encodeBase64(str) {
        try {
            return btoa(unescape(encodeURIComponent(str)));
        } catch (error) {
            console.error('Base64 encoding failed:', error);
            return '';
        }
    }
    
    /**
     * Base64 디코딩 (UTF-8 지원)
     * @param {string} str - 디코딩할 Base64 문자열
     * @returns {string} - 디코딩된 문자열
     */
    static decodeBase64(str) {
        try {
            return decodeURIComponent(escape(atob(str)));
        } catch (error) {
            console.error('Base64 decoding failed:', error);
            return '';
        }
    }
    
    /**
     * VE 데이터 URL 인코딩
     * @param {Object} data - VE 데이터 객체
     * @returns {string} - 인코딩된 URL 파라미터
     */
    static encodeVEData(data) {
        try {
            const jsonString = JSON.stringify(data);
            return this.encodeBase64(jsonString);
        } catch (error) {
            console.error('VE data encoding failed:', error);
            return '';
        }
    }
    
    /**
     * VE 데이터 URL 디코딩
     * @param {string} encodedData - 인코딩된 데이터
     * @returns {Object|null} - 디코딩된 VE 데이터 객체
     */
    static decodeVEData(encodedData) {
        try {
            const jsonString = this.decodeBase64(encodedData);
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('VE data decoding failed:', error);
            return null;
        }
    }
    
    /**
     * 로딩 상태 표시
     * @param {boolean} isLoading - 로딩 중 여부
     * @param {string} elementId - 로딩을 표시할 요소 ID
     * @param {string} message - 로딩 메시지
     */
    static setLoadingState(isLoading, elementId = null, message = 'Loading...') {
        const element = elementId ? document.getElementById(elementId) : null;
        
        if (element) {
            if (isLoading) {
                element.disabled = true;
                element.textContent = message;
            } else {
                element.disabled = false;
                // 원래 텍스트는 data-original-text 속성에 저장되어 있다고 가정
                element.textContent = element.dataset.originalText || element.textContent;
            }
        }
    }
    
    /**
     * 디바운스 함수 생성
     * @param {Function} func - 디바운스할 함수
     * @param {number} delay - 지연 시간 (ms)
     * @returns {Function} - 디바운스된 함수
     */
    static debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    /**
     * 현재 페이지의 기본 URL 가져오기
     * @returns {string} - 기본 URL (origin)
     */
    static getBaseURL() {
        return window.location.origin;
    }
}

// 전역 사용을 위한 export
if (typeof window !== 'undefined') {
    window.CommonFunctions = CommonFunctions;
    
    // 편의를 위한 단축 함수들
    window.showMessage = CommonFunctions.showMessage.bind(CommonFunctions);
    window.validateFields = CommonFunctions.validateFields.bind(CommonFunctions);
    window.copyToClipboard = CommonFunctions.copyToClipboard.bind(CommonFunctions);
}
