/**
 * 로컬 스토리지 유틸리티
 */
export const LocalStorageUtil = {
    read: (key) => {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (error) {
            console.error(`Error reading from localStorage with key: ${key}`, error);
            return [];
        }
    },
    write: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error writing to localStorage with key: ${key}`, error);
            return false;
        }
    },
    clear: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error clearing localStorage with key: ${key}`, error);
            return false;
        }
    }
};
