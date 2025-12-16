import { Utils } from '../core/utils.js';
import { CONFIG } from '../core/config.js';
import { State } from '../core/state.js';
import { EventManager } from '../core/event-manager.js';
import { Renderer } from './renderer.js';
import { ScheduleService, ScheduleSetService } from '../services/schedule-service.js';
import { AssignmentService } from '../services/assignment-service.js';
import { NoteService } from '../services/note-service.js';

export const Components = {
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
                const [eh, em] = endStr.split(':').map(Number);
                let endDate = new Date(2000, 0, 1, eh, em);
                endDate.setMinutes(endDate.getMinutes() + 30);
                const endHour = endDate.getHours().toString().padStart(2, '0');
                const endMin = endDate.getMinutes().toString().padStart(2, '0');
                const finalEndStr = `${endHour}:${endMin}`;

                // 모달 열기
                if (window.App && typeof window.App.openScheduleModal === 'function') {
                    window.App.openScheduleModal('create', {
                        day: startCell.day,
                        start: startStr,
                        end: finalEndStr
                    });
                }

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

            const deleteBtn = item.querySelector('.btn-delete-item');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`'${schedule.name}' 수업을 삭제하시겠습니까?`)) {
                        ScheduleService.delete(schedule.id);
                        if (window.App && typeof window.App.refreshAll === 'function') {
                            window.App.refreshAll();
                            window.App.showSuccess('수업이 삭제되었습니다.');
                        }
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
                if (window.App) window.App.showSuccess(`'${name}' 시간표가 저장되었습니다.`);
            } catch (error) {
                if (window.App) window.App.showError('시간표 저장에 실패했습니다.');
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
                    if (window.App) window.App.toggleAssignmentCompletion(assignment.id, e.target.checked);
                });

                const editBtn = item.querySelector('.btn-icon.edit');
                editBtn.addEventListener('click', () => {
                    if (window.App) window.App.openAssignmentModal('edit', assignment);
                });

                const deleteBtn = item.querySelector('.btn-icon.delete');
                deleteBtn.addEventListener('click', () => {
                    if (confirm(CONFIG.MESSAGES.CONFIRM_DELETE_ASSIGNMENT)) {
                        if (window.App) window.App.deleteAssignment(assignment.id);
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
                    if (window.App) window.App.openNoteModal('edit', note);
                });
                
                const editBtn = card.querySelector('.btn-icon.edit');
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.App) window.App.openNoteModal('edit', note);
                });
                
                const deleteBtn = card.querySelector('.btn-icon.delete');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(CONFIG.MESSAGES.CONFIRM_DELETE_NOTE)) {
                        if (window.App) window.App.deleteNote(note.id);
                    }
                });
                
                return card;
            }, emptyStateHTML);
        }
    }
};
