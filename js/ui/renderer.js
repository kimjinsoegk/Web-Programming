export const Renderer = {
    createElement: (tag, options = {}) => {
        const element = document.createElement(tag);
        
        if (options.className) element.className = options.className;
        if (options.id) element.id = options.id;
        if (options.innerHTML) element.innerHTML = options.innerHTML;
        if (options.textContent) element.textContent = options.textContent;
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        if (options.styles) {
            Object.assign(element.style, options.styles);
        }
        
        return element;
    },
    
    renderList: (container, items, renderItem, emptyMessage = '데이터가 없습니다.') => {
        if (!container) return;
        
        container.innerHTML = '';
        
        if (items.length === 0) {
            container.innerHTML = `<div class="empty-message">${emptyMessage}</div>`;
            return;
        }
        
        const fragment = document.createDocumentFragment();
        items.forEach(item => {
            const element = renderItem(item);
            if (element) fragment.appendChild(element);
        });
        
        container.appendChild(fragment);
    }
};
