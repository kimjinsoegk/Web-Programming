/**
 * 이벤트 관리 모듈
 */
export const EventManager = {
    on: (element, event, handler) => {
        if (element) {
            element.addEventListener(event, handler);
        }
    },
    
    off: (element, event, handler) => {
        if (element) {
            element.removeEventListener(event, handler);
        }
    }
};
