document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('timetable-form');
    const timetableGrid = document.getElementById('timetable-grid');

    const STORAGE_KEY = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS && CONFIG.STORAGE_KEYS.SCHEDULE)
        ? CONFIG.STORAGE_KEYS.SCHEDULE
        : 'sl_schedule_v1';

    // Load saved schedules and render using the shared grid renderer
    const loadSchedules = () => {
        try {
            if (typeof Components !== 'undefined' && Components.Schedule && Components.Schedule.renderGrid) {
                // Use the unified 30-minute slot grid renderer for consistency
                Components.Schedule.renderGrid('#timetable-grid');
            } else {
                // fallback: render raw schedules
                const schedules = LocalStorageUtil.read(STORAGE_KEY);
                const grid = document.getElementById('timetable-grid');
                if (!schedules || schedules.length === 0) {
                    if (grid) grid.innerHTML = '<p>저장된 시간표가 없습니다.</p>';
                    return;
                }
                if (grid) {
                    grid.innerHTML = schedules.map(s => `<div class="schedule-item"><strong>${Utils.escapeHtml(s.day)}</strong> ${Utils.escapeHtml(s.start || s.startTime || '')} - ${Utils.escapeHtml(s.end || s.endTime || '')}<br>${Utils.escapeHtml(s.name)} ${s.location ? `(${Utils.escapeHtml(s.location)})` : ''}</div>`).join('');
                }
            }
        } catch (error) {
            ErrorHandler.logError('시간표 데이터를 불러오는 중 오류가 발생했습니다.', error);
        }
    };

    // Save schedule (prefer ScheduleService when available)
    const saveSchedule = (schedule) => {
        try {
            if (typeof ScheduleService !== 'undefined' && ScheduleService.save) {
                // ScheduleService expects fields: name, day, start, end, location
                const toSave = {
                    name: schedule.name,
                    day: schedule.day,
                    start: schedule.start || schedule.startTime,
                    end: schedule.end || schedule.endTime,
                    location: schedule.location
                };
                ScheduleService.save(toSave);
                loadSchedules();
                return;
            }

            const schedules = LocalStorageUtil.read(STORAGE_KEY);
            // normalize to start/end properties
            const toStore = {
                day: schedule.day,
                start: schedule.start || schedule.startTime,
                end: schedule.end || schedule.endTime,
                name: schedule.name,
                location: schedule.location
            };
            schedules.push(toStore);
            LocalStorageUtil.write(STORAGE_KEY, schedules);
            renderSchedules(schedules);
        } catch (error) {
            ErrorHandler.logError('시간표 데이터를 저장하는 중 오류가 발생했습니다.', error);
        }
    };

    // Render schedules in the grid
    const renderSchedules = (schedules) => {
        timetableGrid.innerHTML = '';
        if (!schedules || schedules.length === 0) {
            timetableGrid.innerHTML = '<p>저장된 시간표가 없습니다.</p>';
            return;
        }

        schedules.forEach(schedule => {
            const scheduleDiv = document.createElement('div');
            scheduleDiv.className = 'schedule-item';
            const start = schedule.start || schedule.startTime || '';
            const end = schedule.end || schedule.endTime || '';
            scheduleDiv.innerHTML = `
                <strong>${Utils.escapeHtml(schedule.day)}</strong> ${Utils.escapeHtml(start)} - ${Utils.escapeHtml(end)}<br>
                ${Utils.escapeHtml(schedule.name)} ${schedule.location ? `(${Utils.escapeHtml(schedule.location)})` : ''}
            `;
            timetableGrid.appendChild(scheduleDiv);
        });
    };

    // Handle form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        try {
            const day = form.day.value;
            const startTime = form['start-time'].value;
            const endTime = form['end-time'].value;
            const name = form['class-name'].value;
            const location = form.location.value;

            // normalize to start/end so it matches Schedule model
            const schedule = { day, start: startTime, end: endTime, name, location };
            saveSchedule(schedule);
            form.reset();
        } catch (error) {
            ErrorHandler.logError('시간표 데이터를 제출하는 중 오류가 발생했습니다.', error);
        }
    });

    loadSchedules();
});