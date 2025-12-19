import { State } from '../app.js'; // Circular dependency warning: State is in app.js. 
// Better to move State to a separate file or pass it as argument.
// For now, I will assume State is available globally or I will move State to core/state.js

export const Tutorial = (() => {
    const STEPS = [
        {
            targetSelector: '.feature-card[data-target="schedule"]',
            title: '시간표 관리',
            body: '수업 시간을 등록하고, 주간 시간표를 한눈에 볼 수 있는 공간이에요.'
        },
        {
            targetSelector: '.feature-card[data-target="assignments"]',
            title: '과제 추적',
            body: '과제 마감일과 진행 상태를 한 번에 관리할 수 있어요.'
        },
        {
            targetSelector: '.feature-card[data-target="notes"]',
            title: '필기 노트',
            body: '수업별로 필기를 정리하고, 나중에 다시 복습하기 좋아요.'
        }
    ];

    let currentStep = 0;
    let highlightEl = null;
    let tooltipEl = null;

    const clear = () => {
        const overlay = document.querySelector('.tutorial-overlay');
        if (overlay) overlay.remove();
        if (highlightEl) highlightEl.remove();
        if (tooltipEl) tooltipEl.remove();
        highlightEl = null;
        tooltipEl = null;
    };

    const positionForTarget = (target) => {
        // 위치 계산 및 하이라이트/말풍선 배치
        const rect = target.getBoundingClientRect();

        if (!highlightEl) {
            highlightEl = document.createElement('div');
            highlightEl.className = 'tutorial-highlight';
            document.body.appendChild(highlightEl);
        }

        // 하이라이트 박스 위치 (absolute - 문서 기준)
        highlightEl.style.top = `${rect.top - 8 + window.scrollY}px`;
        highlightEl.style.left = `${rect.left - 8}px`;
        highlightEl.style.width = `${rect.width + 16}px`;
        highlightEl.style.height = `${rect.height + 16}px`;

        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.className = 'tutorial-tooltip';
            document.body.appendChild(tooltipEl);
        }

        // 말풍선 위치 계산 - 현재 뷰포트 기준 (fixed position)
        // 요소가 화면 하단에 가까우면 위에, 아니면 아래에 표시
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        let tooltipTop;
        if (spaceBelow > 200) {
            // 아래쪽 공간이 충분하면 요소 아래에 표시
            tooltipTop = rect.bottom + 20;
        } else if (spaceAbove > 200) {
            // 위쪽 공간이 충분하면 요소 위에 표시
            tooltipTop = rect.top - 180; // 말풍선 높이 약 160px + 여유 20px
        } else {
            // 공간이 부족하면 화면 중앙에 표시
            tooltipTop = (viewportHeight - 160) / 2;
        }
        
        const tooltipLeft = rect.left + (rect.width / 2) - 160; // 중앙 정렬 (말풍선 너비 320px의 절반)
        
        // 화면 밖으로 나가지 않도록 조정
        const viewportWidth = window.innerWidth;
        let finalLeft = tooltipLeft;
        
        if (tooltipLeft < 16) {
            finalLeft = 16;
        } else if (tooltipLeft + 320 > viewportWidth - 16) {
            finalLeft = viewportWidth - 336;
        }

        tooltipEl.style.top = `${tooltipTop}px`;
        tooltipEl.style.left = `${finalLeft}px`;
    };

    const renderStep = () => {
        const step = STEPS[currentStep];
        if (!step) {
            clear();
            return;
        }

        const target = document.querySelector(step.targetSelector);
        if (!target) {
            console.error(`튜토리얼 타겟을 찾을 수 없습니다: ${step.targetSelector}`);
            clear();
            return;
        }

        console.log(`📚 튜토리얼 ${currentStep + 1}/${STEPS.length}: ${step.title}`);

        // 오버레이 생성 및 구멍 뚫기 (clip-path 사용)
        let overlay = document.querySelector('.tutorial-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'tutorial-overlay';
            document.body.appendChild(overlay);
        }
        
        // 타겟 요소 위치를 기준으로 clip-path 설정
        const rect = target.getBoundingClientRect();
        // Fixed Overlay이므로 Viewport 기준 좌표 사용 (window.scrollY 제거)
        const topRect = rect.top - 8;
        const leftRect = rect.left - 8;
        const rightRect = rect.left + rect.width + 8;
        const bottomRect = rect.top + rect.height + 8;
        
        // clip-path 제거 (CSS box-shadow로 대체)
        overlay.style.clipPath = 'none';

        // 툴팁 생성 및 내용 설정
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.className = 'tutorial-tooltip';
            document.body.appendChild(tooltipEl);
        }

        tooltipEl.innerHTML = '';
        
        // 진행 상태 표시
        const progress = document.createElement('div');
        progress.className = 'tutorial-progress';
        progress.textContent = `${currentStep + 1} / ${STEPS.length}`;
        progress.style.cssText = 'font-size: 12px; color: #9ca3af; margin-bottom: 8px; font-weight: 600;';
        
        const title = document.createElement('div');
        title.className = 'tutorial-tooltip-title';
        title.textContent = step.title;

        const body = document.createElement('div');
        body.className = 'tutorial-tooltip-body';
        body.textContent = step.body;

        const actions = document.createElement('div');
        actions.className = 'tutorial-tooltip-actions';

        const btnSkip = document.createElement('button');
        btnSkip.className = 'tutorial-btn-skip';
        btnSkip.textContent = '건너뛰기';
        btnSkip.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('⏭️ 튜토리얼 건너뛰기');
            clear();
        });

        const btnNext = document.createElement('button');
        btnNext.className = 'tutorial-btn-next';
        btnNext.textContent = currentStep === STEPS.length - 1 ? '완료' : '다음';
        btnNext.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            currentStep += 1;
            if (currentStep >= STEPS.length) {
                console.log('✅ 튜토리얼 완료');
                clear();
            } else {
                console.log('➡️ 다음 단계로');
                renderStep();
            }
        });

        actions.appendChild(btnSkip);
        actions.appendChild(btnNext);

        tooltipEl.appendChild(progress);
        tooltipEl.appendChild(title);
        tooltipEl.appendChild(body);
        tooltipEl.appendChild(actions);

        // 타겟 위치 설정 및 스크롤 (이 함수가 스크롤과 위치 조정을 모두 처리)
        positionForTarget(target);
    };

    const start = () => {
        currentStep = 0;
        renderStep();
    };

    const startLearnMore = () => {
        // "더 알아보기"는 설명 문구를 조금 더 소개용 톤으로 변경
        STEPS[0].body = '시간표 관리에서는 주간 수업 일정을 한 번에 확인하고 수정할 수 있어요.';
        STEPS[1].body = '과제 추적에서는 과제의 마감일과 D-DAY를 관리하며, 대시보드와 알림에서 확인할 수 있어요.';
        STEPS[2].body = '필기 노트에서는 수업별로 내용을 기록하고, 최근 노트를 홈 화면에서 바로 확인할 수 있어요.';
        STEPS[3].body = '클럽 활동은 동아리 일정과 공지를 관리할 수 있도록 확장될 기능이에요.';
        start();
    };

    return { start, startLearnMore };
})();
