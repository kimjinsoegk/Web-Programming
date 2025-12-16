import { CONFIG } from '../core/config.js';
import { LocalStorageUtil } from './storage.js';
import { Schedule } from '../models/schedule.js';

// 순환 참조 방지를 위해 App.refreshAll() 등의 UI 업데이트 로직은 
// Service 내부에서 직접 호출하지 않고, 호출하는 쪽(Controller/App)에서 처리하도록 변경하거나
// 콜백/이벤트를 사용하는 것이 좋지만, 여기서는 기존 로직 유지를 위해 
// window.renderMainTimetable 등을 체크하여 호출합니다.

export const ScheduleService = {
    getAll: () => {
        return LocalStorageUtil.read(CONFIG.STORAGE_KEYS.SCHEDULE)
            .map(data => new Schedule(data));
    },
    
    getById: (id) => {
        const schedules = ScheduleService.getAll();
        return schedules.find(s => s.id === id) || null;
    },
    
    save: (scheduleData) => {
        const schedule = new Schedule(scheduleData);
        const errors = schedule.validate();
        
        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
        
        // 시간 충돌 검사 (수정하는 경우 기존 스케줄 제외)
        const conflicts = ScheduleService.checkConflicts(schedule.day, schedule.start, schedule.end, schedule.id);
        
        if (conflicts.length > 0) {
            const conflict = conflicts[0];
            throw new Error(`시간이 겹치는 수업이 있습니다: ${conflict.name} (${conflict.day} ${conflict.start}-${conflict.end})`);
        }
        
        const schedules = ScheduleService.getAll();
        
        const existingIndex = schedules.findIndex(s => s.id === schedule.id);
        
        if (existingIndex >= 0) {
            schedules[existingIndex] = schedule;
        } else {
            schedules.push(schedule);
        }
        
        const success = LocalStorageUtil.write(CONFIG.STORAGE_KEYS.SCHEDULE, schedules.map(s => s.toJSON()));
        if (!success) {
            throw new Error('저장에 실패했습니다.');
        }
        
        // 시간표 렌더링 및 통계 업데이트 (Global function check)
        if (typeof window.renderMainTimetable === 'function') {
            window.renderMainTimetable();
        }
        if (typeof window.updateDashboardStats === 'function') {
            window.updateDashboardStats();
        }
        
        return schedule;
    },
    
    delete: (id) => {
        const schedules = ScheduleService.getAll().filter(s => s.id !== id);
        const success = LocalStorageUtil.write(CONFIG.STORAGE_KEYS.SCHEDULE, schedules.map(s => s.toJSON()));
        
        // 시간표 렌더링 및 통계 업데이트
        if (success) {
            if (typeof window.renderMainTimetable === 'function') {
                window.renderMainTimetable();
            }
            if (typeof window.updateDashboardStats === 'function') {
                window.updateDashboardStats();
            }
        }
        
        return success;
    },
    
    clear: () => {
        return LocalStorageUtil.clear(CONFIG.STORAGE_KEYS.SCHEDULE);
    },
    
    // 시간 충돌 검사 함수 (배열 반환)
    checkConflicts: (day, startTime, endTime, excludeId = null) => {
        const schedules = ScheduleService.getAll();
        const conflicts = schedules.filter(schedule => {
            // 제외할 ID가 있으면 해당 스케줄은 제외
            if (excludeId && schedule.id === excludeId) return false;
            
            // 같은 요일이 아니면 충돌 없음
            if (schedule.day !== day) return false;
            
            // 시간을 분으로 변환해서 비교
            const getMinutes = (timeStr) => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                return hours * 60 + minutes;
            };
            
            const newStart = getMinutes(startTime);
            const newEnd = getMinutes(endTime);
            const existingStart = getMinutes(schedule.start);
            const existingEnd = getMinutes(schedule.end);
            
            // 시간 겹침 검사
            return (newStart < existingEnd && newEnd > existingStart);
        });
        
        return conflicts;
    },
    
    // 레거시 호환용 함수 (단일 충돌 반환)
    checkTimeConflict: (newSchedule, existingSchedules) => {
        const conflicts = ScheduleService.checkConflicts(
            newSchedule.day, 
            newSchedule.start, 
            newSchedule.end, 
            newSchedule.id
        );
        return conflicts.length > 0 ? conflicts[0] : null;
    }
};

export const ScheduleSetService = {
    getAll: () => {
        return LocalStorageUtil.read(CONFIG.STORAGE_KEYS.SAVED_SCHEDULES) || [];
    },
    
    save: (name, schedules) => {
        const savedSets = ScheduleSetService.getAll();
        const newSet = {
            id: Date.now().toString(),
            name: name.trim(),
            schedules: schedules.map(s => s.toJSON()),
            created: new Date().toISOString()
        };
        
        const existingIndex = savedSets.findIndex(set => set.name === newSet.name);
        if (existingIndex >= 0) {
            savedSets[existingIndex] = newSet;
        } else {
            savedSets.push(newSet);
        }
        
        LocalStorageUtil.write(CONFIG.STORAGE_KEYS.SAVED_SCHEDULES, savedSets);
        return newSet;
    },
    
    load: (id) => {
        const savedSets = ScheduleSetService.getAll();
        const scheduleSet = savedSets.find(set => set.id === id);
        
        if (scheduleSet) {
            const schedules = scheduleSet.schedules.map(data => new Schedule(data));
            LocalStorageUtil.write(CONFIG.STORAGE_KEYS.SCHEDULE, schedules.map(s => s.toJSON()));
            return schedules;
        }
        return [];
    },
    
    delete: (id) => {
        const savedSets = ScheduleSetService.getAll().filter(set => set.id !== id);
        return LocalStorageUtil.write(CONFIG.STORAGE_KEYS.SAVED_SCHEDULES, savedSets);
    }
};
