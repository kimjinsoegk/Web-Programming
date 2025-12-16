import { CONFIG } from '../core/config.js';
import { LocalStorageUtil } from './storage.js';
import { Note } from '../models/note.js';

export const NoteService = {
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
