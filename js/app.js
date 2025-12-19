import { CONFIG } from './core/config.js';
import { Utils, ErrorHandler } from './core/utils.js';
import { State } from './core/state.js';
import { EventManager } from './core/event-manager.js';
import { ScheduleService, ScheduleSetService } from './services/schedule-service.js';
import { AssignmentService } from './services/assignment-service.js';
import { NoteService } from './services/note-service.js';
import { BackupService } from './services/backup-service.js';
import { Notifications } from './ui/notifications.js';
import { Tutorial } from './ui/tutorial.js';
import { Components } from './ui/components.js';

// ===== 메인 애플리케이션 객체 =====
export const App = {
    init: () => {
        try {
            App.setupNavigation();
            App.setupForms();
            App.setupSettingsModal(); // 설정 모달 초기화
            Components.Dashboard.setupScheduleSetSelector();
            App.initDemoData();
            App.refreshAll();
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
            EventManager.on(btnGetStarted, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
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
                    Tutorial.start();
                }, 1000);
            });
        }

        const btnLearnMore = document.getElementById('btn-learn-more');
        if (btnLearnMore) {
            EventManager.on(btnLearnMore, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
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
                    Tutorial.startLearnMore();
                }, 1000);
            });
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

    setupSettingsModal: () => {
        const modal = Utils.qs('#settings-modal');
        const btnProfile = Utils.qs('#btn-profile');
        const closeBtn = modal?.querySelector('.modal-close');
        
        const openModal = () => {
            if (modal) modal.style.display = 'flex';
        };
        
        const closeModal = () => {
            if (modal) modal.style.display = 'none';
        };

        if (btnProfile) EventManager.on(btnProfile, 'click', openModal);
        if (closeBtn) EventManager.on(closeBtn, 'click', closeModal);
        
        if (modal) {
            EventManager.on(modal, 'click', (e) => {
                if (e.target === modal) closeModal();
            });
        }

        // 백업 (내보내기)
        const btnExport = Utils.qs('#btn-backup-export');
        if (btnExport) {
            EventManager.on(btnExport, 'click', () => {
                if (BackupService.export()) {
                    App.showSuccess('데이터 백업 파일이 다운로드되었습니다.');
                } else {
                    App.showError('백업 파일 생성에 실패했습니다.');
                }
            });
        }

        // 복구 (불러오기)
        const btnImportTrigger = Utils.qs('#btn-backup-import-trigger');
        const fileInput = Utils.qs('#backup-file-input');
        
        if (btnImportTrigger && fileInput) {
            EventManager.on(btnImportTrigger, 'click', () => {
                fileInput.click();
            });
            
            EventManager.on(fileInput, 'change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                try {
                    const success = await BackupService.import(file);
                    if (success) {
                        App.showSuccess('데이터가 성공적으로 복구되었습니다.');
                        App.refreshAll();
                        closeModal();
                    }
                } catch (error) {
                    App.showError('데이터 복구 실패: ' + error.message);
                }
                
                // Reset input
                fileInput.value = '';
            });
        }

        // 초기화
        const btnReset = Utils.qs('#btn-reset-all');
        if (btnReset) {
            EventManager.on(btnReset, 'click', () => {
                if (confirm('정말로 모든 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
                    if (BackupService.resetAll()) {
                        App.showSuccess('모든 데이터가 초기화되었습니다.');
                        App.refreshAll();
                        closeModal();
                    }
                }
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
        // 사용자 피드백 (필요시 토스트 메시지 구현)
        console.log('✅', message);
        // alert(message); // 너무 잦은 alert 방지
    },
    
    showError: (message) => {
        console.error('❌', message);
        alert(message);
    }
};

// ===== 통계 업데이트 함수 =====
export function updateDashboardStats() {
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
export function renderMainTimetable() {
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
export function renderDashboardScheduleTable() {
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

// ===== 애플리케이션 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
    // 전역 객체 설정 (호환성 유지)
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

    App.init();
    
    // 통계 업데이트
    updateDashboardStats();
    
    // 메인 시간표 렌더링
    renderMainTimetable();
    
    // 랜딩 인터랙션: 스크롤 리빌
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

// 앱 초기화 실행
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
