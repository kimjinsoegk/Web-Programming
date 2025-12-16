import { Utils } from '../core/utils.js';
import { CONFIG } from '../core/config.js';
import { Validator } from '../core/validator.js';

export class Schedule {
    constructor(data) {
        this.id = data.id || Utils.generateId();
        this.name = data.name || '';
        this.day = data.day || '';
        this.start = data.start || '';
        this.end = data.end || '';
        this.location = data.location || '';
        this.color = data.color || CONFIG.DEFAULT_COLORS.SCHEDULE;
        this.created = data.created || new Date().toISOString();
    }
    
    validate() {
        return Validator.schedule(this);
    }
    
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            day: this.day,
            start: this.start,
            end: this.end,
            location: this.location,
            color: this.color,
            created: this.created
        };
    }
}
