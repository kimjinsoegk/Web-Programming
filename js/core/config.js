/**
 * 전역 설정 및 상수
 */
export const CONFIG = {
    STORAGE_KEYS: {
        SCHEDULE: 'sl_schedule_v1',
        ASSIGNMENTS: 'sl_assign_v1',
        NOTES: 'sl_notes_v1',
        SAVED_SCHEDULES: 'saved_schedule_sets'
    },
    DEFAULT_COLORS: {
        SCHEDULE: '#3498db',
        ASSIGNMENT: '#ff8a65'
    },
    MESSAGES: {
        CONFIRM_DELETE_SCHEDULE: '모든 시간표를 삭제하시겠습니까?',
        CONFIRM_DELETE_ASSIGNMENT: '과제를 삭제하시겠습니까?',
        CONFIRM_DELETE_NOTE: '노트를 삭제하시겠습니까?',
        ERROR_REQUIRED_FIELDS: '필수 필드를 모두 입력해주세요.',
        ERROR_SAVE_FAILED: '저장에 실패했습니다.'
    }
};
