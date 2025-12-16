/**
 * 검증 모듈
 */
export const Validator = {
    schedule: (data) => {
        const errors = [];
        if (!data.name?.trim()) errors.push('수업명은 필수입니다.');
        if (!data.day) errors.push('요일을 선택해주세요.');
        if (!data.start) errors.push('시작 시간을 입력해주세요.');
        if (!data.end) errors.push('종료 시간을 입력해주세요.');
        return errors;
    },
    
    assignment: (data) => {
        const errors = [];
        if (!data.title?.trim()) errors.push('과제 제목은 필수입니다.');
        if (!data.start) errors.push('시작일을 입력해주세요.');
        if (!data.end) errors.push('마감일을 입력해주세요.');
        return errors;
    },
    
    note: (data) => {
        const errors = [];
        // 수업 선택은 선택사항으로 변경
        // if (!data.classId) errors.push('수업을 선택해주세요.');
        if (!data.title?.trim()) errors.push('노트 제목은 필수입니다.');
        if (!data.content?.trim()) errors.push('내용을 입력해주세요.');
        return errors;
    }
};
