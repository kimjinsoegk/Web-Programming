import { Utils } from '../core/utils.js';
import { Validator } from '../core/validator.js';

export class Note {
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
