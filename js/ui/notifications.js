import { Utils } from '../core/utils.js';
import { AssignmentService } from '../services/assignment-service.js';
import { NoteService } from '../services/note-service.js';

export const Notifications = (() => {
    let panelEl = null;

    const buildPanel = () => {
        if (panelEl) return panelEl;
        panelEl = document.createElement('div');
        panelEl.className = 'notification-panel';
        panelEl.style.position = 'fixed';
        panelEl.style.top = '72px';
        panelEl.style.right = '20px';
        panelEl.style.width = '320px';
        panelEl.style.maxHeight = '420px';
        panelEl.style.overflowY = 'auto';
        panelEl.style.background = '#ffffff';
        panelEl.style.borderRadius = '16px';
        panelEl.style.boxShadow = '0 18px 45px rgba(15,23,42,0.25)';
        panelEl.style.border = '1px solid var(--border-light)';
        panelEl.style.zIndex = '50';
        document.body.appendChild(panelEl);
        return panelEl;
    };

    const formatDDay = (dateStr) => {
        if (!dateStr) return '-';
        const today = new Date();
        const target = new Date(dateStr);
        const diff = Math.floor((target - today) / (1000 * 60 * 60 * 24));
        if (isNaN(diff)) return '-';
        if (diff > 0) return `D-${diff}`;
        if (diff === 0) return 'D-DAY';
        return `D+${Math.abs(diff)}`;
    };

    const render = () => {
        const el = buildPanel();
        const assignments = AssignmentService.getAll();
        const notes = NoteService.getAll();

        let html = '<div style="padding:12px 14px; border-bottom:1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center;">';
        html += '<strong style="font-size:14px;">알림</strong>';
        html += '<button type="button" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9ca3af;" data-close="1">×</button>';
        html += '</div>';

        html += '<div style="padding:10px 14px;">';
        html += '<div style="font-size:12px; font-weight:600; color:var(--text-secondary); margin-bottom:6px;">과제 D-DAY</div>';

        const upcoming = assignments
            .filter(a => a.end)
            .sort((a,b) => new Date(a.end) - new Date(b.end));

        if (upcoming.length === 0) {
            html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">등록된 과제가 없습니다.</div>';
        } else {
            upcoming.slice(0, 5).forEach(a => {
                const dday = formatDDay(a.end);
                html += `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:6px;">
                    <div style="max-width:190px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${Utils.escapeHtml(a.title)}
                    </div>
                    <div style="font-weight:600;color:${dday === 'D-DAY' ? 'var(--danger)' : 'var(--text-secondary)'};">${dday}</div>
                </div>`;
            });
        }

        html += '<div style="font-size:12px; font-weight:600; color:var(--text-secondary); margin:10px 0 6px;">노트</div>';

        if (!notes || notes.length === 0) {
            html += '<div style="font-size:12px;color:var(--text-muted);">저장된 노트가 없습니다.</div>';
        } else {
            notes.slice(0, 6).forEach(n => {
                const created = new Date(n.created).toLocaleDateString('ko-KR');
                html += `<button type="button" data-note-id="${n.id}" style="width:100%;text-align:left;border:none;background:none;padding:6px 4px;border-radius:8px;cursor:pointer;">
                    <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${Utils.escapeHtml(n.title)}</div>
                    <div style="font-size:11px;color:var(--text-muted);">${Utils.escapeHtml(n.classId || '')} · ${created}</div>
                </button>`;
            });
        }

        html += '</div>';

        el.innerHTML = html;

        el.querySelector('[data-close="1"]').addEventListener('click', () => {
            hide();
        });

        el.querySelectorAll('[data-note-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-note-id');
                if (window.App && typeof window.App.viewNote === 'function') {
                    window.App.viewNote(id);
                }
                hide();
            });
        });
    };

    const toggle = () => {
        if (panelEl && panelEl.style.display === 'none') {
            show();
        } else if (panelEl && panelEl.style.display !== '') {
            hide();
        } else {
            show();
        }
    };

    const show = () => {
        render();
        if (panelEl) {
            panelEl.style.display = 'block';
        }
    };

    const hide = () => {
        if (panelEl) {
            panelEl.style.display = 'none';
        }
    };

    return { toggle, show, hide };
})();
