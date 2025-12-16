/**
 * 학교생활 관리 시스템 - 모듈형 아키텍처 (수정된 버전)
 * 가독성, 확장성, 유지보수성을 고려한 구조 개선
 */

// ===== 전역 설정 및 상수 =====
const CONFIG = {
    STORAGE_KEYS: {
        SCHEDULE: 'sl_schedule_v1',
        ASSIGNMENTS: 'sl_assign_v1',
        NOTES: 'sl_notes_v1',
        SAVED_SCHEDULES: 'saved_schedule_sets'
    },
    DEFAULT_COLORS: {
        SCHEDULE: '#3498db',
        ASSIGNMENT: '#ff8a65'
    },
    MESSAGES: {
        CONFIRM_DELETE_SCHEDULE: '모든 시간표를 삭제하시겠습니까?',
        CONFIRM_DELETE_ASSIGNMENT: '과제를 삭제하시겠습니까?',
        CONFIRM_DELETE_NOTE: '노트를 삭제하시겠습니까?',
        ERROR_REQUIRED_FIELDS: '필수 필드를 모두 입력해주세요.',
        ERROR_SAVE_FAILED: '저장에 실패했습니다.'
    }
};

// ===== 유틸리티 함수 모듈 =====
const Utils = {
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

// ===== 공통 유틸리티 함수 =====
const LocalStorageUtil = {
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

// ===== 상태 관리 모듈 =====
const State = {
    ui: {
        activeSection: 'dashboard',
        editMode: false,
        noteFilter: 'all'
    },
    pendingSchedules: [] // 임시 저장된 스케줄들
};

// ===== 이벤트 관리 모듈 =====
const EventManager = {
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

// ===== 검증 모듈 =====
const Validator = {
    schedule: (data) => {
        const errors = [];
        if (!data.name?.trim()) errors.push('수업명은 필수입니다.');
        if (!data.day) errors.push('요일을 선택해주세요.');
        if (!data.start) errors.push('시작 시간을 입력해주세요.');
        if (!data.end) errors.push('종료 시간을 입력해주세요.');
        return errors;
    },
    
    assignment: (data) => {
        const errors = [];
        if (!data.title?.trim()) errors.push('과제 제목은 필수입니다.');
        if (!data.start) errors.push('시작일을 입력해주세요.');
        if (!data.end) errors.push('마감일을 입력해주세요.');
        return errors;
    },
    
    note: (data) => {
        const errors = [];
        // 수업 선택은 선택사항으로 변경
        // if (!data.classId) errors.push('수업을 선택해주세요.');
        if (!data.title?.trim()) errors.push('노트 제목은 필수입니다.');
        if (!data.content?.trim()) errors.push('내용을 입력해주세요.');
        return errors;
    }
};

// ===== 데이터 모델 클래스 =====
class Schedule {
    constructor(data) {
        this.id = data.id || Utils.generateId();
        this.name = data.name || '';
        this.day = data.day || '';
        this.start = data.start || '';
        this.end = data.end || '';
        this.location = data.location || '';
        this.color = data.color || CONFIG.DEFAULT_COLORS.SCHEDULE;
        this.created = data.created || new Date().toISOString();
    }
    
    validate() {
        return Validator.schedule(this);
    }
    
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            day: this.day,
            start: this.start,
            end: this.end,
            location: this.location,
            color: this.color,
            created: this.created
        };
    }
}

class Assignment {
    constructor(data) {
        this.id = data.id || Utils.generateId();
        this.title = data.title || '';
        this.classId = data.classId || '';
        this.start = data.start || '';
        this.end = data.end || '';
        // completed indicates whether the assignment is finished
        this.completed = typeof data.completed === 'boolean' ? data.completed : false;
        this.color = data.color || CONFIG.DEFAULT_COLORS.ASSIGNMENT;
        this.notes = data.notes || '';
        this.created = data.created || new Date().toISOString();
    }
    
    validate() {
        return Validator.assignment(this);
    }
    
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            classId: this.classId,
            start: this.start,
            end: this.end,
            completed: this.completed,
            color: this.color,
            notes: this.notes,
            created: this.created
        };
    }
}

class Note {
    constructor(data) {
        this.id = data.id || Utils.generateId();
        this.classId = data.classId || '';
        this.title = data.title || '';
        this.content = data.content || '';
        this.created = data.created || new Date().toISOString();
    }
    
    validate() {
        return Validator.note(this);
    }
    
    toJSON() {
        return {
            id: this.id,
            classId: this.classId,
            title: this.title,
            content: this.content,
            created: this.created
        };
    }
}

// ===== 서비스 레이어 =====
const ScheduleService = {
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
        
        // 시간표 렌더링 및 통계 업데이트
        if (typeof renderMainTimetable === 'function') {
            renderMainTimetable();
        }
        if (typeof updateDashboardStats === 'function') {
            updateDashboardStats();
        }
        
        return schedule;
    },
    
    delete: (id) => {
        const schedules = ScheduleService.getAll().filter(s => s.id !== id);
        const success = LocalStorageUtil.write(CONFIG.STORAGE_KEYS.SCHEDULE, schedules.map(s => s.toJSON()));
        
        // 시간표 렌더링 및 통계 업데이트
        if (success) {
            if (typeof renderMainTimetable === 'function') {
                renderMainTimetable();
            }
            if (typeof updateDashboardStats === 'function') {
                updateDashboardStats();
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

const ScheduleSetService = {
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

const AssignmentService = {
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
        if (typeof updateDashboardStats === 'function') {
            updateDashboardStats();
        }
        
        return assignment;
    },
    
    delete: (id) => {
        const assignments = AssignmentService.getAll().filter(a => a.id !== id);
        const success = LocalStorageUtil.write(CONFIG.STORAGE_KEYS.ASSIGNMENTS, assignments.map(a => a.toJSON()));
        
        // 통계 업데이트
        if (success && typeof updateDashboardStats === 'function') {
            updateDashboardStats();
        }
        
        return success;
    }
};

const NoteService = {
    getAll: () => {
        return LocalStorageUtil.read(CONFIG.STORAGE_KEYS.NOTES)
            .map(data => new Note(data));
    },
    
    getById: (id) => {
        const notes = NoteService.getAll();
        return notes.find(n => n.id === id) || null;
    },
    
    save: (noteData) => {
        const note = new Note(noteData);
        const errors = note.validate();
        
        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
        
        const notes = NoteService.getAll();
        const existingIndex = notes.findIndex(n => n.id === note.id);
        
        if (existingIndex >= 0) {
            notes[existingIndex] = note;
        } else {
            notes.push(note);
        }
        
        const success = LocalStorageUtil.write(CONFIG.STORAGE_KEYS.NOTES, notes.map(n => n.toJSON()));
        if (!success) {
            throw new Error('저장에 실패했습니다.');
        }
        
        return note;
    },
    
    delete: (id) => {
        const notes = NoteService.getAll().filter(n => n.id !== id);
        return LocalStorageUtil.write(CONFIG.STORAGE_KEYS.NOTES, notes.map(n => n.toJSON()));
    }
};

// ===== 알림 패널 모듈 =====
const Notifications = (() => {
    let panelEl = null;

    const buildPanel = () => {
        if (panelEl) return panelEl;
        panelEl = document.createElement('div');
        panelEl.className = 'notification-panel';
        panelEl.style.position = 'fixed';
        panelEl.style.top = '72px';
        panelEl.style.right = '20px';
        panelEl.style.width = '320px';
        panelEl.style.maxHeight = '420px';
        panelEl.style.overflowY = 'auto';
        panelEl.style.background = '#ffffff';
        panelEl.style.borderRadius = '16px';
        panelEl.style.boxShadow = '0 18px 45px rgba(15,23,42,0.25)';
        panelEl.style.border = '1px solid var(--border-light)';
        panelEl.style.zIndex = '50';
        document.body.appendChild(panelEl);
        return panelEl;
    };

    const formatDDay = (dateStr) => {
        if (!dateStr) return '-';
        const today = new Date();
        const target = new Date(dateStr);
        const diff = Math.floor((target - today) / (1000 * 60 * 60 * 24));
        if (isNaN(diff)) return '-';
        if (diff > 0) return `D-${diff}`;
        if (diff === 0) return 'D-DAY';
        return `D+${Math.abs(diff)}`;
    };

    const render = () => {
        const el = buildPanel();
        const assignments = AssignmentService.getAll();
        const notes = NoteService.getAll();

        let html = '<div style="padding:12px 14px; border-bottom:1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center;">';
        html += '<strong style="font-size:14px;">알림</strong>';
        html += '<button type="button" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9ca3af;" data-close="1">×</button>';
        html += '</div>';

        html += '<div style="padding:10px 14px;">';
        html += '<div style="font-size:12px; font-weight:600; color:var(--text-secondary); margin-bottom:6px;">과제 D-DAY</div>';

        const upcoming = assignments
            .filter(a => a.end)
            .sort((a,b) => new Date(a.end) - new Date(b.end));

        if (upcoming.length === 0) {
            html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">등록된 과제가 없습니다.</div>';
        } else {
            upcoming.slice(0, 5).forEach(a => {
                const dday = formatDDay(a.end);
                html += `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:6px;">
                    <div style="max-width:190px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${Utils.escapeHtml(a.title)}
                    </div>
                    <div style="font-weight:600;color:${dday === 'D-DAY' ? 'var(--danger)' : 'var(--text-secondary)'};">${dday}</div>
                </div>`;
            });
        }

        html += '<div style="font-size:12px; font-weight:600; color:var(--text-secondary); margin:10px 0 6px;">노트</div>';

        if (!notes || notes.length === 0) {
            html += '<div style="font-size:12px;color:var(--text-muted);">저장된 노트가 없습니다.</div>';
        } else {
            notes.slice(0, 6).forEach(n => {
                const created = new Date(n.created).toLocaleDateString('ko-KR');
                html += `<button type="button" data-note-id="${n.id}" style="width:100%;text-align:left;border:none;background:none;padding:6px 4px;border-radius:8px;cursor:pointer;">
                    <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${Utils.escapeHtml(n.title)}</div>
                    <div style="font-size:11px;color:var(--text-muted);">${Utils.escapeHtml(n.classId || '')} · ${created}</div>
                </button>`;
            });
        }

        html += '</div>';

        el.innerHTML = html;

        el.querySelector('[data-close="1"]').addEventListener('click', () => {
            hide();
        });

        el.querySelectorAll('[data-note-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-note-id');
                if (window.App && typeof App.viewNote === 'function') {
                    App.viewNote(id);
                }
                hide();
            });
        });
    };

    const toggle = () => {
        if (panelEl && panelEl.style.display === 'none') {
            show();
        } else if (panelEl && panelEl.style.display !== '') {
            hide();
        } else {
            show();
        }
    };

    const show = () => {
        render();
        if (panelEl) {
            panelEl.style.display = 'block';
        }
    };

    const hide = () => {
        if (panelEl) {
            panelEl.style.display = 'none';
        }
    };

    return { toggle, show, hide };
})();

// ===== UI 렌더링 엔진 =====
const Renderer = {
    createElement: (tag, options = {}) => {
        const element = document.createElement(tag);
        
        if (options.className) element.className = options.className;
        if (options.id) element.id = options.id;
        if (options.innerHTML) element.innerHTML = options.innerHTML;
        if (options.textContent) element.textContent = options.textContent;
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        if (options.styles) {
            Object.assign(element.style, options.styles);
        }
        
        return element;
    },
    
    renderList: (container, items, renderItem, emptyMessage = '데이터가 없습니다.') => {
        if (!container) return;
        
        container.innerHTML = '';
        
        if (items.length === 0) {
            container.innerHTML = `<div class="empty-message">${emptyMessage}</div>`;
            return;
        }
        
        const fragment = document.createDocumentFragment();
        items.forEach(item => {
            const element = renderItem(item);
            if (element) fragment.appendChild(element);
        });
        
        container.appendChild(fragment);
    }
};

// ===== 튜토리얼 / 온보딩 모듈 =====
const Tutorial = (() => {
    const STEPS = [
        {
            targetSelector: '.feature-card[data-target="schedule"]',
            title: '시간표 관리',
            body: '수업 시간을 등록하고, 주간 시간표를 한눈에 볼 수 있는 공간이에요.'
        },
        {
            targetSelector: '.feature-card[data-target="assignments"]',
            title: '과제 추적',
            body: '과제 마감일과 진행 상태를 한 번에 관리할 수 있어요.'
        },
        {
            targetSelector: '.feature-card[data-target="notes"]',
            title: '필기 노트',
            body: '수업별로 필기를 정리하고, 나중에 다시 복습하기 좋아요.'
        },
        {
            targetSelector: '.feature-card[data-target="club"]',
            title: '클럽 활동',
            body: '동아리 일정과 공지를 관리할 수 있는 기능으로, 곧 준비될 예정이에요.'
        }
    ];

    let currentStep = 0;
    let highlightEl = null;
    let tooltipEl = null;

    const clear = () => {
        const overlay = document.querySelector('.tutorial-overlay');
        if (overlay) overlay.remove();
        if (highlightEl) highlightEl.remove();
        if (tooltipEl) tooltipEl.remove();
        highlightEl = null;
        tooltipEl = null;
    };

    const positionForTarget = (target) => {
        // 위치 계산 및 하이라이트/말풍선 배치
        const rect = target.getBoundingClientRect();

        if (!highlightEl) {
            highlightEl = document.createElement('div');
            highlightEl.className = 'tutorial-highlight';
            document.body.appendChild(highlightEl);
        }

        // 하이라이트 박스 위치 (absolute - 문서 기준)
        highlightEl.style.top = `${rect.top - 8 + window.scrollY}px`;
        highlightEl.style.left = `${rect.left - 8}px`;
        highlightEl.style.width = `${rect.width + 16}px`;
        highlightEl.style.height = `${rect.height + 16}px`;

        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.className = 'tutorial-tooltip';
            document.body.appendChild(tooltipEl);
        }

        // 말풍선 위치 계산 - 현재 뷰포트 기준 (fixed position)
        // 요소가 화면 하단에 가까우면 위에, 아니면 아래에 표시
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        let tooltipTop;
        if (spaceBelow > 200) {
            // 아래쪽 공간이 충분하면 요소 아래에 표시
            tooltipTop = rect.bottom + 20;
        } else if (spaceAbove > 200) {
            // 위쪽 공간이 충분하면 요소 위에 표시
            tooltipTop = rect.top - 180; // 말풍선 높이 약 160px + 여유 20px
        } else {
            // 공간이 부족하면 화면 중앙에 표시
            tooltipTop = (viewportHeight - 160) / 2;
        }
        
        const tooltipLeft = rect.left + (rect.width / 2) - 160; // 중앙 정렬 (말풍선 너비 320px의 절반)
        
        // 화면 밖으로 나가지 않도록 조정
        const viewportWidth = window.innerWidth;
        let finalLeft = tooltipLeft;
        
        if (tooltipLeft < 16) {
            finalLeft = 16;
        } else if (tooltipLeft + 320 > viewportWidth - 16) {
            finalLeft = viewportWidth - 336;
        }

        tooltipEl.style.top = `${tooltipTop}px`;
        tooltipEl.style.left = `${finalLeft}px`;
    };

    const renderStep = () => {
        const step = STEPS[currentStep];
        if (!step) {
            clear();
            return;
        }

        const target = document.querySelector(step.targetSelector);
        if (!target) {
            console.error(`튜토리얼 타겟을 찾을 수 없습니다: ${step.targetSelector}`);
            clear();
            return;
        }

        console.log(`📚 튜토리얼 ${currentStep + 1}/${STEPS.length}: ${step.title}`);

        // 오버레이 생성 및 구멍 뚫기 (clip-path 사용)
        let overlay = document.querySelector('.tutorial-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'tutorial-overlay';
            document.body.appendChild(overlay);
        }
        
        // 타겟 요소 위치를 기준으로 clip-path 설정
        const rect = target.getBoundingClientRect();
        // Fixed Overlay이므로 Viewport 기준 좌표 사용 (window.scrollY 제거)
        const topRect = rect.top - 8;
        const leftRect = rect.left - 8;
        const rightRect = rect.left + rect.width + 8;
        const bottomRect = rect.top + rect.height + 8;
        
        // clip-path 제거 (CSS box-shadow로 대체)
        overlay.style.clipPath = 'none';

        // 툴팁 생성 및 내용 설정
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.className = 'tutorial-tooltip';
            document.body.appendChild(tooltipEl);
        }

        tooltipEl.innerHTML = '';
        
        // 진행 상태 표시
        const progress = document.createElement('div');
        progress.className = 'tutorial-progress';
        progress.textContent = `${currentStep + 1} / ${STEPS.length}`;
        progress.style.cssText = 'font-size: 12px; color: #9ca3af; margin-bottom: 8px; font-weight: 600;';
        
        const title = document.createElement('div');
        title.className = 'tutorial-tooltip-title';
        title.textContent = step.title;

        const body = document.createElement('div');
        body.className = 'tutorial-tooltip-body';
        body.textContent = step.body;

        const actions = document.createElement('div');
        actions.className = 'tutorial-tooltip-actions';

        const btnSkip = document.createElement('button');
        btnSkip.className = 'tutorial-btn-skip';
        btnSkip.textContent = '건너뛰기';
        btnSkip.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('⏭️ 튜토리얼 건너뛰기');
            clear();
        });

        const btnNext = document.createElement('button');
        btnNext.className = 'tutorial-btn-next';
        btnNext.textContent = currentStep === STEPS.length - 1 ? '완료' : '다음';
        btnNext.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            currentStep += 1;
            if (currentStep >= STEPS.length) {
                console.log('✅ 튜토리얼 완료');
                clear();
            } else {
                console.log('➡️ 다음 단계로');
                renderStep();
            }
        });

        actions.appendChild(btnSkip);
        actions.appendChild(btnNext);

        tooltipEl.appendChild(progress);
        tooltipEl.appendChild(title);
        tooltipEl.appendChild(body);
        tooltipEl.appendChild(actions);

        // 타겟 위치 설정 및 스크롤 (이 함수가 스크롤과 위치 조정을 모두 처리)
        positionForTarget(target);
    };

    const start = () => {
        currentStep = 0;
        renderStep();
    };

    const startLearnMore = () => {
        // "더 알아보기"는 설명 문구를 조금 더 소개용 톤으로 변경
        STEPS[0].body = '시간표 관리에서는 주간 수업 일정을 한 번에 확인하고 수정할 수 있어요.';
        STEPS[1].body = '과제 추적에서는 과제의 마감일과 D-DAY를 관리하며, 대시보드와 알림에서 확인할 수 있어요.';
        STEPS[2].body = '필기 노트에서는 수업별로 내용을 기록하고, 최근 노트를 홈 화면에서 바로 확인할 수 있어요.';
        STEPS[3].body = '클럽 활동은 동아리 일정과 공지를 관리할 수 있도록 확장될 기능이에요.';
        start();
    };

    return { start, startLearnMore };
})();

// ===== UI 컴포넌트 모듈 =====
const Components = {
    Dashboard: {
        render: () => {
            const schedules = ScheduleService.getAll();
            const assignments = AssignmentService.getSortedByDueDate();
            const notes = NoteService.getAll();
            
            const dashSchedule = Utils.qs('#dashboard-schedule');
            if (dashSchedule) {
                if (schedules.length === 0) {
                    dashSchedule.textContent = '등록된 수업이 없습니다.';
                } else {
                    const scheduleItems = schedules.slice(0, 6).map(s => 
                        `<li>${Utils.escapeHtml(s.day)} ${Utils.escapeHtml(s.start)}-${Utils.escapeHtml(s.end)} ${Utils.escapeHtml(s.name)}</li>`
                    ).join('');
                    dashSchedule.innerHTML = `<ul>${scheduleItems}</ul>`;
                }
            }
            
            const dashAssignments = Utils.qs('#dashboard-assignments');
            if (dashAssignments) {
                if (assignments.length === 0) {
                    dashAssignments.innerHTML = '<li>등록된 과제가 없습니다.</li>';
                } else {
                    const assignmentItems = assignments.slice(0, 5).map(a => 
                        `<li>${Utils.escapeHtml(a.title)} - ${Utils.escapeHtml(a.end)}</li>`
                    ).join('');
                    dashAssignments.innerHTML = assignmentItems;
                }
            }
            
            const dashStudy = Utils.qs('#dashboard-study');
            if (dashStudy) {
                dashStudy.textContent = '00:00:00';
            }
            
            // 대시보드 시간표 렌더링
            Components.Dashboard.renderTimetable();

            // 최근 노트 요약 렌더링 (상위 3개)
            const recentContainer = Utils.qs('#dashboard-recent-notes');
            if (recentContainer) {
                recentContainer.innerHTML = '';
                if (!notes || notes.length === 0) {
                    recentContainer.innerHTML = '<div class="empty-message">최근 노트가 없습니다.</div>';
                } else {
                    const sorted = [...notes].sort((a,b) => new Date(b.created) - new Date(a.created)).slice(0,3);
                    sorted.forEach(n => {
                        const el = document.createElement('div');
                        el.className = 'item';
                        el.innerHTML = `
                            <div>
                                <strong>${Utils.escapeHtml(n.title)}</strong>
                                <div><small>${Utils.escapeHtml(n.classId || '')} · ${new Date(n.created).toLocaleDateString('ko-KR')}</small></div>
                            </div>
                            <div>
                                <button onclick="App.viewNote('${n.id}')">보기</button>
                            </div>
                        `;
                        recentContainer.appendChild(el);
                    });
                }
            }
        },
        
        renderTimetable: () => {
            const grid = Utils.qs('#dashboard-timetable-grid');
            if (!grid) return;
            
            const schedules = ScheduleService.getAll();
            
            // 현재 요일 가져오기
            const today = new Date();
            const currentDay = ['일', '월', '화', '수', '목', '금', '토'][today.getDay()];
            
            const timeSlots = Components.Schedule.generateTimeSlots();
            const days = ['월', '화', '수', '목', '금', '토', '일'];
            
            let gridHTML = '<div class="schedule-table">';
            
            gridHTML += '<div class="schedule-row header">';
            gridHTML += '<div class="time-cell">시간</div>';
            days.forEach(day => {
                const isCurrentDay = day === currentDay;
                gridHTML += `<div class="day-cell ${isCurrentDay ? 'current-day' : ''}">${day}</div>`;
            });
            gridHTML += '</div>';
            
            timeSlots.forEach((timeSlot, index) => {
                gridHTML += '<div class="schedule-row">';
                gridHTML += `<div class="time-cell">${timeSlot}</div>`;
                
                days.forEach(day => {
                    const isCurrentDay = day === currentDay;
                    const daySchedule = schedules.find(s => 
                        s.day === day && 
                        Components.Schedule.isTimeInSlot(s.start, s.end, timeSlot)
                    );
                    
                    // 드래그 기능을 위한 데이터 속성 추가
                    const cellAttrs = `data-day="${day}" data-time="${timeSlot}"`;
                    
                    if (daySchedule) {
                        const isBlockStart = Components.Schedule.isBlockStart(daySchedule, timeSlot);
                        const currentDayClass = isCurrentDay ? 'current-day-schedule' : '';
                        
                        if (isBlockStart) {
                            gridHTML += `<div class="schedule-cell has-class ${currentDayClass}" ${cellAttrs}
                                style="background-color: ${daySchedule.color}20; 
                                       border-left: 3px solid ${daySchedule.color};">
                                <div class="class-name">${Utils.escapeHtml(daySchedule.name)}</div>
                                <div class="class-time">${daySchedule.start}-${daySchedule.end}</div>
                                <div class="class-location">${Utils.escapeHtml(daySchedule.location || '')}</div>
                            </div>`;
                        } else {
                            gridHTML += `<div class="schedule-cell has-class block-continue ${currentDayClass}" ${cellAttrs}
                                style="background-color: ${daySchedule.color}20; 
                                       border-left: 3px solid ${daySchedule.color};">
                            </div>`;
                        }
                    } else {
                        gridHTML += `<div class="schedule-cell" ${cellAttrs}></div>`;
                    }
                });
                
                gridHTML += '</div>';
            });
            
            gridHTML += '</div>';
            grid.innerHTML = gridHTML;
            
            // 드래그 이벤트 연결 (대시보드용은 읽기 전용일 수 있으나, 여기서는 일단 연결하지 않음. 메인 시간표 페이지에서만 연결)
        },
        
        setupScheduleSetSelector: () => {
            const selector = Utils.qs('#dashboard-schedule-set');
            if (!selector) return;
            
            const scheduleSets = ScheduleSetService.getAll();
            
            selector.innerHTML = '<option value="">현재 시간표</option>';
            scheduleSets.forEach(set => {
                const option = document.createElement('option');
                option.value = set.id;
                option.textContent = set.name;
                selector.appendChild(option);
            });
            
            EventManager.on(selector, 'change', (e) => {
                const setId = e.target.value;
                if (setId) {
                    // 저장된 시간표 세트 로드
                    const set = ScheduleSetService.getById(setId);
                    if (set && set.schedules) {
                        // 임시로 현재 시간표를 대체해서 표시
                        Components.Dashboard.renderTimetableWithSchedules(set.schedules);
                    }
                } else {
                    // 현재 시간표 표시
                    Components.Dashboard.renderTimetable();
                }
            });
        },
        
        renderTimetableWithSchedules: (schedules) => {
            const grid = Utils.qs('#dashboard-timetable-grid');
            if (!grid) return;
            
            if (schedules.length === 0) {
                grid.innerHTML = '<div class="empty-message">선택된 시간표 세트가 비어있습니다.</div>';
                return;
            }
            
            // 현재 요일 가져오기
            const today = new Date();
            const currentDay = ['일', '월', '화', '수', '목', '금', '토'][today.getDay()];
            
            const timeSlots = Components.Schedule.generateTimeSlots();
            const days = ['월', '화', '수', '목', '금', '토', '일'];
            
            let gridHTML = '<div class="schedule-table">';
            
            gridHTML += '<div class="schedule-row header">';
            gridHTML += '<div class="time-cell">시간</div>';
            days.forEach(day => {
                const isCurrentDay = day === currentDay;
                gridHTML += `<div class="day-cell ${isCurrentDay ? 'current-day' : ''}">${day}</div>`;
            });
            gridHTML += '</div>';
            
            timeSlots.forEach((timeSlot, index) => {
                gridHTML += '<div class="schedule-row">';
                gridHTML += `<div class="time-cell">${timeSlot}</div>`;
                
                days.forEach(day => {
                    const isCurrentDay = day === currentDay;
                    const daySchedule = schedules.find(s => 
                        s.day === day && 
                        Components.Schedule.isTimeInSlot(s.start, s.end, timeSlot)
                    );
                    
                    if (daySchedule) {
                        const isBlockStart = Components.Schedule.isBlockStart(daySchedule, timeSlot);
                        const currentDayClass = isCurrentDay ? 'current-day-schedule' : '';
                        
                        if (isBlockStart) {
                            gridHTML += `<div class="schedule-cell has-class ${currentDayClass}" 
                                style="background-color: ${daySchedule.color}20; 
                                       border-left: 3px solid ${daySchedule.color};">
                                <div class="class-name">${Utils.escapeHtml(daySchedule.name)}</div>
                                <div class="class-time">${daySchedule.start}-${daySchedule.end}</div>
                                <div class="class-location">${Utils.escapeHtml(daySchedule.location || '')}</div>
                            </div>`;
                        } else {
                            gridHTML += `<div class="schedule-cell has-class block-continue ${currentDayClass}" 
                                style="background-color: ${daySchedule.color}20; 
                                       border-left: 3px solid ${daySchedule.color};">
                            </div>`;
                        }
                    } else {
                        gridHTML += '<div class="schedule-cell"></div>';
                    }
                });
                
                gridHTML += '</div>';
            });
            
            gridHTML += '</div>';
            grid.innerHTML = gridHTML;
        }
    },
    
    Schedule: {
        renderGrid: (containerSelector) => {
            const grid = containerSelector ? document.querySelector(containerSelector) : Utils.qs('#schedule-grid');
            if (!grid) return;
            
            const schedules = ScheduleService.getAll();

            const timeSlots = Components.Schedule.generateTimeSlots();
            const days = ['월', '화', '수', '목', '금', '토', '일'];
            
            let gridHTML = '<div class="schedule-table">';
            
            gridHTML += '<div class="schedule-row header">';
            gridHTML += '<div class="time-cell">시간</div>';
            days.forEach(day => {
                gridHTML += `<div class="day-cell">${day}</div>`;
            });
            gridHTML += '</div>';
            
            timeSlots.forEach((timeSlot, index) => {
                gridHTML += '<div class="schedule-row">';
                gridHTML += `<div class="time-cell">${timeSlot}</div>`;
                
                days.forEach(day => {
                    const daySchedule = schedules.find(s => 
                        s.day === day && 
                        Components.Schedule.isTimeInSlot(s.start, s.end, timeSlot)
                    );
                    
                    // 드래그용 데이터 속성
                    const cellAttrs = `data-day="${day}" data-time="${timeSlot}"`;

                    if (daySchedule) {
                        const isBlockStart = Components.Schedule.isBlockStart(daySchedule, timeSlot);
                        
                        if (isBlockStart) {
                            // 블록 시작점에는 수업 정보 표시
                            gridHTML += `<div class="schedule-cell has-class" ${cellAttrs}
                                style="background-color: ${daySchedule.color}20; 
                                       border-left: 3px solid ${daySchedule.color};">
                                <div class="class-name">${Utils.escapeHtml(daySchedule.name)}</div>
                                <div class="class-time">${daySchedule.start}-${daySchedule.end}</div>
                                <div class="class-location">${Utils.escapeHtml(daySchedule.location || '')}</div>
                            </div>`;
                        } else {
                            // 블록 중간/끝 부분에는 같은 색깔로만 채우기
                            gridHTML += `<div class="schedule-cell has-class block-continue" ${cellAttrs}
                                style="background-color: ${daySchedule.color}20; 
                                       border-left: 3px solid ${daySchedule.color};">
                            </div>`;
                        }
                    } else {
                        gridHTML += `<div class="schedule-cell" ${cellAttrs}></div>`;
                    }
                });
                
                gridHTML += '</div>';
            });
            
            gridHTML += '</div>';
            grid.innerHTML = gridHTML;

            // 드래그 이벤트 연결
            Components.Schedule.setupDragEvents(grid);
        },

        setupDragEvents: (gridElement) => {
            let isDragging = false;
            let startCell = null;
            let currentCell = null;

            const getCellData = (el) => {
                const cell = el.closest('.schedule-cell');
                if (!cell) return null;
                return {
                    day: cell.dataset.day,
                    time: cell.dataset.time,
                    el: cell
                };
            };

            const clearSelection = () => {
                gridElement.querySelectorAll('.schedule-cell').forEach(c => {
                    c.classList.remove('drag-selected', 'drag-start');
                });
            };

            const getTimeIndex = (time) => {
                const [h, m] = time.split(':').map(Number);
                return h * 60 + m;
            };

            gridElement.addEventListener('mousedown', (e) => {
                const data = getCellData(e.target);
                if (!data) return;
                
                // 이미 수업이 있는 곳은 드래그 시작 불가 (수정은 클릭으로)
                if (data.el.classList.contains('has-class')) {
                    // 기존 수업 클릭 시 수정 모달 띄우기 (선택 사항)
                    // const schedule = ScheduleService.getByTime(data.day, data.time);
                    // if(schedule) App.editSchedule(schedule.id);
                    return;
                }

                isDragging = true;
                startCell = data;
                currentCell = data;
                
                clearSelection();
                data.el.classList.add('drag-start');
                e.preventDefault(); // 텍스트 선택 방지
            });

            gridElement.addEventListener('mousemove', (e) => {
                if (!isDragging || !startCell) return;
                
                const data = getCellData(e.target);
                if (!data) return;

                // 다른 요일로 넘어가면 무시 (같은 요일 내에서만 드래그 허용)
                if (data.day !== startCell.day) return;

                currentCell = data;
                
                // 선택 영역 하이라이트
                const startTime = getTimeIndex(startCell.time);
                const currTime = getTimeIndex(currentCell.time);
                const minTime = Math.min(startTime, currTime);
                const maxTime = Math.max(startTime, currTime);

                gridElement.querySelectorAll(`.schedule-cell[data-day="${startCell.day}"]`).forEach(cell => {
                    const t = getTimeIndex(cell.dataset.time);
                    if (t >= minTime && t <= maxTime) {
                        cell.classList.add('drag-selected');
                    } else {
                        cell.classList.remove('drag-selected');
                    }
                });
            });

            document.addEventListener('mouseup', (e) => {
                if (!isDragging || !startCell) return;
                
                isDragging = false;
                
                // 드래그 종료 시점의 데이터 계산
                const startTimeIdx = getTimeIndex(startCell.time);
                const endTimeIdx = getTimeIndex(currentCell.time);
                
                let startStr = startCell.time;
                let endStr = currentCell.time;

                if (startTimeIdx > endTimeIdx) {
                    [startStr, endStr] = [endStr, startStr];
                }

                // 종료 시간은 해당 슬롯의 끝 시간이어야 함 (30분 더하기)
                // 예: 09:00 슬롯에서 끝났으면 수업은 09:30에 끝나는 것
                const [eh, em] = endStr.split(':').map(Number);
                let endDate = new Date(2000, 0, 1, eh, em);
                endDate.setMinutes(endDate.getMinutes() + 30);
                const endHour = endDate.getHours().toString().padStart(2, '0');
                const endMin = endDate.getMinutes().toString().padStart(2, '0');
                const finalEndStr = `${endHour}:${endMin}`;

                // 모달 열기
                App.openScheduleModal('create', {
                    day: startCell.day,
                    start: startStr,
                    end: finalEndStr
                });

                clearSelection();
                startCell = null;
                currentCell = null;
            });
        },
        
        generateTimeSlots: () => {
            const slots = [];
            for (let hour = 7; hour <= 20; hour++) {
                // 정시
                const timeStr1 = hour.toString().padStart(2, '0') + ':00';
                slots.push(timeStr1);
                // 30분
                if (hour < 20) { // 20:30은 제외 (20:00까지만)
                    const timeStr2 = hour.toString().padStart(2, '0') + ':30';
                    slots.push(timeStr2);
                }
            }
            return slots;
        },
        
        isTimeInSlot: (startTime, endTime, timeSlot) => {
            // 시간을 분으로 변환해서 정확한 비교
            const getMinutes = (timeStr) => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                return hours * 60 + minutes;
            };
            
            const slotMinutes = getMinutes(timeSlot);
            const startMinutes = getMinutes(startTime);
            const endMinutes = getMinutes(endTime);
            
            return slotMinutes >= startMinutes && slotMinutes < endMinutes;
        },
        
        isBlockStart: (schedule, timeSlot) => {
            return schedule.start === timeSlot;
        },
        
        getBlockHeight: (schedule) => {
            // 30분 단위로 블록 높이 계산
            const getMinutes = (timeStr) => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                return hours * 60 + minutes;
            };
            
            const startMinutes = getMinutes(schedule.start);
            const endMinutes = getMinutes(schedule.end);
            const durationMinutes = endMinutes - startMinutes;
            
            // 30분 단위로 블록 수 계산
            return Math.ceil(durationMinutes / 30);
        },

        toggleView: () => {
            const grid = document.getElementById('schedule-grid');
            const list = document.getElementById('schedule-list-view');
            const btn = document.getElementById('view-toggle-btn');
            
            if (!grid || !list || !btn) return;
            
            const isGridVisible = !grid.classList.contains('hidden');
            
            if (isGridVisible) {
                // Switch to List View
                grid.classList.add('hidden');
                list.classList.remove('hidden');
                Components.Schedule.renderSimpleList('#schedule-list-view');
                btn.innerHTML = '<i class="ri-grid-line"></i> 시간표로 보기';
            } else {
                // Switch to Grid View
                list.classList.add('hidden');
                grid.classList.remove('hidden');
                btn.innerHTML = '<i class="ri-list-check"></i> 리스트로 보기';
            }
        },
        
        renderList: () => {
            const list = Utils.qs('#schedule-list');
            if (!list) return;
            
            const schedules = ScheduleService.getAll();
            
            Renderer.renderList(list, schedules, (schedule) => {
                return Renderer.createElement('div', {
                    className: 'item',
                    innerHTML: `
                        <div>
                            <strong>${Utils.escapeHtml(schedule.name)}</strong>
                            <div>
                                <small>${Utils.escapeHtml(schedule.day)} ${Utils.escapeHtml(schedule.start)} - ${Utils.escapeHtml(schedule.end)} ${Utils.escapeHtml(schedule.location || '')}</small>
                            </div>
                        </div>
                    `
                });
            }, '등록된 시간표가 없습니다.');
        },
        
        renderCards: () => {
            const container = Utils.qs('#schedule-cards');
            if (!container) return;
            
            const schedules = ScheduleService.getAll();
            
            // 요일별로 정렬
            const dayOrder = ['월', '화', '수', '목', '금', '토', '일'];
            schedules.sort((a, b) => {
                const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
                if (dayDiff !== 0) return dayDiff;
                return a.start.localeCompare(b.start);
            });
            
            container.innerHTML = schedules.map(schedule => `
                <div class="schedule-card" style="border-left: 4px solid ${schedule.color};">
                    <div class="schedule-card-header">
                        <h4 class="schedule-card-title">${Utils.escapeHtml(schedule.name)}</h4>
                        <div class="schedule-card-actions">
                            <button class="schedule-card-edit" onclick="App.editSchedule('${schedule.id}')">수정</button>
                            <button class="schedule-card-delete" onclick="App.deleteSchedule('${schedule.id}')">삭제</button>
                        </div>
                    </div>
                    <div class="schedule-card-info">
                        <div class="schedule-card-time">
                            <span class="schedule-card-day">${Utils.escapeHtml(schedule.day)}</span>
                            ${Utils.escapeHtml(schedule.start)} - ${Utils.escapeHtml(schedule.end)}
                        </div>
                        ${schedule.location ? `<div class="schedule-card-location">📍 ${Utils.escapeHtml(schedule.location)}</div>` : ''}
                    </div>
                </div>
            `).join('');
        },
        
        // Render a simple vertical list used by the timetable page and dashboard
        renderSimpleList: (containerSelector) => {
            const container = document.querySelector(containerSelector);
            if (!container) return;

            const schedules = ScheduleService.getAll().map(s => s.toJSON());
            container.innerHTML = '';

            if (!schedules || schedules.length === 0) {
                container.innerHTML = '<p>저장된 시간표가 없습니다.</p>';
                return;
            }

            const dayOrder = ['월','화','수','목','금','토','일'];
            const grouped = {};
            schedules.forEach(s => {
                const day = s.day || '기타';
                if (!grouped[day]) grouped[day] = [];
                grouped[day].push(s);
            });

            const list = document.createElement('div');
            list.className = 'timetable-list';

            dayOrder.forEach(day => {
                const items = grouped[day];
                if (!items || items.length === 0) return;

                const dayHeader = document.createElement('div');
                dayHeader.className = 'timetable-day-header';
                dayHeader.textContent = day + '요일';
                list.appendChild(dayHeader);

                // sort by start time
                items.sort((a,b) => (a.start || a.startTime || '').localeCompare(b.start || b.startTime || ''));

                items.forEach(schedule => list.appendChild(Components.Schedule.createScheduleItem(schedule)));
            });

            // if there are schedules for days not in order, append them
            Object.keys(grouped).forEach(day => {
                if (dayOrder.includes(day)) return;
                const items = grouped[day];
                if (!items || items.length === 0) return;
                const dayHeader = document.createElement('div');
                dayHeader.className = 'timetable-day-header';
                dayHeader.textContent = day;
                list.appendChild(dayHeader);
                items.forEach(schedule => list.appendChild(Components.Schedule.createScheduleItem(schedule)));
            });

            container.appendChild(list);
        },

        // helper to create schedule item element
        createScheduleItem: (schedule) => {
            const item = document.createElement('div');
            item.className = 'schedule-item';
            const start = schedule.start || schedule.startTime || '';
            const end = schedule.end || schedule.endTime || '';

            item.innerHTML = `
                <div class="schedule-item-left">
                    <div class="schedule-time">${Utils.escapeHtml(start)} - ${Utils.escapeHtml(end)}</div>
                </div>
                <div class="schedule-item-center">
                    <div class="schedule-name">${Utils.escapeHtml(schedule.name)}</div>
                    ${schedule.location ? `<div class="schedule-location">📍 ${Utils.escapeHtml(schedule.location)}</div>` : ''}
                </div>
                <div class="schedule-item-right">
                    <button class="btn-delete-item" title="삭제">
                        <i class="ri-close-line"></i>
                    </button>
                </div>
            `;

            if (schedule.color) {
                item.style.borderLeft = `4px solid ${schedule.color}`;
                item.style.paddingLeft = '12px';
            }

            // 삭제 버튼 이벤트
            const deleteBtn = item.querySelector('.btn-delete-item');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`'${schedule.name}' 수업을 삭제하시겠습니까?`)) {
                        ScheduleService.delete(schedule.id);
                        App.refreshAll();
                        App.showSuccess('수업이 삭제되었습니다.');
                    }
                });
            }

            return item;
        },
        
        populateSelects: () => {
            const schedules = ScheduleService.getAll();
            const selects = [
                { element: Utils.qs('#assignment-class'), defaultText: '수업 선택 (선택사항)' },
                { element: Utils.qs('#note-class'), defaultText: '수업 선택' }
            ];
            
            selects.forEach(({ element, defaultText }) => {
                if (!element) return;
                
                element.innerHTML = `<option value="">${defaultText}</option>`;
                schedules.forEach(schedule => {
                    const option = Renderer.createElement('option', {
                        textContent: `${schedule.name} (${schedule.day} ${schedule.start}-${schedule.end})`,
                        attributes: { value: schedule.id }
                    });
                    element.appendChild(option);
                });
            });
        },
        
        renderScheduleManager: () => {
            const manager = Utils.qs('#schedule-manager');
            if (!manager) return;
            
            const savedSets = ScheduleSetService.getAll();
            
            let managerHTML = `
                <div class="schedule-manager-controls">
                    <div class="save-section">
                        <input type="text" id="schedule-set-name" placeholder="시간표 이름 (예: 1학년 1학기)" maxlength="30">
                        <button type="button" id="save-schedule-set">현재 시간표 저장</button>
                    </div>
                </div>
            `;
            
            if (savedSets.length > 0) {
                managerHTML += '<div class="saved-schedules-list">';
                managerHTML += '<h4>저장된 시간표</h4>';
                
                savedSets.forEach(set => {
                    const createdDate = new Date(set.created).toLocaleDateString('ko-KR');
                    managerHTML += `
                        <div class="saved-schedule-item">
                            <div class="schedule-info">
                                <div class="schedule-name">${Utils.escapeHtml(set.name)}</div>
                                <div class="schedule-meta">${set.schedules.length}개 수업 · ${createdDate}</div>
                            </div>
                            <div class="schedule-actions">
                                <button onclick="App.loadScheduleSet('${set.id}')">불러오기</button>
                                <button onclick="App.deleteScheduleSet('${set.id}')" class="danger">삭제</button>
                            </div>
                        </div>
                    `;
                });
                
                managerHTML += '</div>';
            } else {
                managerHTML += '<div class="empty-message">저장된 시간표가 없습니다.</div>';
            }
            
            manager.innerHTML = managerHTML;
            
            const saveBtn = Utils.qs('#save-schedule-set');
            if (saveBtn) {
                EventManager.on(saveBtn, 'click', Components.Schedule.handleSaveScheduleSet);
            }
        },
        
        handleSaveScheduleSet: () => {
            const nameInput = Utils.qs('#schedule-set-name');
            const name = nameInput?.value?.trim();
            
            if (!name) {
                alert('시간표 이름을 입력해주세요.');
                return;
            }
            
            const currentSchedules = ScheduleService.getAll();
            if (currentSchedules.length === 0) {
                alert('저장할 시간표가 없습니다.');
                return;
            }
            
            try {
                ScheduleSetService.save(name, currentSchedules);
                nameInput.value = '';
                Components.Schedule.renderScheduleManager();
                App.showSuccess(`'${name}' 시간표가 저장되었습니다.`);
            } catch (error) {
                App.showError('시간표 저장에 실패했습니다.');
            }
        }
    },
    
    Assignment: {
        renderList: () => {
            const list = Utils.qs('#assignments-list');
            if (!list) return;
            
            const assignments = AssignmentService.getSortedByDueDate();
            
            const emptyStateHTML = `
                <div class="empty-state-icon">
                    <i class="ri-task-line"></i>
                </div>
                <div class="empty-state-text">등록된 과제가 없습니다</div>
                <div class="empty-state-sub">새로운 과제를 추가하여 체계적으로 관리해보세요.</div>
            `;
            
            Renderer.renderList(list, assignments, (assignment) => {
                const today = new Date();
                const endDate = new Date(assignment.end);
                const diff = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                
                let dday = '';
                let ddayClass = 'assignment-dday';
                if (diff > 0) dday = 'D-' + diff;
                else if (diff === 0) { dday = 'D-DAY'; ddayClass += ' urgent'; }
                else { dday = '마감'; ddayClass += ' urgent'; }

                const completedClass = assignment.completed ? ' completed' : '';
                const checked = assignment.completed ? 'checked' : '';

                const item = Renderer.createElement('div', {
                    className: `assignment-item${completedClass}`,
                    innerHTML: `
                        <div class="assignment-left">
                            <input type="checkbox" class="assignment-checkbox" ${checked}>
                        </div>
                        <div class="assignment-center">
                            <div class="assignment-title">${Utils.escapeHtml(assignment.title)}</div>
                            <div class="assignment-meta">
                                <span class="${ddayClass}">${dday}</span>
                                <span>${assignment.classId ? Utils.escapeHtml(assignment.classId) + ' · ' : ''}${Utils.escapeHtml(assignment.end)} 까지</span>
                            </div>
                        </div>
                        <div class="assignment-right">
                            <button class="btn-icon edit" title="수정">
                                <i class="ri-edit-line"></i>
                            </button>
                            <button class="btn-icon delete" title="삭제">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                    `
                });

                // 이벤트 리스너 연결
                const checkbox = item.querySelector('.assignment-checkbox');
                checkbox.addEventListener('change', (e) => {
                    App.toggleAssignmentCompletion(assignment.id, e.target.checked);
                });

                const editBtn = item.querySelector('.btn-icon.edit');
                editBtn.addEventListener('click', () => {
                    App.openAssignmentModal('edit', assignment);
                });

                const deleteBtn = item.querySelector('.btn-icon.delete');
                deleteBtn.addEventListener('click', () => {
                    if (confirm(CONFIG.MESSAGES.CONFIRM_DELETE_ASSIGNMENT)) {
                        App.deleteAssignment(assignment.id);
                    }
                });

                return item;
            }, emptyStateHTML);
        },
        
        renderCalendar: () => {
            const cal = Utils.qs('#assignments-calendar');
            if (!cal) return;

            // 유지되는 달력 상태 (연, 월)
            if (!State.ui.calendarDate) {
                const d = new Date();
                d.setDate(1);
                State.ui.calendarDate = d; // first day of current month
            }

            const viewDate = new Date(State.ui.calendarDate.getTime());
            const year = viewDate.getFullYear();
            const month = viewDate.getMonth(); // 0-11

            const startOfMonth = new Date(year, month, 1);
            const endOfMonth = new Date(year, month + 1, 0);
            const startWeekday = startOfMonth.getDay(); // 0=Sun
            const daysInMonth = endOfMonth.getDate();

            const assignments = AssignmentService.getAll();

            // Helpers
            const fmt = (date) => Utils.formatDate(date);
            const inRange = (dateISO, startISO, endISO) => {
                return dateISO >= startISO && dateISO <= endISO;
            };

            // Header with navigation
            let html = '';
            html += '<div class="calendar-nav">';
            html += '<button class="cal-arrow" id="cal-prev" aria-label="이전 달">◀</button>';
            html += `<div class="cal-label">${year}년 ${month + 1}월</div>`;
            html += '<button class="cal-arrow" id="cal-next" aria-label="다음 달">▶</button>';
            html += '</div>';

            // Weekday header
            const weekdays = ['일','월','화','수','목','금','토'];
            html += '<div class="assign-calendar-header">';
            weekdays.forEach(w => { html += `<div class="cell head">${w}</div>`; });
            html += '</div>';

            // Cells grid
            html += '<div class="assign-calendar-grid">';
            html += '<div class="assign-calendar-cells">';

            // Leading blanks
            for (let i = 0; i < startWeekday; i++) {
                html += '<div class="cell empty"></div>';
            }

            // Days
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const iso = fmt(date);

                // Find assignments intersecting this day
                const items = assignments.filter(a => inRange(iso, a.start, a.end));

                html += '<div class="cell">';
                html += `<div class="day-num">${day}</div>`;

                // Render up to 2 compact bars at bottom
                items.slice(0, 2).forEach(a => {
                    const color = a.color || CONFIG.DEFAULT_COLORS.ASSIGNMENT;
                    const title = Utils.escapeHtml(a.title);
                    const completedStyle = a.completed ? 'opacity:0.5; text-decoration:line-through;' : '';
                    const checkMark = a.completed ? '✓ ' : '';
                    
                    html += `<div class="assign-bar" style="background:${color}; ${completedStyle}" title="${title} (마감: ${Utils.escapeHtml(a.end)})" onclick="App.viewAssignment('${a.id}')">` +
                            `<span class="bar-title">${checkMark}${title}</span>` +
                            `</div>`;
                });

                // If more remain, show +N indicator
                const more = items.length - 2;
                if (more > 0) {
                    html += `<div style="position:absolute; right:6px; bottom:6px; font-size:11px; color:#666;">+${more}</div>`;
                }

                html += '</div>';
            }

            html += '</div>'; // cells
            html += '</div>'; // grid

            cal.innerHTML = html;

            // Hook up navigation
            const prevBtn = Utils.qs('#cal-prev');
            const nextBtn = Utils.qs('#cal-next');
            if (prevBtn) {
                EventManager.on(prevBtn, 'click', () => {
                    const d = new Date(State.ui.calendarDate.getTime());
                    d.setMonth(d.getMonth() - 1);
                    State.ui.calendarDate = d;
                    Components.Assignment.renderCalendar();
                });
            }
            if (nextBtn) {
                EventManager.on(nextBtn, 'click', () => {
                    const d = new Date(State.ui.calendarDate.getTime());
                    d.setMonth(d.getMonth() + 1);
                    State.ui.calendarDate = d;
                    Components.Assignment.renderCalendar();
                });
            }

            // Also refresh the vertical D-day list next to the calendar
            Components.Assignment.renderVerticalList();
        },
        
        renderVerticalList: () => {
            const list = Utils.qs('#assignments-list-vertical');
            if (!list) return;
            
            const assignments = AssignmentService.getSortedByDueDate();
            
            if (assignments.length === 0) {
                list.innerHTML = '<div class="edit-empty">등록된 과제가 없습니다.</div>';
                return;
            }
            
            const today = new Date();
            list.innerHTML = '';
            
            assignments.forEach(assignment => {
                const endDate = new Date(assignment.end);
                const diff = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                
                let dday = '';
                if (diff > 0) dday = 'D-' + diff;
                else if (diff === 0) dday = 'D-DAY';
                else dday = '마감';
                
                const row = Renderer.createElement('div', {
                    className: 'vertical-row',
                    innerHTML: `
                        <span class="vertical-title">${Utils.escapeHtml(assignment.title)}</span>
                        <span class="vertical-dday">${dday}</span>
                        <span class="vertical-date">${Utils.escapeHtml(assignment.end)}</span>
                    `
                });
                list.appendChild(row);
            });
        }
    },
    
    Note: {
        renderFilterBar: () => {
            const container = Utils.qs('#notes-filter-bar');
            if (!container) return;
            
            const notes = NoteService.getAll();
            // Get unique class IDs from notes
            const classes = [...new Set(notes.map(n => n.classId).filter(Boolean))];
            
            let html = `<button class="filter-chip ${State.ui.noteFilter === 'all' ? 'active' : ''}" data-filter="all">전체</button>`;
            
            classes.forEach(cls => {
                const isActive = State.ui.noteFilter === cls;
                html += `<button class="filter-chip ${isActive ? 'active' : ''}" data-filter="${Utils.escapeHtml(cls)}">${Utils.escapeHtml(cls)}</button>`;
            });
            
            container.innerHTML = html;
            
            // Add event listeners
            container.querySelectorAll('.filter-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    const filter = btn.dataset.filter;
                    State.ui.noteFilter = filter;
                    Components.Note.renderFilterBar(); // Re-render to update active state
                    Components.Note.renderList();
                });
            });
        },

        renderList: (filterText = '') => {
            const grid = Utils.qs('#notes-grid');
            if (!grid) return;
            
            let notes = NoteService.getAll();
            
            // 1. 카테고리 필터링
            if (State.ui.noteFilter && State.ui.noteFilter !== 'all') {
                notes = notes.filter(n => n.classId === State.ui.noteFilter);
            }

            // 2. 검색 필터링
            if (filterText) {
                const term = filterText.toLowerCase();
                notes = notes.filter(n => 
                    n.title.toLowerCase().includes(term) || 
                    n.content.toLowerCase().includes(term) ||
                    (n.classId && n.classId.toLowerCase().includes(term))
                );
            }
            
            // 최신순 정렬
            notes.sort((a, b) => new Date(b.created) - new Date(a.created));
            
            const emptyStateHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; padding: 60px 0;">
                    <div class="empty-state-icon">
                        <i class="ri-book-2-line"></i>
                    </div>
                    <div class="empty-state-text">${filterText ? '검색 결과가 없습니다' : '작성된 노트가 없습니다'}</div>
                    <div class="empty-state-sub">${filterText ? '다른 키워드로 검색해보세요.' : '수업 내용을 기록하여 나만의 지식 베이스를 만들어보세요.'}</div>
                </div>
            `;
            
            Renderer.renderList(grid, notes, (note) => {
                const createdDate = new Date(note.created).toLocaleDateString('ko-KR');
                const classInfo = note.classId ? `<span class="note-class-badge">${Utils.escapeHtml(note.classId)}</span>` : '';
                
                const card = Renderer.createElement('div', {
                    className: 'note-card',
                    innerHTML: `
                        <div class="note-header">
                            ${classInfo}
                            <h3 class="note-title">${Utils.escapeHtml(note.title)}</h3>
                        </div>
                        <div class="note-preview">${Utils.escapeHtml(note.content)}</div>
                        <div class="note-footer">
                            <span class="note-date">${createdDate}</span>
                            <div class="note-actions">
                                <button class="btn-icon edit" title="수정">
                                    <i class="ri-edit-line"></i>
                                </button>
                                <button class="btn-icon delete" title="삭제">
                                    <i class="ri-delete-bin-line"></i>
                                </button>
                            </div>
                        </div>
                    `
                });
                
                // 카드 클릭 시 상세 보기 (수정 모달)
                card.addEventListener('click', (e) => {
                    // 버튼 클릭 시에는 카드 클릭 이벤트 무시
                    if (e.target.closest('.btn-icon')) return;
                    App.openNoteModal('edit', note);
                });
                
                const editBtn = card.querySelector('.btn-icon.edit');
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    App.openNoteModal('edit', note);
                });
                
                const deleteBtn = card.querySelector('.btn-icon.delete');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(CONFIG.MESSAGES.CONFIRM_DELETE_NOTE)) {
                        App.deleteNote(note.id);
                    }
                });
                
                return card;
            }, emptyStateHTML);
        }
    }
};

// ===== 공통 에러 처리 유틸리티 =====
const ErrorHandler = {
    logError: (message, error) => {
        console.error(`[Error] ${message}`, error);
        alert(`문제가 발생했습니다: ${message}`);
    }
};

// ===== 테마 관리 모듈 =====
const ThemeManager = {
    init: () => {
        const toggleBtn = document.getElementById('btn-theme-toggle');
        const icon = toggleBtn?.querySelector('i');
        
        // 저장된 테마 불러오기
        const savedTheme = localStorage.getItem('sl_theme');
        const isDark = savedTheme === 'dark';
        
        // 초기 상태 적용
        if (isDark) {
            document.body.classList.add('dark-mode');
            if (icon) icon.className = 'ri-sun-line';
        }
        
        // 토글 이벤트 연결
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const isDarkMode = document.body.classList.contains('dark-mode');
                
                // 아이콘 변경
                if (icon) {
                    icon.className = isDarkMode ? 'ri-sun-line' : 'ri-moon-line';
                }
                
                // 설정 저장
                localStorage.setItem('sl_theme', isDarkMode ? 'dark' : 'light');
            });
        }
    }
};

// ===== 메인 애플리케이션 객체 =====
const App = {
    init: () => {
        try {
            ThemeManager.init(); // 테마 매니저 초기화
            App.setupNavigation();
            App.setupForms();
            Components.Dashboard.setupScheduleSetSelector();
            App.initDemoData();
            App.refreshAll();
            
            console.log('📚 학교생활 관리 시스템이 성공적으로 초기화되었습니다.');
        } catch (error) {
            console.error('앱 초기화 중 오류 발생:', error);
            App.showError('시스템 초기화에 실패했습니다. 페이지를 새로고침해 주세요.');
        }
    },
    
    setupNavigation: () => {
        const navBtns = Utils.qsa('.nav-btn');
        const sections = Utils.qsa('.section');
        
        // 로고 클릭 시 대시보드로 이동
        const logoHome = Utils.qs('#logo-home');
        if (logoHome) {
            EventManager.on(logoHome, 'click', () => {
                try {
                    navBtns.forEach(b => b.classList.remove('active'));
                    
                    sections.forEach(s => {
                        s.classList.toggle('hidden', s.id !== 'dashboard');
                    });
                    
                    State.ui.activeSection = 'dashboard';
                    App.handleSectionChange('dashboard');
                } catch (error) {
                    console.error('로고 클릭 오류:', error);
                }
            });
        }
        
        navBtns.forEach(btn => {
            EventManager.on(btn, 'click', () => {
                try {
                    navBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    const target = btn.dataset.section;
                    State.ui.activeSection = target;
                    
                    sections.forEach(s => {
                        s.classList.toggle('hidden', s.id !== target);
                    });
                    
                    App.handleSectionChange(target);
                } catch (error) {
                    console.error('네비게이션 오류:', error);
                }
            });
        });

        // 알림 아이콘 버튼 연결
        const notificationBtn = document.querySelector('.header-actions .icon-btn .ri-notification-line')?.parentElement;
        if (notificationBtn) {
            EventManager.on(notificationBtn, 'click', (e) => {
                e.preventDefault();
                Notifications.toggle();
            });
        }

        // Hero 버튼 동작: 시작하기 / 더 알아보기
        const btnGetStarted = document.getElementById('btn-get-started');
        if (btnGetStarted) {
            console.log('✅ 시작하기 버튼 이벤트 연결 성공');
            EventManager.on(btnGetStarted, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚀 시작하기 버튼 클릭됨!');
                
                // 대시보드 섹션 표시
                navBtns.forEach(b => b.classList.remove('active'));
                sections.forEach(s => {
                    s.classList.toggle('hidden', s.id !== 'dashboard');
                });
                State.ui.activeSection = 'dashboard';
                App.handleSectionChange('dashboard');

                // 기능 카드 영역으로 스크롤 (화면 중앙에 배치)
                const featureArea = document.querySelector('.feature-cards');
                if (featureArea) {
                    featureArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                
                // 튜토리얼 시작 (스크롤 완료 대기)
                setTimeout(() => {
                    console.log('📚 튜토리얼 시작!');
                    Tutorial.start();
                }, 1000);
            });
        } else {
            console.error('❌ 시작하기 버튼을 찾을 수 없음!');
        }

        const btnLearnMore = document.getElementById('btn-learn-more');
        if (btnLearnMore) {
            console.log('✅ 더 알아보기 버튼 이벤트 연결 성공');
            EventManager.on(btnLearnMore, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📖 더 알아보기 버튼 클릭됨!');
                
                // 대시보드 섹션 표시
                navBtns.forEach(b => b.classList.remove('active'));
                sections.forEach(s => {
                    s.classList.toggle('hidden', s.id !== 'dashboard');
                });
                State.ui.activeSection = 'dashboard';
                App.handleSectionChange('dashboard');

                // 기능 카드 영역으로 스크롤 (화면 중앙에 배치)
                const featureArea = document.querySelector('.feature-cards');
                if (featureArea) {
                    featureArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                
                // 소개용 튜토리얼 시작 (스크롤 완료 대기)
                setTimeout(() => {
                    console.log('📚 소개 튜토리얼 시작!');
                    Tutorial.startLearnMore();
                }, 1000);
            });
        } else {
            console.error('❌ 더 알아보기 버튼을 찾을 수 없음!');
        }

        // Footer Navigation Setup
        const footerTutorialLink = document.getElementById('footer-tutorial-link');
        if (footerTutorialLink) {
            EventManager.on(footerTutorialLink, 'click', (e) => {
                e.preventDefault();
                // Scroll to feature cards first
                const featureArea = document.querySelector('.feature-cards');
                if (featureArea) {
                    featureArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                setTimeout(() => {
                    Tutorial.start();
                }, 800);
            });
        }

        const footerNavLinks = document.querySelectorAll('.footer-nav-link');
        footerNavLinks.forEach(link => {
            EventManager.on(link, 'click', (e) => {
                e.preventDefault();
                const target = link.dataset.target;
                
                // Update active state in header nav
                navBtns.forEach(b => {
                    if (b.dataset.section === target) {
                        b.classList.add('active');
                    } else {
                        b.classList.remove('active');
                    }
                });

                // Switch section
                State.ui.activeSection = target;
                sections.forEach(s => {
                    s.classList.toggle('hidden', s.id !== target);
                });
                App.handleSectionChange(target);
                
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    },
    
    openNoteModal: (mode, note = null) => {
        const modal = Utils.qs('#note-modal');
        const form = Utils.qs('#note-modal-form');
        const titleEl = Utils.qs('#note-modal-title'); // Header title (h3)
        const modeInput = Utils.qs('#note-modal-mode');
        const idInput = Utils.qs('#note-modal-id');
        const titleInput = Utils.qs('#note-input-title'); // Form input
        
        if (!modal || !form) return;
        
        form.reset();
        modeInput.value = mode;
        
        // 수업 목록 채우기
        const classSelect = Utils.qs('#note-modal-class');
        if (classSelect) {
            const schedules = ScheduleService.getAll();
            classSelect.innerHTML = '<option value="">수업 선택 (선택사항)</option>';
            // 중복 제거된 수업명 목록
            const uniqueClasses = [...new Set(schedules.map(s => s.name))];
            uniqueClasses.forEach(className => {
                const option = document.createElement('option');
                option.value = className;
                option.textContent = className;
                classSelect.appendChild(option);
            });
        }
        
        if (mode === 'edit' && note) {
            titleEl.textContent = '노트 수정';
            idInput.value = note.id;
            if (titleInput) titleInput.value = note.title;
            form.querySelector('#note-modal-content').value = note.content;
            if (classSelect) classSelect.value = note.classId || '';
        } else {
            titleEl.textContent = '새 노트 작성';
            idInput.value = '';
        }
        
        modal.style.display = 'flex';
    },
    
    handleNoteModalSubmit: (e) => {
        e.preventDefault();
        
        const mode = Utils.qs('#note-modal-mode').value;
        const id = Utils.qs('#note-modal-id').value;
        const title = Utils.qs('#note-input-title').value;
        const content = Utils.qs('#note-modal-content').value;
        const classId = Utils.qs('#note-modal-class').value;
        
        try {
            const noteData = {
                title,
                content,
                classId
            };
            
            if (mode === 'edit' && id) {
                noteData.id = id;
                // 기존 생성일 유지
                const oldNote = NoteService.getById(id);
                if (oldNote) noteData.created = oldNote.created;
            }
            
            NoteService.save(noteData);
            
            Utils.qs('#note-modal').style.display = 'none';
            Components.Note.renderList();
            Components.Dashboard.render(); // 대시보드 최근 노트 업데이트
            App.showSuccess(mode === 'create' ? '노트가 작성되었습니다.' : '노트가 수정되었습니다.');
            
        } catch (error) {
            ErrorHandler.logError('노트 저장 실패', error);
            alert(error.message);
        }
    },

    deleteNote: (id) => {
        if (NoteService.delete(id)) {
            Components.Note.renderList();
            Components.Dashboard.render();
            App.showSuccess('노트가 삭제되었습니다.');
        } else {
            App.showError('삭제에 실패했습니다.');
        }
    },

    viewNote: (id) => {
        // 대시보드 등에서 호출될 때 해당 노트 수정 모달 열기
        const note = NoteService.getById(id);
        if (note) {
            // 노트 섹션으로 이동 후 모달 열기
            const navBtn = document.querySelector('.nav-btn[data-section="notes"]');
            if (navBtn) navBtn.click();
            
            setTimeout(() => {
                App.openNoteModal('edit', note);
            }, 100);
        }
    },

    handleSectionChange: (section) => {
        switch (section) {
            case 'dashboard':
                // 대시보드 데이터 새로고침
                Components.Dashboard.render();
                break;
            case 'assignments':
                Components.Assignment.renderCalendar();
                Components.Assignment.renderList();
                break;
            case 'schedule':
                Components.Schedule.renderGrid();
                break;
            case 'notes':
                Components.Note.renderList();
                break;
        }
    },
    
    setupForms: () => {
        // 과제 추가 버튼 (새로운 디자인)
        const addAssignmentBtn = Utils.qs('#btn-add-assignment');
        if (addAssignmentBtn) {
            EventManager.on(addAssignmentBtn, 'click', () => {
                App.openAssignmentModal('create');
            });
        }

        // 노트 추가 버튼 (HTML onclick 속성으로 대체됨)
        // const addNoteBtn = Utils.qs('#btn-add-note');
        // if (addNoteBtn) {
        //     EventManager.on(addNoteBtn, 'click', () => {
        //         console.log('New Note button clicked');
        //         App.openNoteModal('create');
        //     });
        // }

        // 노트 검색
        const noteSearch = Utils.qs('#note-search');
        if (noteSearch) {
            EventManager.on(noteSearch, 'input', (e) => {
                Components.Note.renderList(e.target.value);
            });
        }
        
        const clearBtn = Utils.qs('#clear-schedules');
        if (clearBtn) {
            EventManager.on(clearBtn, 'click', App.handleClearSchedules);
        }

        const viewToggleBtn = Utils.qs('#view-toggle-btn');
        if (viewToggleBtn) {
            EventManager.on(viewToggleBtn, 'click', Components.Schedule.toggleView);
        }
        
        // 시간표 수정 모달 이벤트 설정
        App.setupScheduleEditModal();
        
        // 과제 수정 모달 이벤트 설정
        App.setupAssignmentModal();

        // 노트 수정 모달 이벤트 설정
        App.setupNoteModal();
    },
    
    setupNoteModal: () => {
        const modal = Utils.qs('#note-modal');
        const closeBtn = modal?.querySelector('.modal-close');
        const cancelBtn = modal?.querySelector('.btn-cancel');
        const form = Utils.qs('#note-modal-form');
        
        const closeModal = () => {
            if (modal) modal.style.display = 'none';
        };

        if (closeBtn) EventManager.on(closeBtn, 'click', closeModal);
        if (cancelBtn) EventManager.on(cancelBtn, 'click', closeModal);
        
        if (form) {
            EventManager.on(form, 'submit', App.handleNoteModalSubmit);
        }
        
        if (modal) {
            EventManager.on(modal, 'click', (e) => {
                if (e.target === modal) closeModal();
            });
        }
    },

    setupAssignmentModal: () => {
        const modal = Utils.qs('#assignment-modal');
        const closeBtn = modal?.querySelector('.modal-close');
        const cancelBtn = modal?.querySelector('.btn-cancel');
        const form = Utils.qs('#assignment-modal-form');
        
        const closeModal = () => {
            if (modal) modal.style.display = 'none';
        };

        if (closeBtn) EventManager.on(closeBtn, 'click', closeModal);
        if (cancelBtn) EventManager.on(cancelBtn, 'click', closeModal);
        
        if (form) {
            EventManager.on(form, 'submit', App.handleAssignmentModalSubmit);
        }
        
        if (modal) {
            EventManager.on(modal, 'click', (e) => {
                if (e.target === modal) closeModal();
            });
        }
    },

    setupScheduleEditModal: () => {
        // 기존 schedule-edit-modal -> schedule-modal (공용)
        const modal = Utils.qs('#schedule-modal');
        const closeBtn = modal?.querySelector('.modal-close');
        const cancelBtn = modal?.querySelector('.btn-cancel');
        const form = Utils.qs('#schedule-modal-form');
        
        const closeModal = () => {
            if (modal) modal.style.display = 'none';
        };

        if (closeBtn) EventManager.on(closeBtn, 'click', closeModal);
        if (cancelBtn) EventManager.on(cancelBtn, 'click', closeModal);
        
        if (form) {
            EventManager.on(form, 'submit', App.handleScheduleModalSubmit);
        }
        
        // 모달 배경 클릭으로 닫기
        if (modal) {
            EventManager.on(modal, 'click', (e) => {
                if (e.target === modal) closeModal();
            });
        }

        // 시간 선택 옵션 채우기 (07:00 ~ 20:30)
        const hours = [];
        for(let i=7; i<=20; i++) hours.push(i.toString().padStart(2,'0'));
        const mins = ['00', '30'];

        const selects = ['modal-start-hour', 'modal-end-hour'];
        selects.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.innerHTML = hours.map(h => `<option value="${h}">${h}</option>`).join('');
            }
        });
        const minSelects = ['modal-start-min', 'modal-end-min'];
        minSelects.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.innerHTML = mins.map(m => `<option value="${m}">${m}</option>`).join('');
            }
        });
    },

    handleScheduleModalSubmit: (e) => {
        e.preventDefault();
        const mode = document.getElementById('modal-mode').value; // create or edit
        const id = document.getElementById('modal-schedule-id').value;
        const name = document.getElementById('modal-class-name').value;
        const location = document.getElementById('modal-location').value;
        const day = document.getElementById('modal-day').value;
        const color = document.getElementById('modal-class-color').value;

        const startHour = document.getElementById('modal-start-hour').value;
        const startMin = document.getElementById('modal-start-min').value;
        const endHour = document.getElementById('modal-end-hour').value;
        const endMin = document.getElementById('modal-end-min').value;

        const start = `${startHour}:${startMin}`;
        const end = `${endHour}:${endMin}`;

        // 유효성 검사
        if (!name) { alert('수업명을 입력해주세요.'); return; }
        if (start >= end) { alert('종료 시간은 시작 시간보다 늦어야 합니다.'); return; }

        try {
            if (mode === 'edit') {
                // 수정 로직
                const schedule = ScheduleService.getById(id);
                if (!schedule) throw new Error('수정할 스케줄을 찾을 수 없습니다.');
                
                // 시간 충돌 검사 (자기 자신 제외)
                const conflicts = ScheduleService.checkConflicts(day, start, end, id);
                if (conflicts.length > 0) {
                    throw new Error(`시간이 겹치는 수업이 있습니다: ${conflicts[0].name}`);
                }

                schedule.name = name;
                schedule.location = location;
                schedule.day = day;
                schedule.start = start;
                schedule.end = end;
                schedule.color = color;

                ScheduleService.save(schedule); // save handles update if ID exists
                App.showSuccess('수업이 수정되었습니다.');
            } else {
                // 추가 로직
                const conflicts = ScheduleService.checkConflicts(day, start, end);
                if (conflicts.length > 0) {
                    throw new Error(`시간이 겹치는 수업이 있습니다: ${conflicts[0].name}`);
                }

                ScheduleService.save({
                    name, location, day, start, end, color
                });
                App.showSuccess('새 수업이 추가되었습니다.');
            }

            document.getElementById('schedule-modal').style.display = 'none';
            App.refreshAll();

        } catch (err) {
            App.showError(err.message);
        }
    },

    openScheduleModal: (mode, data = {}) => {
        const modal = document.getElementById('schedule-modal');
        if (!modal) return;

        document.getElementById('modal-mode').value = mode;
        document.getElementById('modal-title').textContent = mode === 'edit' ? '수업 수정' : '새 수업 추가';
        
        // 초기화
        if (mode === 'create') {
            document.getElementById('modal-schedule-id').value = '';
            document.getElementById('modal-class-name').value = '';
            document.getElementById('modal-location').value = '';
            document.getElementById('modal-class-color').value = CONFIG.DEFAULT_COLORS.SCHEDULE;
            
            // 전달받은 데이터(드래그 등)가 있으면 세팅
            if (data.day) document.getElementById('modal-day').value = data.day;
            if (data.start) {
                const [h, m] = data.start.split(':');
                document.getElementById('modal-start-hour').value = h;
                document.getElementById('modal-start-min').value = m;
            }
            if (data.end) {
                const [h, m] = data.end.split(':');
                document.getElementById('modal-end-hour').value = h;
                document.getElementById('modal-end-min').value = m;
            }
        } else {
            // edit
            document.getElementById('modal-schedule-id').value = data.id;
            document.getElementById('modal-class-name').value = data.name;
            document.getElementById('modal-location').value = data.location || '';
            document.getElementById('modal-day').value = data.day;
            document.getElementById('modal-class-color').value = data.color;
            
            const [sh, sm] = data.start.split(':');
            const [eh, em] = data.end.split(':');
            document.getElementById('modal-start-hour').value = sh;
            document.getElementById('modal-start-min').value = sm;
            document.getElementById('modal-end-hour').value = eh;
            document.getElementById('modal-end-min').value = em;
        }

        modal.style.display = 'flex';
    },

    // 기존 editSchedule 함수 대체
    editSchedule: (id) => {
        const schedule = ScheduleService.getById(id);
        if (schedule) {
            App.openScheduleModal('edit', schedule);
        }
    },

    openAssignmentModal: (mode, data = {}) => {
        const modal = document.getElementById('assignment-modal');
        if (!modal) return;

        document.getElementById('assignment-modal-mode').value = mode;
        document.getElementById('assignment-modal-title').textContent = mode === 'edit' ? '과제 수정' : '새 과제 추가';
        
        // 수업 목록 채우기
        const classSelect = document.getElementById('assignment-modal-class');
        classSelect.innerHTML = '<option value="">수업 선택 (선택사항)</option>';
        ScheduleService.getAll().forEach(s => {
            const option = document.createElement('option');
            option.value = s.name; // ID 대신 이름 사용 (기존 로직 유지)
            option.textContent = s.name;
            classSelect.appendChild(option);
        });

        if (mode === 'create') {
            document.getElementById('assignment-modal-id').value = '';
            document.getElementById('assignment-modal-title').value = '';
            document.getElementById('assignment-modal-class').value = '';
            document.getElementById('assignment-modal-start').value = Utils.formatDate(new Date());
            document.getElementById('assignment-modal-end').value = Utils.formatDate(new Date());
            document.getElementById('assignment-modal-color').value = CONFIG.DEFAULT_COLORS.ASSIGNMENT;
            document.getElementById('assignment-modal-notes').value = '';
        } else {
            document.getElementById('assignment-modal-id').value = data.id;
            document.getElementById('assignment-modal-title').value = data.title;
            document.getElementById('assignment-modal-class').value = data.classId || '';
            document.getElementById('assignment-modal-start').value = data.start;
            document.getElementById('assignment-modal-end').value = data.end;
            document.getElementById('assignment-modal-color').value = data.color;
            document.getElementById('assignment-modal-notes').value = data.notes || '';
        }

        modal.style.display = 'flex';
    },

    handleAssignmentModalSubmit: (e) => {
        e.preventDefault();
        const mode = document.getElementById('assignment-modal-mode').value;
        const id = document.getElementById('assignment-modal-id').value;
        
        const formData = {
            title: document.getElementById('assignment-modal-title').value.trim(),
            classId: document.getElementById('assignment-modal-class').value,
            start: document.getElementById('assignment-modal-start').value,
            end: document.getElementById('assignment-modal-end').value,
            color: document.getElementById('assignment-modal-color').value,
            notes: document.getElementById('assignment-modal-notes').value.trim()
        };

        if (!formData.title) {
            alert('과제 제목을 입력해주세요.');
            return;
        }

        try {
            if (mode === 'edit') {
                const assignment = AssignmentService.getById(id);
                if (!assignment) throw new Error('수정할 과제를 찾을 수 없습니다.');
                
                Object.assign(assignment, formData);
                AssignmentService.save(assignment);
                App.showSuccess('과제가 수정되었습니다.');
            } else {
                AssignmentService.save(formData);
                App.showSuccess('새 과제가 추가되었습니다.');
            }

            document.getElementById('assignment-modal').style.display = 'none';
            App.refreshAll();
        } catch (err) {
            App.showError(err.message);
        }
    },

    toggleAssignmentCompletion: (id, isCompleted) => {
        try {
            const assignment = AssignmentService.getById(id);
            if (assignment) {
                assignment.completed = isCompleted;
                AssignmentService.save(assignment);
                App.refreshAll();
            }
        } catch (error) {
            console.error('상태 변경 실패:', error);
        }
    },
    
    handleAssignmentSubmit: (e) => {
        e.preventDefault();
        
        try {
            const formData = {
                title: Utils.qs('#assignment-title')?.value?.trim(),
                classId: Utils.qs('#assignment-class')?.value,
                start: Utils.qs('#assignment-start')?.value,
                end: Utils.qs('#assignment-end')?.value,
                color: Utils.qs('#assignment-color')?.value || CONFIG.DEFAULT_COLORS.ASSIGNMENT,
                notes: Utils.qs('#assignment-notes')?.value?.trim()
            };
            
            const assignment = AssignmentService.save(formData);
            e.target.reset();
            App.refreshAll();
            
            App.showSuccess(`'${assignment.title}' 과제가 추가되었습니다.`);
        } catch (error) {
            App.showError(error.message);
        }
    },
    
    handleNoteSubmit: (e) => {
        e.preventDefault();
        
        try {
            const formData = {
                classId: Utils.qs('#note-class')?.value,
                title: Utils.qs('#note-title')?.value?.trim(),
                content: Utils.qs('#note-content')?.value?.trim()
            };
            
            const note = NoteService.save(formData);
            e.target.reset();
            App.refreshAll();
            
            App.showSuccess(`'${note.title}' 노트가 저장되었습니다.`);
        } catch (error) {
            App.showError(error.message);
        }
    },
    
    handleClearSchedules: () => {
        if (confirm(CONFIG.MESSAGES.CONFIRM_DELETE_SCHEDULE)) {
            try {
                ScheduleService.clear();
                App.refreshAll();
                App.showSuccess('모든 시간표가 삭제되었습니다.');
            } catch (error) {
                App.showError('시간표 삭제에 실패했습니다.');
            }
        }
    },
    
    refreshAll: () => {
        try {
            Components.Dashboard.render();
            Components.Dashboard.setupScheduleSetSelector(); // 대시보드 시간표 선택기 업데이트
            Components.Schedule.renderGrid();
            Components.Schedule.renderList();
            Components.Schedule.renderCards();
            Components.Schedule.renderScheduleManager();
            Components.Schedule.renderSimpleList('#schedule-list-view'); // 리스트 뷰 업데이트 추가
            Components.Assignment.renderList();
            Components.Assignment.renderCalendar();
            Components.Note.renderFilterBar(); // 필터 바 렌더링 추가
            Components.Note.renderList();
            Components.Schedule.populateSelects();
            // 홈 시간표 최신화
            if (typeof renderMainTimetable === 'function') {
                renderMainTimetable();
            }
        } catch (error) {
            console.error('UI 렌더링 오류:', error);
        }
    },
    
    initDemoData: () => {
        if (ScheduleService.getAll().length === 0) {
            try {
                // 블록 통합 테스트용 긴 수업 추가
                ScheduleService.save({
                    name: '실험실습',
                    day: '월',
                    start: '07:00',
                    end: '10:00',
                    location: '실험실',
                    color: '#9b59b6'
                });
                
                ScheduleService.save({
                    name: '수학',
                    day: '화',
                    start: '09:00',
                    end: '10:00',
                    location: '101호',
                    color: '#3498db'
                });
                
                ScheduleService.save({
                    name: '영어',
                    day: '수',
                    start: '10:00',
                    end: '12:00',
                    location: '102호',
                    color: '#e74c3c'
                });
                
                ScheduleService.save({
                    name: '과학',
                    day: '목',
                    start: '13:00',
                    end: '15:00',
                    location: '과학실',
                    color: '#2ecc71'
                });
            } catch (error) {
                console.warn('데모 스케줄 생성 실패:', error);
            }
        }
        
        if (AssignmentService.getAll().length === 0) {
            try {
                const today = new Date();
                const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                
                AssignmentService.save({
                    title: '수학 과제',
                    classId: '수학',
                    start: Utils.formatDate(today),
                    end: Utils.formatDate(nextWeek),
                    color: '#ff8a65',
                    notes: '1장부터 3장까지 문제 풀기'
                });
            } catch (error) {
                console.warn('데모 과제 생성 실패:', error);
            }
        }
    },
    
    renderEditTools: () => {
        const tools = Utils.qs('#edit-tools');
        if (!tools) return;
        
        const assignments = AssignmentService.getAll();
        
        if (assignments.length === 0) {
            tools.innerHTML = '<div class="edit-empty">등록된 과제가 없습니다.</div>';
            return;
        }
        
        tools.innerHTML = '<div style="padding: 20px; border: 1px solid #ddd; background: #fff9e6;">수정 도구 (모듈형 버전)</div>';
    },
    
    viewAssignment: (id) => {
        try {
            const assignment = AssignmentService.getById(id);
            if (assignment) {
                App.openAssignmentModal('edit', assignment);
            }
        } catch (error) {
            App.showError('과제 정보를 불러올 수 없습니다.');
        }
    },
    
    deleteAssignment: (id) => {
        if (confirm(CONFIG.MESSAGES.CONFIRM_DELETE_ASSIGNMENT)) {
            try {
                AssignmentService.delete(id);
                App.refreshAll();
                App.showSuccess('과제가 삭제되었습니다.');
            } catch (error) {
                App.showError('과제 삭제에 실패했습니다.');
            }
        }
    },
    
    viewNote: (id) => {
        try {
            const note = NoteService.getById(id);
            if (note) {
                alert(`${note.title}\n\n${note.content}`);
            }
        } catch (error) {
            App.showError('노트 정보를 불러올 수 없습니다.');
        }
    },
    
    deleteNote: (id) => {
        if (confirm(CONFIG.MESSAGES.CONFIRM_DELETE_NOTE)) {
            try {
                NoteService.delete(id);
                App.refreshAll();
                App.showSuccess('노트가 삭제되었습니다.');
            } catch (error) {
                App.showError('노트 삭제에 실패했습니다.');
            }
        }
    },
    
    deleteSchedule: (id) => {
        if (confirm('이 시간표를 삭제하시겠습니까?')) {
            try {
                ScheduleService.delete(id);
                App.refreshAll();
                App.showSuccess('시간표가 삭제되었습니다.');
            } catch (error) {
                App.showError('시간표 삭제에 실패했습니다.');
            }
        }
    },
    
    editSchedule: (id) => {
        try {
            const schedule = ScheduleService.getById(id);
            if (!schedule) {
                App.showError('시간표를 찾을 수 없습니다.');
                return;
            }
            
            // 모달에 기존 데이터 채우기
            Utils.qs('#edit-schedule-id').value = schedule.id;
            Utils.qs('#edit-class-name').value = schedule.name;
            Utils.qs('#edit-location').value = schedule.location || '';
            Utils.qs('#edit-class-color').value = schedule.color;
            
            // 시간 설정
            const [startHour, startMin] = schedule.start.split(':');
            const [endHour, endMin] = schedule.end.split(':');
            
            Utils.qs('#edit-start-hour').value = startHour;
            Utils.qs('#edit-start-min').value = startMin;
            Utils.qs('#edit-end-hour').value = endHour;
            Utils.qs('#edit-end-min').value = endMin;
            
            // 모달 열기
            App.openScheduleEditModal();
        } catch (error) {
            App.showError('시간표 수정 준비에 실패했습니다.');
        }
    },
    
    openScheduleEditModal: () => {
        const modal = Utils.qs('#schedule-edit-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    },
    
    closeScheduleEditModal: () => {
        const modal = Utils.qs('#schedule-edit-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            
            // 폼 리셋
            const form = Utils.qs('#schedule-edit-form');
            if (form) form.reset();
        }
    },
    
    handleScheduleEditSubmit: (e) => {
        e.preventDefault();
        
        try {
            const scheduleId = Utils.qs('#edit-schedule-id').value;
            const startHour = Utils.qs('#edit-start-hour').value;
            const startMin = Utils.qs('#edit-start-min').value;
            const endHour = Utils.qs('#edit-end-hour').value;
            const endMin = Utils.qs('#edit-end-min').value;
            
            // 기존 시간표 가져오기
            const existingSchedule = ScheduleService.getById(scheduleId);
            if (!existingSchedule) {
                throw new Error('수정할 시간표를 찾을 수 없습니다.');
            }
            
            const formData = {
                id: scheduleId,
                name: Utils.qs('#edit-class-name').value.trim(),
                day: existingSchedule.day, // 요일은 변경하지 않음
                start: `${startHour}:${startMin}`,
                end: `${endHour}:${endMin}`,
                location: Utils.qs('#edit-location').value.trim(),
                color: Utils.qs('#edit-class-color').value
            };
            
            ScheduleService.save(formData);
            App.closeScheduleEditModal();
            App.refreshAll();
            App.showSuccess('시간표가 수정되었습니다.');
        } catch (error) {
            App.showError(error.message);
        }
    },
    
    loadScheduleSet: (id) => {
        if (confirm('현재 시간표를 선택한 시간표로 교체하시겠습니까?')) {
            try {
                ScheduleSetService.load(id);
                App.refreshAll();
                Components.Schedule.renderScheduleManager();
                App.showSuccess('시간표가 불러와졌습니다.');
            } catch (error) {
                App.showError('시간표 불러오기에 실패했습니다.');
            }
        }
    },
    
    deleteScheduleSet: (id) => {
        if (confirm('저장된 시간표를 삭제하시겠습니까?')) {
            try {
                ScheduleSetService.delete(id);
                Components.Schedule.renderScheduleManager();
                App.showSuccess('시간표가 삭제되었습니다.');
            } catch (error) {
                App.showError('시간표 삭제에 실패했습니다.');
            }
        }
    },
    
    showSuccess: (message) => {
        console.log('✅', message);
    },
    
    showError: (message) => {
        console.error('❌', message);
        alert(message);
    }
};

// ===== 애플리케이션 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    
    // 통계 업데이트
    updateDashboardStats();
    
    // 메인 시간표 렌더링
    renderMainTimetable();
    
    // 랜딩 인터랙션: 스크롤 리빌
    // 주의: 히어로 버튼 이벤트는 App.setupNavigation()에서 처리하므로 여기서 중복 등록 금지
    try {

        const toReveal = [
            ...document.querySelectorAll('.feature-card'),
            ...document.querySelectorAll('.stats-section'),
            ...document.querySelectorAll('.dashboard-timetable'),
            ...document.querySelectorAll('#dashboard-recent-notes')
        ];
        toReveal.forEach(el => el.classList.add('reveal'));

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        toReveal.forEach(el => observer.observe(el));

        // 기능 카드 클릭 시 섹션 이동
        const featureCards = document.querySelectorAll('.feature-card[data-target]');
        featureCards.forEach(card => {
            const go = () => {
                const target = card.getAttribute('data-target');
                if (target === 'club') {
                    alert('클럽 활동 기능은 준비 중입니다.');
                    return;
                }
                // 네비게이션과 동일한 방식으로 섹션 전환
                const sections = Utils.qsa('.section');
                sections.forEach(s => s.classList.toggle('hidden', s.id !== target));
                State.ui.activeSection = target;
                if (typeof App.handleSectionChange === 'function') {
                    App.handleSectionChange(target);
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
            card.addEventListener('click', go);
            card.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    go();
                }
            });
        });
    } catch (e) {
        console.warn('Landing interactions init failed:', e);
    }
    
    // 탭 전환 기능
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 모든 탭 버튼 비활성화
            tabBtns.forEach(b => b.classList.remove('active'));
            // 클릭한 탭 활성화
            btn.classList.add('active');
            
            // 모든 탭 콘텐츠 숨김
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.add('hidden'));
            
            // 선택한 탭 콘텐츠 표시
            const tabName = btn.dataset.tab;
            const targetContent = document.querySelector(`#tab-${tabName}`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
            
            // 시간표 탭이면 시간표 렌더링
            if (tabName === 'schedule') {
                renderDashboardScheduleTable();
            }
        });
    });
    
    // 초기 시간표 렌더링
    renderDashboardScheduleTable();
});

// ===== 통계 업데이트 함수 =====
function updateDashboardStats() {
    // 과제 및 시간 통계 (AssignmentService / ScheduleService 사용)
    try {
    const assignments = AssignmentService.getAll();
    const completedCount = assignments.filter(a => a.completed).length;
    const remainingCount = assignments.length - completedCount;

    const completedEl = document.querySelector('#stat-completed-assignments');
    if (completedEl) completedEl.textContent = String(completedCount);

    const remainingEl = document.querySelector('#stat-remaining-assignments');
    if (remainingEl) remainingEl.textContent = String(remainingCount);

        // 과제 남은 시간: 가장 가까운 마감 과제까지 남은 시간
        const now = new Date();
        const upcoming = assignments
            .filter(a => !a.completed && a.end)
            .map(a => ({ a, due: new Date(a.end + 'T23:59:59') }))
            .filter(x => x.due >= now)
            .sort((x, y) => x.due - y.due)[0];

        const etaEl = document.querySelector('#stat-next-eta');
        if (etaEl) {
            if (upcoming) {
                const diffMs = upcoming.due.getTime() - now.getTime();
                const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                if (days > 0) etaEl.textContent = `${days}일 ${hours}시간`;
                else etaEl.textContent = `${hours}시간`;
            } else {
                etaEl.textContent = '-';
            }
        }
    } catch (err) {
        console.warn('updateDashboardStats error:', err);
    }
}

// ===== 메인 시간표 렌더링 함수 =====
function renderMainTimetable() {
    const container = document.querySelector('#main-timetable-grid');
    if (!container) return;

    // 홈은 요약을 보여준다: 오늘의 수업 리스트 (간단 요약)
    const schedules = ScheduleService.getAll();
    if (!schedules || schedules.length === 0) {
        container.innerHTML = '<div class="empty-message">등록된 시간표가 없습니다.</div>';
        return;
    }

    const todayIdx = new Date().getDay(); // 0-일
    const dayMap = ['일','월','화','수','목','금','토'];
    const today = dayMap[todayIdx];

    const todays = schedules
        .filter(s => s.day === today)
        .sort((a, b) => a.start.localeCompare(b.start));

    if (todays.length === 0) {
        container.innerHTML = '<div class="empty-message">오늘 예정된 수업이 없습니다.</div>';
        return;
    }

    const list = document.createElement('div');
    list.className = 'timetable-list';
    const header = document.createElement('div');
    header.className = 'timetable-day-header';
    header.textContent = `오늘 (${today})`;
    list.appendChild(header);

    todays.forEach(schedule => {
        const item = Components?.Schedule?.createScheduleItem
            ? Components.Schedule.createScheduleItem(schedule)
            : (() => {
                const el = document.createElement('div');
                el.className = 'schedule-item';
                el.style.borderLeft = `4px solid ${schedule.color || CONFIG.DEFAULT_COLORS.SCHEDULE}`;
                el.style.paddingLeft = '12px';
                el.innerHTML = `
                    <div class="schedule-item-left">
                        <div class="schedule-time">${Utils.escapeHtml(schedule.start)} - ${Utils.escapeHtml(schedule.end)}</div>
                    </div>
                    <div class="schedule-item-right">
                        <div class="schedule-name">${Utils.escapeHtml(schedule.name)}</div>
                        ${schedule.location ? `<div class="schedule-location">📍 ${Utils.escapeHtml(schedule.location)}</div>` : ''}
                    </div>
                `;
                return el;
            })();
        list.appendChild(item);
    });

    container.innerHTML = '';
    container.appendChild(list);
}

// 수업 시간 계산
function calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return 1;
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return Math.max(1, Math.ceil((endMinutes - startMinutes) / 60));
}

// 대시보드 시간표 테이블 렌더링
function renderDashboardScheduleTable() {
    const container = document.querySelector('#dashboard-schedule-table');
    if (!container) return;

    const schedules = ScheduleService.getAll().map(s => s.toJSON());
    
    const days = ['월요일', '화요일', '수요일', '목요일', '금요일'];
    const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
    
    let html = '<table><thead><tr><th>시간</th>';
    days.forEach(day => {
        html += `<th>${day}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    times.forEach(time => {
        html += `<tr><td>${time}</td>`;
        days.forEach(day => {
            const shortDay = day.replace('요일', '');
            // schedules saved by ScheduleService use `day` and `start`
            const schedule = schedules.find(s => s.day === shortDay && (s.start === time || s.startTime === time));
            html += `<td>${schedule ? Utils.escapeHtml(schedule.name) : '-'}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// 전역 노출 (기존 호환성 유지)
window.App = App;
window.viewAssignment = App.viewAssignment;
window.deleteAssignment = App.deleteAssignment;
window.viewNote = App.viewNote;
window.deleteNote = App.deleteNote;
window.deleteSchedule = App.deleteSchedule;
window.editSchedule = App.editSchedule;
window.renderDashboardScheduleTable = renderDashboardScheduleTable;
window.updateDashboardStats = updateDashboardStats;
window.renderMainTimetable = renderMainTimetable;