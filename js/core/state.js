/**
 * 상태 관리 모듈
 */
export const State = {
    ui: {
        activeSection: 'dashboard',
        editMode: false,
        noteFilter: 'all',
        calendarDate: null
    },
    pendingSchedules: [] // 임시 저장된 스케줄들
};
