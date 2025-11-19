document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('assignment-form');
    const assignmentsList = document.getElementById('assignments-list');

    // Centralized storage key (use CONFIG if available, fallback to legacy)
    const STORAGE_KEY = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS && CONFIG.STORAGE_KEYS.ASSIGNMENTS)
        ? CONFIG.STORAGE_KEYS.ASSIGNMENTS
        : 'sl_assign_v1';

    // Load saved assignments (prefer AssignmentService when available)
    const loadAssignments = () => {
        try {
            let assignments = [];
            if (typeof AssignmentService !== 'undefined' && AssignmentService.getAll) {
                assignments = AssignmentService.getAll().map(a => ({
                    id: a.id,
                    title: a.title,
                    classId: a.classId,
                    start: a.start,
                    end: a.end,
                    completed: a.completed || false,
                    notes: a.notes || ''
                }));
            } else {
                assignments = LocalStorageUtil.read(STORAGE_KEY).map(a => ({
                    id: a.id || a.title + '_' + (a.startDate || a.start),
                    title: a.title || '',
                    classId: a.classId || a.class || '',
                    start: a.start || a.startDate || '',
                    end: a.end || a.dueDate || '',
                    completed: a.completed || false,
                    notes: a.notes || ''
                }));
            }

            renderAssignments(assignments);
        } catch (error) {
            ErrorHandler.logError('과제 데이터를 불러오는 중 오류가 발생했습니다.', error);
        }
    };

    // Save assignment (prefer AssignmentService when available)
    const saveAssignment = (assignment) => {
        try {
            if (typeof AssignmentService !== 'undefined' && AssignmentService.save) {
                const toSave = {
                    title: assignment.title,
                    classId: assignment.classId || '',
                    start: assignment.start || assignment.startDate,
                    end: assignment.end || assignment.dueDate,
                    notes: assignment.notes || ''
                };
                AssignmentService.save(toSave);
                loadAssignments();
                return;
            }

            const assignments = LocalStorageUtil.read(STORAGE_KEY);
            const toStore = {
                id: assignment.id || (assignment.title + '_' + (assignment.start || assignment.startDate || Date.now())),
                title: assignment.title,
                classId: assignment.classId || '',
                start: assignment.start || assignment.startDate,
                end: assignment.end || assignment.dueDate,
                completed: assignment.completed || false,
                notes: assignment.notes || ''
            };
            assignments.push(toStore);
            LocalStorageUtil.write(STORAGE_KEY, assignments);
            renderAssignments(assignments);
        } catch (error) {
            ErrorHandler.logError('과제 데이터를 저장하는 중 오류가 발생했습니다.', error);
        }
    };

    // Render assignments in the list
    const renderAssignments = (assignments) => {
        assignmentsList.innerHTML = '';
        if (!assignments || assignments.length === 0) {
            assignmentsList.innerHTML = '<p>저장된 과제가 없습니다.</p>';
            return;
        }

        assignments.forEach(assignment => {
            const assignmentDiv = document.createElement('div');
            assignmentDiv.className = 'assignment-item';
            const start = assignment.start || assignment.startDate || '';
            const end = assignment.end || assignment.dueDate || '';
            const checked = assignment.completed ? 'checked' : '';
            const completedClass = assignment.completed ? ' assignment-completed' : '';
            assignmentDiv.innerHTML = `
                <label class="assignment-row${completedClass}">
                    <input type="checkbox" class="assignment-complete" data-id="${Utils.escapeHtml(assignment.id)}" ${checked} />
                    <span class="assignment-info">
                        <strong>${Utils.escapeHtml(assignment.title)}</strong><br>
                        시작일: ${Utils.escapeHtml(start)}<br>
                        마감일: ${Utils.escapeHtml(end)}
                    </span>
                </label>
            `;
            assignmentsList.appendChild(assignmentDiv);
        });
    };

    // Toggle completed state for an assignment
    const toggleCompleted = (id, completed) => {
        try {
            if (typeof AssignmentService !== 'undefined' && AssignmentService.getById && AssignmentService.save) {
                const existing = AssignmentService.getById(id);
                if (!existing) return;
                const data = existing.toJSON ? existing.toJSON() : Object.assign({}, existing);
                data.completed = !!completed;
                AssignmentService.save(data);
                loadAssignments();
                return;
            }

            const assignments = LocalStorageUtil.read(STORAGE_KEY);
            const idx = assignments.findIndex(a => a.id === id);
            if (idx >= 0) {
                assignments[idx].completed = !!completed;
                LocalStorageUtil.write(STORAGE_KEY, assignments);
                renderAssignments(assignments);
            }
        } catch (error) {
            ErrorHandler.logError('과제 완료 상태 변경 중 오류가 발생했습니다.', error);
        }
    };

    // Event delegation for checkbox changes
    assignmentsList.addEventListener('change', (e) => {
        const target = e.target;
        if (target && target.classList && target.classList.contains('assignment-complete')) {
            const id = target.dataset.id;
            const checked = target.checked;
            toggleCompleted(id, checked);
        }
    });

    // Handle form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        try {
            const title = form['assignment-title'].value;
            const startDate = form['start-date'].value;
            const dueDate = form['due-date'].value;

            const assignment = { title, start: startDate, end: dueDate };
            saveAssignment(assignment);
            form.reset();
        } catch (error) {
            ErrorHandler.logError('과제 데이터를 제출하는 중 오류가 발생했습니다.', error);
        }
    });

    loadAssignments();
});