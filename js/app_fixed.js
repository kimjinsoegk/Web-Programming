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

// ===== 로컬 스토리지 추상화 모듈 =====
const Storage = {
    read: (key) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Storage read error:', error);
            return [];
        }
    },
    
    write: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Storage write error:', error);
            return false;
        }
    },
    
    clear: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }
};

// ===== 상태 관리 모듈 =====
const State = {
    ui: {
        activeSection: 'dashboard',
        editMode: false
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
        if (!data.classId) errors.push('수업을 선택해주세요.');
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
        return Storage.read(CONFIG.STORAGE_KEYS.SCHEDULE)
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
        
        const success = Storage.write(CONFIG.STORAGE_KEYS.SCHEDULE, schedules.map(s => s.toJSON()));
        if (!success) {
            throw new Error('저장에 실패했습니다.');
        }
        
        return schedule;
    },
    
    delete: (id) => {
        const schedules = ScheduleService.getAll().filter(s => s.id !== id);
        return Storage.write(CONFIG.STORAGE_KEYS.SCHEDULE, schedules.map(s => s.toJSON()));
    },
    
    clear: () => {
        return Storage.clear(CONFIG.STORAGE_KEYS.SCHEDULE);
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
        return Storage.read(CONFIG.STORAGE_KEYS.SAVED_SCHEDULES) || [];
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
        
        Storage.write(CONFIG.STORAGE_KEYS.SAVED_SCHEDULES, savedSets);
        return newSet;
    },
    
    load: (id) => {
        const savedSets = ScheduleSetService.getAll();
        const scheduleSet = savedSets.find(set => set.id === id);
        
        if (scheduleSet) {
            const schedules = scheduleSet.schedules.map(data => new Schedule(data));
            Storage.write(CONFIG.STORAGE_KEYS.SCHEDULE, schedules.map(s => s.toJSON()));
            return schedules;
        }
        return [];
    },
    
    delete: (id) => {
        const savedSets = ScheduleSetService.getAll().filter(set => set.id !== id);
        return Storage.write(CONFIG.STORAGE_KEYS.SAVED_SCHEDULES, savedSets);
    }
};

const AssignmentService = {
    getAll: () => {
        return Storage.read(CONFIG.STORAGE_KEYS.ASSIGNMENTS)
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
        
        const success = Storage.write(CONFIG.STORAGE_KEYS.ASSIGNMENTS, assignments.map(a => a.toJSON()));
        if (!success) {
            throw new Error('저장에 실패했습니다.');
        }
        
        return assignment;
    },
    
    delete: (id) => {
        const assignments = AssignmentService.getAll().filter(a => a.id !== id);
        return Storage.write(CONFIG.STORAGE_KEYS.ASSIGNMENTS, assignments.map(a => a.toJSON()));
    }
};

const NoteService = {
    getAll: () => {
        return Storage.read(CONFIG.STORAGE_KEYS.NOTES)
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
        
        const success = Storage.write(CONFIG.STORAGE_KEYS.NOTES, notes.map(n => n.toJSON()));
        if (!success) {
            throw new Error('저장에 실패했습니다.');
        }
        
        return note;
    },
    
    delete: (id) => {
        const notes = NoteService.getAll().filter(n => n.id !== id);
        return Storage.write(CONFIG.STORAGE_KEYS.NOTES, notes.map(n => n.toJSON()));
    }
};

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

// ===== UI 컴포넌트 모듈 =====
const Components = {
    Dashboard: {
        render: () => {
            const schedules = ScheduleService.getAll();
            const assignments = AssignmentService.getSortedByDueDate();
            
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
        renderGrid: () => {
            const grid = Utils.qs('#schedule-grid');
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
                    
                    if (daySchedule) {
                        const isBlockStart = Components.Schedule.isBlockStart(daySchedule, timeSlot);
                        
                        if (isBlockStart) {
                            // 블록 시작점에는 수업 정보 표시
                            gridHTML += `<div class="schedule-cell has-class" 
                                style="background-color: ${daySchedule.color}20; 
                                       border-left: 3px solid ${daySchedule.color};">
                                <div class="class-name">${Utils.escapeHtml(daySchedule.name)}</div>
                                <div class="class-time">${daySchedule.start}-${daySchedule.end}</div>
                                <div class="class-location">${Utils.escapeHtml(daySchedule.location || '')}</div>
                            </div>`;
                        } else {
                            // 블록 중간/끝 부분에는 같은 색깔로만 채우기
                            gridHTML += `<div class="schedule-cell has-class block-continue" 
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
            
            Renderer.renderList(list, assignments, (assignment) => {
                return Renderer.createElement('div', {
                    className: 'item',
                    innerHTML: `
                        <div>
                            <strong>${Utils.escapeHtml(assignment.title)}</strong>
                            <div>
                                <small>${assignment.classId ? Utils.escapeHtml(assignment.classId) + ' · ' : ''}마감: ${Utils.escapeHtml(assignment.end)}</small>
                            </div>
                        </div>
                        <div>
                            <button onclick="App.viewAssignment('${assignment.id}')">보기</button>
                            <button onclick="App.deleteAssignment('${assignment.id}')">삭제</button>
                        </div>
                    `
                });
            }, '등록된 과제가 없습니다.');
        },
        
        renderCalendar: () => {
            const cal = Utils.qs('#assignments-calendar');
            if (!cal) return;
            
            const assignments = AssignmentService.getAll();
            
            if (assignments.length === 0) {
                cal.innerHTML = '<div class="empty-message">등록된 과제가 없습니다.</div>';
            } else {
                cal.innerHTML = '<div style="border: 1px solid #ddd; padding: 20px; background: #f0f8ff; text-align: center;">과제 달력 (간단 버전)</div>';
            }
            
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
        renderList: () => {
            const list = Utils.qs('#notes-list');
            if (!list) return;
            
            const notes = NoteService.getAll();
            
            Renderer.renderList(list, notes, (note) => {
                return Renderer.createElement('div', {
                    className: 'item',
                    innerHTML: `
                        <div>
                            <strong>${Utils.escapeHtml(note.title)}</strong>
                            <div>
                                <small>${Utils.escapeHtml(note.classId || '')}</small>
                            </div>
                        </div>
                        <div>
                            <button onclick="App.viewNote('${note.id}')">보기</button>
                            <button onclick="App.deleteNote('${note.id}')">삭제</button>
                        </div>
                    `
                });
            }, '저장된 노트가 없습니다.');
        }
    }
};

// ===== 메인 애플리케이션 객체 =====
const App = {
    init: () => {
        try {
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
    },
    
    handleSectionChange: (section) => {
        switch (section) {
            case 'dashboard':
                // 대시보드 데이터 새로고침
                Components.Dashboard.refresh();
                break;
            case 'assignments':
                Components.Assignment.renderCalendar();
                break;
            case 'schedule':
                Components.Schedule.renderGrid();
                break;
        }
    },
    
    setupForms: () => {
        App.setupTimeSelects();
        
        const scheduleForm = Utils.qs('#schedule-form');
        if (scheduleForm) {
            EventManager.on(scheduleForm, 'submit', App.handleScheduleSubmit);
        }
        
        const assignmentForm = Utils.qs('#assignment-form');
        if (assignmentForm) {
            EventManager.on(assignmentForm, 'submit', App.handleAssignmentSubmit);
        }
        
        const noteForm = Utils.qs('#note-form');
        if (noteForm) {
            EventManager.on(noteForm, 'submit', App.handleNoteSubmit);
        }
        
        const clearBtn = Utils.qs('#clear-schedules');
        if (clearBtn) {
            EventManager.on(clearBtn, 'click', App.handleClearSchedules);
        }
        
        const editBtn = Utils.qs('#edit-assignments-btn');
        const editTools = Utils.qs('#edit-tools');
        if (editBtn && editTools) {
            EventManager.on(editBtn, 'click', () => {
                const isVisible = editTools.style.display !== 'none';
                editTools.style.display = isVisible ? 'none' : 'block';
                State.ui.editMode = !isVisible;
                
                if (State.ui.editMode) {
                    App.renderEditTools();
                }
            });
        }
        
        // 요일 체크박스 이벤트 설정
        App.setupDayTimeSelection();
        
        // 시간표 수정 모달 이벤트 설정
        App.setupScheduleEditModal();
    },
    
    setupDayTimeSelection: () => {
        const dayCheckboxes = Utils.qsa('input[name="class-days"]');
        let lastSelectedDays = []; // 이전에 선택된 요일들 (추적용으로만 사용)
        
        // 체크박스 변경 이벤트
        dayCheckboxes.forEach(checkbox => {
            EventManager.on(checkbox, 'change', () => {
                const currentSelectedDays = dayCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
                lastSelectedDays = [...currentSelectedDays];
            });
        });
    },
    
    setupScheduleEditModal: () => {
        const modal = Utils.qs('#schedule-edit-modal');
        const closeBtn = modal?.querySelector('.modal-close');
        const cancelBtn = modal?.querySelector('.btn-cancel');
        const form = Utils.qs('#schedule-edit-form');
        
        if (closeBtn) {
            EventManager.on(closeBtn, 'click', () => {
                App.closeScheduleEditModal();
            });
        }
        
        if (cancelBtn) {
            EventManager.on(cancelBtn, 'click', () => {
                App.closeScheduleEditModal();
            });
        }
        
        if (form) {
            EventManager.on(form, 'submit', App.handleScheduleEditSubmit);
        }
        
        // 모달 배경 클릭으로 닫기
        if (modal) {
            EventManager.on(modal, 'click', (e) => {
                if (e.target === modal) {
                    App.closeScheduleEditModal();
                }
            });
        }
    },
    
    setupTimeSelects: () => {
        const startHour = Utils.qs('#start-hour');
        const startMin = Utils.qs('#start-min');
        const endHour = Utils.qs('#end-hour');
        const endMin = Utils.qs('#end-min');
        const startTime = Utils.qs('#start-time');
        const endTime = Utils.qs('#end-time');
        
        const updateStartTime = () => {
            if (startHour && startMin && startTime) {
                startTime.value = `${startHour.value}:${startMin.value}`;
            }
        };
        
        const updateEndTime = () => {
            if (endHour && endMin && endTime) {
                endTime.value = `${endHour.value}:${endMin.value}`;
            }
        };
        
        if (startHour && startMin) {
            EventManager.on(startHour, 'change', updateStartTime);
            EventManager.on(startMin, 'change', updateStartTime);
            updateStartTime();
        }
        
        if (endHour && endMin) {
            EventManager.on(endHour, 'change', updateEndTime);
            EventManager.on(endMin, 'change', updateEndTime);
            updateEndTime();
        }
    },
    
    handleScheduleSubmit: (e) => {
        e.preventDefault();
        
        try {
            const className = Utils.qs('#class-name')?.value?.trim();
            const location = Utils.qs('#location')?.value?.trim();
            const color = Utils.qs('#class-color')?.value || CONFIG.DEFAULT_COLORS.SCHEDULE;
            
            if (!className) {
                throw new Error('수업명을 입력해주세요.');
            }
            
            // 선택된 요일들 가져오기
            const selectedDays = Array.from(document.querySelectorAll('input[name="class-days"]:checked'))
                .map(cb => cb.value);
            
            if (selectedDays.length === 0) {
                throw new Error('요일을 선택해주세요.');
            }
            
            // 현재 입력된 시간 가져오기
            const startHour = Utils.qs('#start-hour')?.value || '07';
            const startMin = Utils.qs('#start-min')?.value || '00';
            const endHour = Utils.qs('#end-hour')?.value || '08';
            const endMin = Utils.qs('#end-min')?.value || '00';
            
            const startTime = `${startHour}:${startMin}`;
            const endTime = `${endHour}:${endMin}`;
            
            // 시간 중복 검사
            for (const day of selectedDays) {
                const conflicts = ScheduleService.checkConflicts(day, startTime, endTime);
                if (conflicts.length > 0) {
                    throw new Error(`${day}요일 ${startTime}-${endTime} 시간에 이미 '${conflicts[0].name}' 수업이 있습니다.`);
                }
            }
            
            // 모든 선택된 요일에 동일한 시간으로 스케줄 저장
            const savedSchedules = [];
            for (const day of selectedDays) {
                const formData = {
                    name: className,
                    location: location,
                    color: color,
                    day: day,
                    start: startTime,
                    end: endTime
                };
                
                const schedule = ScheduleService.save(formData);
                savedSchedules.push(schedule);
            }
            
            // 체크박스만 해제 (수업명, 장소, 시간은 유지)
            document.querySelectorAll('input[name="class-days"]').forEach(cb => cb.checked = false);
            
            App.refreshAll();
            
            if (savedSchedules.length === 1) {
                App.showSuccess(`'${savedSchedules[0].name}' 수업이 ${selectedDays[0]}요일에 추가되었습니다.`);
            } else {
                App.showSuccess(`'${savedSchedules[0].name}' 수업이 ${savedSchedules.length}개 요일에 추가되었습니다.`);
            }
        } catch (error) {
            App.showError(error.message);
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
            Components.Assignment.renderList();
            Components.Assignment.renderCalendar();
            Components.Note.renderList();
            Components.Schedule.populateSelects();
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
                alert(`${assignment.title}\n수업: ${assignment.classId || '-'}\n마감: ${assignment.end}\n\n${assignment.notes || ''}`);
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
document.addEventListener('DOMContentLoaded', App.init);

// 전역 노출 (기존 호환성 유지)
window.App = App;
window.viewAssignment = App.viewAssignment;
window.deleteAssignment = App.deleteAssignment;
window.viewNote = App.viewNote;
window.deleteNote = App.deleteNote;
window.deleteSchedule = App.deleteSchedule;
window.editSchedule = App.editSchedule;