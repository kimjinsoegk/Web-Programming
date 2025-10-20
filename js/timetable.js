document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('timetable-form');
    const timetableGrid = document.getElementById('timetable-grid');

    const STORAGE_KEY = 'sl_schedule_v1';

    // Load saved schedules
    const loadSchedules = () => {
        try {
            const schedules = LocalStorageUtil.read(STORAGE_KEY);
            renderSchedules(schedules);
        } catch (error) {
            ErrorHandler.logError('시간표 데이터를 불러오는 중 오류가 발생했습니다.', error);
        }
    };

    // Save schedule to localStorage
    const saveSchedule = (schedule) => {
        try {
            const schedules = LocalStorageUtil.read(STORAGE_KEY);
            schedules.push(schedule);
            LocalStorageUtil.write(STORAGE_KEY, schedules);
            renderSchedules(schedules);
        } catch (error) {
            ErrorHandler.logError('시간표 데이터를 저장하는 중 오류가 발생했습니다.', error);
        }
    };

    // Render schedules in the grid
    const renderSchedules = (schedules) => {
        timetableGrid.innerHTML = '';
        if (schedules.length === 0) {
            timetableGrid.innerHTML = '<p>저장된 시간표가 없습니다.</p>';
            return;
        }

        schedules.forEach(schedule => {
            const scheduleDiv = document.createElement('div');
            scheduleDiv.className = 'schedule-item';
            scheduleDiv.innerHTML = `
                <strong>${schedule.day}</strong> ${schedule.startTime} - ${schedule.endTime}<br>
                ${schedule.name} ${schedule.location ? `(${schedule.location})` : ''}
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

            const schedule = { day, startTime, endTime, name, location };
            saveSchedule(schedule);
            form.reset();
        } catch (error) {
            ErrorHandler.logError('시간표 데이터를 제출하는 중 오류가 발생했습니다.', error);
        }
    });

    loadSchedules();
});