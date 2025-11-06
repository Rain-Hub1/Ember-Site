document.addEventListener('DOMContentLoaded', () => {
    const state = {
        elements: [], selectedId: null, idCounter: 0, expandedNodes: new Set(),
        action: null, dragStart: { x: 0, y: 0 }, originalElement: null,
        isPanelOpen: window.innerWidth > 768, draggedElementId: null,
        isDesktop: window.innerWidth > 768,
    };

    const icons = {
        Frame: `<svg viewBox="0 0 24 24"><path d="M3,3H21V21H3V3M5,5V19H19V5H5Z" /></svg>`,
        TextLabel: `<svg viewBox="0 0 24 24"><path d="M18.5,4L19.66,8.34L16.5,9.61L15.95,7.5L11,12.45V18H9V12.45L4.05,7.5L3.5,9.61L0.34,8.34L1.5,4H18.5Z" /></svg>`,
        TextButton: `<svg viewBox="0 0 24 24"><path d="M20,3H4C2.9,3 2,3.9 2,5V19C2,20.1 2.9,21 4,21H20C21.1,21 22,20.1 22,19V5C22,3.9 21.1,3 20,3M12,16.5C10.62,16.5 9.5,15.38 9.5,14C9.5,12.62 10.62,11.5 12,11.5C12.53,11.5 13.04,11.7 13.45,12.05L14.5,11L15.91,12.41L14.86,13.47C15.2,13.88 15.4,14.39 15.4,14.91L17.5,17H16.5L14.2,14.7C13.53,15.87 12.73,16.5 12,16.5Z" /></svg>`,
    };

    const elementTypes = Object.keys(icons);

    const getDefaultProperties = (type, name) => {
        const base = { Name: name, Position: { X: 50, Y: 50 }, Size: { X: 200, Y: 100 }, CornerRadius: 0, BackgroundColor3: '#393939' };
        switch(type) {
            case 'TextLabel': return { ...base, Text: 'TextLabel', TextColor3: '#FFFFFF', TextSize: 18 };
            case 'TextButton': return { ...base, Size: { X: 120, Y: 50 }, Text: 'Button', TextColor3: '#FFFFFF', TextSize: 18 };
            default: return base;
        }
    };

    const findElementById = (id, elements = state.elements) => {
        for (const el of elements) {
            if (el.id === id) return el;
            if (el.children) {
                const found = findElementById(id, el.children);
                if (found) return found;
            }
        }
        return null;
    };

    const removeElementFromTree = (id, elements = state.elements) => {
        for (let i = 0; i < elements.length; i++) {
            if (elements[i].id === id) return elements.splice(i, 1)[0];
            if (elements[i].children) {
                const removed = removeElementFromTree(id, elements[i].children);
                if (removed) return removed;
            }
        }
        return null;
    };

    const render = () => {
        renderPreview();
        renderExplorer();
        renderProperties();
    };

    const renderPreview = () => {
        const area = document.getElementById('preview-area');
        area.innerHTML = '';
        const renderRecursive = (elements) => {
            elements.forEach(elData => {
                const div = document.createElement('div');
                div.className = 'roblox-element';
                div.dataset.id = elData.id;
                const p = elData.properties;
                div.style.left = `${p.Position.X}px`;
                div.style.top = `${p.Position.Y}px`;
                div.style.width = `${p.Size.X}px`;
                div.style.height = `${p.Size.Y}px`;
                div.style.backgroundColor = p.BackgroundColor3;
                div.style.borderRadius = `${p.CornerRadius}px`;
                if (p.Text) {
                    div.innerText = p.Text;
                    div.style.color = p.TextColor3;
                    div.style.fontSize = `${p.TextSize}px`;
                }
                area.appendChild(div);
            });
        };
        renderRecursive(state.elements);
        if (state.selectedId) renderSelectionBox(findElementById(state.selectedId));
    };

    const renderSelectionBox = (el) => {
        if (!el) return;
        const p = el.properties;
        const box = document.createElement('div');
        box.className = 'selection-box';
        box.style.left = `${p.Position.X}px`;
        box.style.top = `${p.Position.Y}px`;
        box.style.width = `${p.Size.X}px`;
        box.style.height = `${p.Size.Y}px`;
        
        const radiusHandle = document.createElement('div');
        radiusHandle.className = 'radius-handle';
        radiusHandle.style.left = `${Math.min(p.CornerRadius, p.Size.X / 2, p.Size.Y / 2) - 10}px`;
        radiusHandle.style.top = `${Math.min(p.CornerRadius, p.Size.X / 2, p.Size.Y / 2) - 10}px`;
        box.appendChild(radiusHandle);

        if (state.isDesktop) {
            const handles = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
            handles.forEach(h => {
                const handle = document.createElement('div');
                handle.className = `resize-handle`;
                handle.dataset.direction = h;
                box.appendChild(handle);
                setHandlePosition(handle, h, p.Size);
            });
        } else {
            const multifuncHandle = document.createElement('div');
            multifuncHandle.className = 'multifunc-handle';
            box.appendChild(multifuncHandle);
        }

        document.getElementById('preview-area').appendChild(box);
    };
    
    const setHandlePosition = (handle, dir, size) => {
        const positions = {
            n: { left: `${size.X / 2 - 5}px`, top: '-5px', cursor: 'ns-resize' },
            ne: { right: '-5px', top: '-5px', cursor: 'nesw-resize' },
            e: { right: '-5px', top: `${size.Y / 2 - 5}px`, cursor: 'ew-resize' },
            se: { right: '-5px', bottom: '-5px', cursor: 'nwse-resize' },
            s: { left: `${size.X / 2 - 5}px`, bottom: '-5px', cursor: 'ns-resize' },
            sw: { left: '-5px', bottom: '-5px', cursor: 'nesw-resize' },
            w: { left: '-5px', top: `${size.Y / 2 - 5}px`, cursor: 'ew-resize' },
            nw: { left: '-5px', top: '-5px', cursor: 'nwse-resize' }
        };
        Object.assign(handle.style, positions[dir]);
    };

    const renderExplorer = () => {
        const explorer = document.getElementById('explorer-section');
        const renderNodes = (elems, depth) => elems.map(el => `
            <div style="padding-left: ${depth * 20}px;">
                <div class="tree-node ${el.id === state.selectedId ? 'selected' : ''}" draggable="true" data-id="${el.id}">
                    <div class="tree-node-label">
                        <span class="toggle-expand" data-id="${el.id}">${el.children && el.children.length > 0 ? (state.expandedNodes.has(el.id) ? '▼' : '►') : ''}</span>
                        ${icons[el.type] || ''}
                        <span>${el.properties.Name}</span>
                    </div>
                    ${el.id === state.selectedId ? `<span class="material-icons delete-btn" data-id="${el.id}">delete</span>` : ''}
                </div>
                ${el.children && state.expandedNodes.has(el.id) ? renderNodes(el.children, depth + 1) : ''}
            </div>`).join('');
        explorer.innerHTML = renderNodes(state.elements, 0) || '<p style="text-align:center; color:var(--text-secondary);">Vazio</p>';
    };

    const renderProperties = () => {
        const container = document.getElementById('properties-section');
        const el = findElementById(state.selectedId);
        if (!el) {
            document.getElementById('element-name-header').innerText = 'Explorer';
            container.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">Selecione um elemento.</p>';
            return;
        }
        document.getElementById('element-name-header').innerText = el.properties.Name;
        const createInput = (label, key, type = 'text') => {
            const keys = key.split('.');
            let value = el.properties;
            keys.forEach(k => value = value[k]);
            return `<div class="prop-group"><label>${label}</label><input class="prop-input" type="${type}" value="${value}" data-key="${key}"></div>`;
        };
        let html = createInput('Nome', 'Name');
        html += '<details open><summary>Layout</summary><div><div class="prop-grid">' + createInput('X', 'Position.X', 'number') + createInput('Y', 'Position.Y', 'number') + '</div><div class="prop-grid">' + createInput('Width', 'Size.X', 'number') + createInput('Height', 'Size.Y', 'number') + '</div></div></details>';
        html += '<details open><summary>Aparência</summary><div>' + createInput('Cor de Fundo', 'BackgroundColor3', 'color') + createInput('Borda', 'CornerRadius', 'number') + '</div></details>';
        container.innerHTML = html;
    };

    const generateLuaCode = () => {
        let code = `local screenGui = Instance.new("ScreenGui")\nscreenGui.Parent = game.Players.LocalPlayer:WaitForChild("PlayerGui")\n\n`;
        const generateFor = (elements, parentVar) => {
            elements.forEach(el => {
                const p = el.properties;
                const varName = p.Name.replace(/\s/g, '');
                code += `local ${varName} = Instance.new("${el.type}")\n`;
                code += `${varName}.Name = "${p.Name}"\n`;
                code += `${varName}.Parent = ${parentVar}\n`;
                code += `${varName}.Position = UDim2.new(0, ${Math.round(p.Position.X)}, 0, ${Math.round(p.Position.Y)})\n`;
                code += `${varName}.Size = UDim2.new(0, ${Math.round(p.Size.X)}, 0, ${Math.round(p.Size.Y)})\n`;
                code += `${varName}.BackgroundColor3 = Color3.fromHex("${p.BackgroundColor3}")\n\n`;
                if (el.children && el.children.length > 0) {
                    generateFor(el.children, varName);
                }
            });
        };
        generateFor(state.elements, 'screenGui');
        return code;
    };

    const setupEventListeners = () => {
        document.getElementById('tool-add').addEventListener('click', () => document.getElementById('add-element-modal').classList.remove('hidden'));
        document.getElementById('close-add-modal-btn').addEventListener('click', () => document.getElementById('add-element-modal').classList.add('hidden'));
        
        const addGrid = document.getElementById('add-elements-grid');
        addGrid.innerHTML = elementTypes.map(type => `
            <button class="add-element-btn" data-type="${type}">
                ${icons[type]}
                <span>${type}</span>
            </button>`).join('');
        addGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('.add-element-btn');
            if (btn) {
                const id = ++state.idCounter;
                const type = btn.dataset.type;
                state.elements.push({ id, type, properties: getDefaultProperties(type, `${type}${id}`), children: [] });
                state.selectedId = id;
                document.getElementById('add-element-modal').classList.add('hidden');
                render();
            }
        });

        const explorer = document.getElementById('explorer-section');
        explorer.addEventListener('click', (e) => {
            const node = e.target.closest('.tree-node');
            const toggle = e.target.closest('.toggle-expand');
            const delBtn = e.target.closest('.delete-btn');

            if (delBtn) {
                const id = parseInt(delBtn.dataset.id);
                if (confirm(`Tem certeza que deseja excluir o elemento "${findElementById(id).properties.Name}"?`)) {
                    removeElementFromTree(id);
                    if (state.selectedId === id) state.selectedId = null;
                    render();
                }
            } else if (toggle) {
                const id = parseInt(toggle.dataset.id);
                state.expandedNodes.has(id) ? state.expandedNodes.delete(id) : state.expandedNodes.add(id);
                render();
            } else if (node) {
                state.selectedId = parseInt(node.dataset.id);
                render();
            }
        });

        explorer.addEventListener('dragstart', (e) => {
            const node = e.target.closest('.tree-node');
            if (node) state.draggedElementId = parseInt(node.dataset.id);
        });

        explorer.addEventListener('dragover', (e) => {
            e.preventDefault();
            document.querySelectorAll('.drag-over').forEach(n => n.classList.remove('drag-over'));
            const node = e.target.closest('.tree-node');
            if (node) node.classList.add('drag-over');
        });

        explorer.addEventListener('drop', (e) => {
            e.preventDefault();
            document.querySelectorAll('.drag-over').forEach(n => n.classList.remove('drag-over'));
            const targetNode = e.target.closest('.tree-node');
            if (targetNode && state.draggedElementId) {
                const targetId = parseInt(targetNode.dataset.id);
                if (targetId === state.draggedElementId) return;
                const draggedElement = removeElementFromTree(state.draggedElementId);
                const targetElement = findElementById(targetId);
                if (draggedElement && targetElement) {
                    targetElement.children.push(draggedElement);
                    state.expandedNodes.add(targetId);
                    render();
                }
            }
        });
        
        document.getElementById('properties-section').addEventListener('input', (e) => {
            if (e.target.classList.contains('prop-input')) {
                const keyPath = e.target.dataset.key.split('.');
                const el = findElementById(state.selectedId);
                if (!el) return;
                let prop = el.properties;
                for (let i = 0; i < keyPath.length - 1; i++) prop = prop[keyPath[i]];
                prop[keyPath[keyPath.length - 1]] = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
                render();
            }
        });

        document.getElementById('panel-handle').addEventListener('click', () => {
            state.isPanelOpen = !state.isPanelOpen;
            document.getElementById('properties-panel').classList.toggle('open', state.isPanelOpen);
        });

        const previewArea = document.getElementById('preview-area');
        const getTouchOrMouse = (e) => e.touches ? e.touches[0] : e;

        const handleDragStart = (e) => {
            const target = e.target;
            const elDiv = target.closest('.roblox-element');
            
            state.dragStart = { x: e.clientX, y: e.clientY };

            if (target.classList.contains('multifunc-handle') || target.classList.contains('resize-handle')) {
                state.action = 'resize';
                if (target.dataset.direction) state.actionDetail = target.dataset.direction;
            } else if (target.classList.contains('radius-handle')) {
                state.action = 'radius';
            } else if (elDiv) {
                state.selectedId = parseInt(elDiv.dataset.id);
                state.action = 'move';
            } else {
                state.selectedId = null;
            }
            
            if (state.selectedId) {
                state.originalElement = JSON.parse(JSON.stringify(findElementById(state.selectedId)));
            }
            render();
        };

        const handleDragMove = (e) => {
            if (!state.action || !state.selectedId) return;
            
            const dx = e.clientX - state.dragStart.x;
            const dy = e.clientY - state.dragStart.y;
            const el = findElementById(state.selectedId);
            const orig = state.originalElement.properties;

            switch (state.action) {
                case 'move':
                    el.properties.Position.X = orig.Position.X + dx;
                    el.properties.Position.Y = orig.Position.Y + dy;
                    break;
                case 'radius':
                    const newRadius = Math.max(0, orig.CornerRadius + (dx + dy) / 2);
                    el.properties.CornerRadius = Math.min(newRadius, orig.Size.X / 2, orig.Size.Y / 2);
                    break;
                case 'resize':
                    if (state.isDesktop) {
                        const dir = state.actionDetail;
                        if (dir.includes('e')) el.properties.Size.X = Math.max(20, orig.Size.X + dx);
                        if (dir.includes('w')) {
                            el.properties.Size.X = Math.max(20, orig.Size.X - dx);
                            el.properties.Position.X = orig.Position.X + dx;
                        }
                        if (dir.includes('s')) el.properties.Size.Y = Math.max(20, orig.Size.Y + dy);
                        if (dir.includes('n')) {
                            el.properties.Size.Y = Math.max(20, orig.Size.Y - dy);
                            el.properties.Position.Y = orig.Position.Y + dy;
                        }
                    } else { // Mobile multifunc-handle logic
                        const aspect = orig.Size.X / orig.Size.Y;
                        const isDiagonal = Math.abs(dx) > 10 && Math.abs(dy) > 10;
                        if (isDiagonal) {
                            const d = Math.sign(dx) * Math.sqrt(dx*dx + dy*dy);
                            el.properties.Size.X = Math.max(20, orig.Size.X + d * aspect);
                            el.properties.Size.Y = Math.max(20, orig.Size.Y + d);
                        } else if (Math.abs(dx) > Math.abs(dy)) {
                            el.properties.Size.X = Math.max(20, orig.Size.X + dx);
                        } else {
                            el.properties.Size.Y = Math.max(20, orig.Size.Y + dy);
                        }
                    }
                    break;
            }
            render();
        };

        const handleDragEnd = () => {
            state.action = null;
            state.originalElement = null;
        };

        previewArea.addEventListener('mousedown', handleDragStart);
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        previewArea.addEventListener('touchstart', handleDragStart, { passive: false });
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        document.addEventListener('touchend', handleDragEnd);
        
        document.getElementById('tool-code').addEventListener('click', () => {
            const code = generateLuaCode();
            const modal = document.createElement('div');
            modal.id = 'code-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 80vw;">
                    <h3>Código Luau Gerado</h3>
                    <pre style="background-color: #1e1e1e; padding: 16px; border-radius: 8px; max-height: 60vh; overflow: auto; color: #9cdcfe;">${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
                    <div style="display: flex; gap: 8px; margin-top: 16px;">
                        <button id="copy-code-btn" class="modal-button primary">Copiar Código</button>
                        <button id="close-code-modal" class="modal-button">Fechar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.classList.remove('hidden'); // Trigger animation

            modal.querySelector('#close-code-modal').addEventListener('click', () => modal.remove());
            modal.querySelector('#copy-code-btn').addEventListener('click', (e) => {
                navigator.clipboard.writeText(code).then(() => {
                    e.target.textContent = 'Copiado!';
                    setTimeout(() => { e.target.textContent = 'Copiar Código'; }, 2000);
                });
            });
        });

        window.addEventListener('resize', () => {
            state.isDesktop = window.innerWidth > 768;
            state.isPanelOpen = state.isDesktop;
            document.getElementById('properties-panel').classList.toggle('open', state.isPanelOpen);
            render();
        });
    };

    render();
    setupEventListeners();
    document.getElementById('properties-panel').classList.toggle('open', state.isPanelOpen);
});
