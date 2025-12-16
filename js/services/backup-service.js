import { CONFIG } from '../core/config.js';
import { Utils } from '../core/utils.js';
import { LocalStorageUtil } from './storage.js';

export const BackupService = {
    export: () => {
        try {
            const data = {
                schedules: LocalStorageUtil.read(CONFIG.STORAGE_KEYS.SCHEDULE),
                assignments: LocalStorageUtil.read(CONFIG.STORAGE_KEYS.ASSIGNMENTS),
                notes: LocalStorageUtil.read(CONFIG.STORAGE_KEYS.NOTES),
                savedSchedules: LocalStorageUtil.read(CONFIG.STORAGE_KEYS.SAVED_SCHEDULES),
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `school-life-backup-${Utils.formatDate(new Date())}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
        } catch (error) {
            console.error('Backup export failed:', error);
            return false;
        }
    },
    
    import: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Simple validation
                    if (!data.timestamp) {
                        throw new Error('유효하지 않은 백업 파일입니다.');
                    }
                    
                    LocalStorageUtil.write(CONFIG.STORAGE_KEYS.SCHEDULE, data.schedules || []);
                    LocalStorageUtil.write(CONFIG.STORAGE_KEYS.ASSIGNMENTS, data.assignments || []);
                    LocalStorageUtil.write(CONFIG.STORAGE_KEYS.NOTES, data.notes || []);
                    LocalStorageUtil.write(CONFIG.STORAGE_KEYS.SAVED_SCHEDULES, data.savedSchedules || []);
                    
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('파일 읽기 실패'));
            reader.readAsText(file);
        });
    },
    
    resetAll: () => {
        LocalStorageUtil.clear(CONFIG.STORAGE_KEYS.SCHEDULE);
        LocalStorageUtil.clear(CONFIG.STORAGE_KEYS.ASSIGNMENTS);
        LocalStorageUtil.clear(CONFIG.STORAGE_KEYS.NOTES);
        LocalStorageUtil.clear(CONFIG.STORAGE_KEYS.SAVED_SCHEDULES);
        return true;
    }
};
