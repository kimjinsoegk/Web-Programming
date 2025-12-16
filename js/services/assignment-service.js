import { CONFIG } from '../core/config.js';
import { LocalStorageUtil } from './storage.js';
import { Assignment } from '../models/assignment.js';

export const AssignmentService = {
    getAll: () => {
        return LocalStorageUtil.read(CONFIG.STORAGE_KEYS.ASSIGNMENTS)
            .map(data => new Assignment(data));
    },
    
    getById: (id) => {
        const assignments = AssignmentService.getAll();
        return assignments.find(a => a.id === id) || null;
    },
    
    getSortedByDueDate: () => {
        const assignments = AssignmentService.getAll();
        return assignments.sort((a, b) => new Date(a.end) - new Date(b.end));
    },
    
    save: (assignmentData) => {
        const assignment = new Assignment(assignmentData);
        const errors = assignment.validate();
        
        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
        
        const assignments = AssignmentService.getAll();
        const existingIndex = assignments.findIndex(a => a.id === assignment.id);
        
        if (existingIndex >= 0) {
            assignments[existingIndex] = assignment;
        } else {
            assignments.push(assignment);
        }
        
        const success = LocalStorageUtil.write(CONFIG.STORAGE_KEYS.ASSIGNMENTS, assignments.map(a => a.toJSON()));
        if (!success) {
            throw new Error('저장에 실패했습니다.');
        }
        
        // 통계 업데이트
        if (typeof window.updateDashboardStats === 'function') {
            window.updateDashboardStats();
        }
        
        return assignment;
    },
    
    delete: (id) => {
        const assignments = AssignmentService.getAll().filter(a => a.id !== id);
        const success = LocalStorageUtil.write(CONFIG.STORAGE_KEYS.ASSIGNMENTS, assignments.map(a => a.toJSON()));
        
        // 통계 업데이트
        if (success && typeof window.updateDashboardStats === 'function') {
            window.updateDashboardStats();
        }
        
        return success;
    }
};
