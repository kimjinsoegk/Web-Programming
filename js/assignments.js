document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('assignment-form');
    const assignmentsList = document.getElementById('assignments-list');

    const STORAGE_KEY = 'sl_assignments_v1';

    // Load saved assignments
    const loadAssignments = () => {
        try {
            const assignments = LocalStorageUtil.read(STORAGE_KEY);
            renderAssignments(assignments);
        } catch (error) {
            ErrorHandler.logError('과제 데이터를 불러오는 중 오류가 발생했습니다.', error);
        }
    };

    // Save assignment to localStorage
    const saveAssignment = (assignment) => {
        try {
            const assignments = LocalStorageUtil.read(STORAGE_KEY);
            assignments.push(assignment);
            LocalStorageUtil.write(STORAGE_KEY, assignments);
            renderAssignments(assignments);
        } catch (error) {
            ErrorHandler.logError('과제 데이터를 저장하는 중 오류가 발생했습니다.', error);
        }
    };

    // Render assignments in the list
    const renderAssignments = (assignments) => {
        assignmentsList.innerHTML = '';
        if (assignments.length === 0) {
            assignmentsList.innerHTML = '<p>저장된 과제가 없습니다.</p>';
            return;
        }

        assignments.forEach(assignment => {
            const assignmentDiv = document.createElement('div');
            assignmentDiv.className = 'assignment-item';
            assignmentDiv.innerHTML = `
                <strong>${assignment.title}</strong><br>
                시작일: ${assignment.startDate}<br>
                마감일: ${assignment.dueDate}
            `;
            assignmentsList.appendChild(assignmentDiv);
        });
    };

    // Handle form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        try {
            const title = form['assignment-title'].value;
            const startDate = form['start-date'].value;
            const dueDate = form['due-date'].value;

            const assignment = { title, startDate, dueDate };
            saveAssignment(assignment);
            form.reset();
        } catch (error) {
            ErrorHandler.logError('과제 데이터를 제출하는 중 오류가 발생했습니다.', error);
        }
    });

    loadAssignments();
});