document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('note-form');
    const notesList = document.getElementById('notes-list');
    const classSelect = document.getElementById('class-select');

    const NOTES_STORAGE_KEY = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS && CONFIG.STORAGE_KEYS.NOTES)
        ? CONFIG.STORAGE_KEYS.NOTES
        : 'sl_notes_v1';

    const CLASSES_STORAGE_KEY = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS && CONFIG.STORAGE_KEYS.SCHEDULE)
        ? CONFIG.STORAGE_KEYS.SCHEDULE
        : 'sl_schedule_v1';

    // Load classes into the dropdown
    const loadClasses = () => {
        try {
            const classes = LocalStorageUtil.read(CLASSES_STORAGE_KEY);
            classSelect.innerHTML = '';
            if (classes.length === 0) {
                classSelect.innerHTML = '<option value="">등록된 수업이 없습니다</option>';
                classSelect.disabled = true;
            } else {
                classes.forEach(cls => {
                    const option = document.createElement('option');
                    option.value = cls.name;
                    option.textContent = cls.name;
                    classSelect.appendChild(option);
                });
                classSelect.disabled = false;
            }
        } catch (error) {
            ErrorHandler.logError('수업 데이터를 불러오는 중 오류가 발생했습니다.', error);
        }
    };

    // Load saved notes
    const loadNotes = () => {
        try {
            const notes = LocalStorageUtil.read(NOTES_STORAGE_KEY);
            renderNotes(notes);
        } catch (error) {
            ErrorHandler.logError('노트 데이터를 불러오는 중 오류가 발생했습니다.', error);
        }
    };

    // Save note to localStorage
    const saveNote = (note) => {
        try {
            const notes = LocalStorageUtil.read(NOTES_STORAGE_KEY);
            notes.push(note);
            LocalStorageUtil.write(NOTES_STORAGE_KEY, notes);
            renderNotes(notes);
        } catch (error) {
            ErrorHandler.logError('노트 데이터를 저장하는 중 오류가 발생했습니다.', error);
        }
    };

    // Render notes in the list
    const renderNotes = (notes) => {
        notesList.innerHTML = '';
        if (notes.length === 0) {
            notesList.innerHTML = '<p>저장된 노트가 없습니다.</p>';
            return;
        }

        notes.forEach(note => {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'note-item';
            noteDiv.innerHTML = `
                <strong>${note.className}</strong><br>
                ${note.content}
            `;
            notesList.appendChild(noteDiv);
        });
    };

    // Handle form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        try {
            const className = form['class-select'].value;
            const content = form['note-content'].value;

            const note = { className, content };
            saveNote(note);
            form.reset();
        } catch (error) {
            ErrorHandler.logError('노트 데이터를 제출하는 중 오류가 발생했습니다.', error);
        }
    });

    loadClasses();
    loadNotes();
});