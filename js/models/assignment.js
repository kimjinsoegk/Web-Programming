import { Utils } from '../core/utils.js';
import { CONFIG } from '../core/config.js';
import { Validator } from '../core/validator.js';

export class Assignment {
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
