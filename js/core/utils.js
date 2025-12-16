/**
 * 유틸리티 함수 모듈
 */
export const Utils = {
    // DOM 조작 헬퍼
    qs: (selector, root = document) => root.querySelector(selector),
    qsa: (selector, root = document) => Array.from(root.querySelectorAll(selector)),
    
    // 날짜 포맷팅
    formatDate: (date) => {
        if (typeof date === 'string') return date;
        return date.toISOString().split('T')[0];
    },
    
    // HTML 이스케이프
    escapeHtml: (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // 고유 ID 생성
    generateId: () => Date.now().toString() + Math.random().toString(36).substr(2, 9)
};

export const ErrorHandler = {
    logError: (message, error) => {
        console.error(`[Error] ${message}`, error);
        alert(`문제가 발생했습니다: ${message}`);
    }
};
