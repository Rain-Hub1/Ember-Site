document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO GLOBAL E DEFINIÇÕES ---
    const state = {
        elements: [],
        selectedId: null,
        expandedNodes: new Set(),
        idCounter: 0,
        view: 'preview',
        isDragging: false,
        isResizing: false,
        dragOffset: { x: 0, y: 0 },
        isPanelCollapsed: false,
        activePanelTab: 'explorer',
        draggedElementId: null,
        editingNameId: null,
    };

    const elementTypes = [
        { name: 'Frame', color: '#3b82f6' }, { name: 'TextLabel', color: '#8b5cf6' },
        { name: 'TextButton', color: '#ec4899' }, { name: 'ImageLabel', color: '#f59e0b' },
        { name: 'UICorner', color: '#fde047' }, { name: 'UIGradient', color: '#10b981' },
        { name: 'TextBox', color: '#6366f1' }, { name: 'ScrollingFrame', color: '#ef4444' },
        { name: 'UIListLayout', color: '#a855f7' },
    ];

    // --- FUNÇÕES DE MANIPULAÇÃO DE DADOS ---
    const getDefaultProperties = (type, name) => {
        const base = { Name: name, Position: { Scale: { X: 0, Y: 0 }, Offset: { X: 50, Y: 50 } }, Size: { Scale: { X: 0, Y: 0 }, Offset: { X: 200, Y: 100 } }, AnchorPoint: { X: 0, Y: 0 }, Rotation: 0, BackgroundColor3: '#808080', BackgroundTransparency: 0, ZIndex: 1, Visible: true };
        switch(type) {
            case 'TextLabel': return { ...base, Text: 'TextLabel', TextColor3: '#FFFFFF', TextSize: 18, Font: 'SourceSans', TextWrapped: true, TextXAlignment: 'Center', TextYAlignment: 'Center' };
            case 'TextButton': return { ...base, Size: { Scale: { X: 0, Y: 0 }, Offset: { X: 120, Y: 50 } }, Text: 'Button', TextColor3: '#FFFFFF', TextSize: 18, Font: 'SourceSans' };
            case 'TextBox': return { ...base, Size: { Scale: { X: 0, Y: 0 }, Offset: { X: 250, Y: 40 } }, BackgroundColor3: '#FFFFFF', Text: '', PlaceholderText: 'Digite aqui...', TextColor3: '#000000', TextSize: 14, ClearTextOnFocus: false };
            case 'ImageLabel': return { ...base, Image: '', ImageColor3: '#FFFFFF', ImageTransparency: 0, ScaleType: 'Stretch' };
            case 'UICorner': return { ...base, Name: 'UICorner', Size: { Scale: { X: 0, Y: 0 }, Offset: { X: 0, Y: 0 } }, CornerRadius: { Scale: 0, Offset: 8 } };
            case 'UIGradient': return { ...base, Name: 'UIGradient', Size: { Scale: { X: 0, Y: 0 }, Offset: { X: 0, Y: 0 } }, Color: [{Time: 0, Value: '#3B82F6'}, {Time: 1, Value: '#8B5CF6'}], Rotation: 90 };
            default: return base;
        }
    };

    const addElement = (type) => {
        const id = ++state.idCounter;
        const newElement = { id, type, properties: getDefaultProperties(type, `${type}${id}`), children: [], parentId: null };
        state.elements.push(newElement);
        state.selectedId = id;
        state.activePanelTab = 'props';
        render();
    };

    const updateProperty = (key, value, subkey = null, subsubkey = null) => {
        const el = findElementById(state.elements, state.selectedId);
        if (!el) return;
        const numeric = ['Rotation', 'BackgroundTransparency', 'ZIndex', 'TextSize', 'ImageTransparency'];
        const bool = ['Visible', 'TextWrapped', 'ClearTextOnFocus'];
        if (subkey) {
            if (subsubkey) el.properties[key][subkey][subsubkey] = Number(value);
            else el.properties[key][subkey] = Number(value);
        } else {
            if (numeric.includes(key)) value = Number(value);
            if (bool.includes(key)) value = Boolean(value);
            el.properties[key] = value;
        }
        render();
    };

    const findElementById = (elements, id) => {
        for (const el of elements) {
            if (el.id === id) return el;
            const found = findElementById(el.children, id);
            if (found) return found;
        }
        return null;
    };
    
    const removeElementFromTree = (elements, id) => {
        for (let i = elements.length - 1; i >= 0; i--) {
            if (elements[i].id === id) {
                return elements.splice(i, 1)[0];
            }
            if (elements[i].children) {
                const removed = removeElementFromTree(elements[i].children, id);
                if (removed) return removed;
            }
        }
        return null;
    };

    const render = () => {
        renderPanel();
        if (state.view === 'preview') renderPreview(); else renderCode();
    };

    const renderPanel = () => {
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.panel-tab[data-tab="${state.activePanelTab}"]`).classList.add('active');
        document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
        document.getElementById(`section-${state.activePanelTab}`).classList.add('active');
        renderExplorer();
        renderAddSection();
        renderProperties();
    };

    const renderExplorer = () => {
        const renderNodes = (elems, depth) => elems.map(el => {
            const isEditing = el.id === state.editingNameId;
            const label = isEditing 
                ? `<input class="rename-input" type="text" value="${el.properties.Name}" data-id="${el.id}" autofocus>`
                : `<span class="node-name" data-id="${el.id}">${el.properties.Name}</span>`;

            return `
            <div style="padding-left: ${depth * 20}px;">
                <div id="node-${el.id}" class="tree-node ${el.id === state.selectedId ? 'selected' : ''}" draggable="true" data-id="${el.id}">
                    <div class="tree-node-label" data-id="${el.id}">
                        <span class="toggle-expand" data-id="${el.id}">${el.children.length > 0 ? (state.expandedNodes.has(el.id) ? '▼' : '►') : '•'}</span>
                        ${label}
                    </div>
                    <div class="tree-node-actions"><button class="delete-btn" data-id="${el.id}">🗑️</button></div>
                </div>
                ${state.expandedNodes.has(el.id) ? renderNodes(el.children, depth + 1) : ''}
            </div>`;
        }).join('');
        document.getElementById('section-explorer').innerHTML = state.elements.length > 0 ? renderNodes(state.elements, 0) : '<p style="text-align: center; color: var(--text-secondary);">Nenhum elemento.</p>';
    };

    const renderAddSection = () => {
        document.getElementById('section-add').innerHTML = `<div class="add-elements-grid">${elementTypes.map(t => `<button class="add-element-btn" style="background-color: ${t.color}40; border-color: ${t.color};" data-type="${t.name}">${t.name}</button>`).join('')}</div>`;
    };

    const renderProperties = () => {
        const container = document.getElementById('section-props');
        const el = findElementById(state.elements, state.selectedId);
        if (!el) { container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Selecione um elemento.</p>'; return; }

        const createInput = (label, key, type = 'text', subkey, subsubkey) => {
            let value = subkey ? (subsubkey ? el.properties[key][subkey][subsubkey] : el.properties[key][subkey]) : el.properties[key];
            return `<div class="prop-group"><label>${label}</label><input class="prop-input" type="${type}" value="${value}" data-key="${key}" data-subkey="${subkey||''}" data-subsubkey="${subsubkey||''}"></div>`;
        };
        const createSelect = (label, key, options) => {
            let value = el.properties[key];
            let optionsHTML = options.map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('');
            return `<div class="prop-group"><label>${label}</label><select class="prop-input" data-key="${key}">${optionsHTML}</select></div>`;
        };
        
        let html = `<h3>${el.properties.Name}</h3><br>`;
        html += '<details open><summary>Layout</summary>';
        html += '<div class="prop-grid">' + createInput('X Offset', 'Position', 'number', 'Offset', 'X') + createInput('Y Offset', 'Position', 'number', 'Offset', 'Y') + '</div>';
        html += '<div class="prop-grid">' + createInput('X Scale', 'Position', 'number', 'Scale', 'X') + createInput('Y Scale', 'Position', 'number', 'Scale', 'Y') + '</div>';
        html += '<div class="prop-grid">' + createInput('Width Offset', 'Size', 'number', 'Offset', 'X') + createInput('Height Offset', 'Size', 'number', 'Offset', 'Y') + '</div>';
        html += '<div class="prop-grid">' + createInput('Width Scale', 'Size', 'number', 'Scale', 'X') + createInput('Height Scale', 'Size', 'number', 'Scale', 'Y') + '</div>';
        html += '<div class="prop-grid">' + createInput('Anchor X', 'AnchorPoint', 'number', 'X') + createInput('Anchor Y', 'AnchorPoint', 'number', 'Y') + '</div></details>';
        
        html += '<details open><summary>Aparência</summary>';
        html += createInput('Rotation', 'Rotation', 'number');
        html += createInput('Z-Index', 'ZIndex', 'number');
        html += createInput('Cor de Fundo', 'BackgroundColor3', 'color');
        html += createInput('Transparência', 'BackgroundTransparency', 'range', null, null, {min:0, max:1, step:0.01});
        html += '</details>';

        if (el.properties.Text !== undefined) {
            html += '<details open><summary>Texto</summary>';
            html += createInput('Texto', 'Text');
            html += createInput('Cor do Texto', 'TextColor3', 'color');
            html += createInput('Tamanho', 'TextSize', 'number');
            html += createSelect('Fonte', 'Font', ['SourceSans', 'Legacy', 'Arial', 'Bodoni', 'Garamond']);
            html += createSelect('Alinhamento X', 'TextXAlignment', ['Left', 'Center', 'Right']);
            html += '</details>';
        }
        container.innerHTML = html;
    };

    const renderPreview = () => {
        const area = document.getElementById('preview-area');
        area.innerHTML = '';
        const renderEl = (elData) => {
            const div = document.createElement('div');
            div.className = 'roblox-element';
            div.dataset.id = elData.id;
            if (elData.id === state.selectedId) div.classList.add('selected');
            const p = elData.properties;
            div.style.left = `calc(${p.Position.Scale.X * 100}% + ${p.Position.Offset.X}px)`;
            div.style.top = `calc(${p.Position.Scale.Y * 100}% + ${p.Position.Offset.Y}px)`;
            div.style.width = `calc(${p.Size.Scale.X * 100}% + ${p.Size.Offset.X}px)`;
            div.style.height = `calc(${p.Size.Scale.Y * 100}% + ${p.Size.Offset.Y}px)`;
            div.style.transform = `translate(-${p.AnchorPoint.X * 100}%, -${p.AnchorPoint.Y * 100}%) rotate(${p.Rotation}deg)`;
            div.style.backgroundColor = p.BackgroundColor3;
            div.style.opacity = 1 - p.BackgroundTransparency;
            div.style.zIndex = p.ZIndex;
            div.style.visibility = p.Visible ? 'visible' : 'hidden';
            if (p.Text !== undefined) {
                const span = document.createElement('span');
                span.innerText = p.Text;
                span.style.color = p.TextColor3;
                span.style.fontSize = p.TextSize + 'px';
                div.appendChild(span);
            }
            if (elData.id === state.selectedId) {
                const resizer = document.createElement('div');
                resizer.className = 'resizer br';
                div.appendChild(resizer);
            }
            elData.children.forEach(child => div.appendChild(renderEl(child)));
            return div;
        };
        state.elements.forEach(el => area.appendChild(renderEl(el)));
    };

    const renderCode = () => { document.getElementById('lua-code').textContent = generateFullCode(); };

    const onMouseMove = (e) => {
        if (state.isDragging) {
            const el = findElementById(state.elements, state.selectedId);
            el.properties.Position.Offset.X = e.clientX - state.dragOffset.x;
            el.properties.Position.Offset.Y = e.clientY - state.dragOffset.y;
            render();
        } else if (state.isResizing) {
            const el = findElementById(state.elements, state.selectedId);
            el.properties.Size.Offset.X = e.clientX - state.dragOffset.x;
            el.properties.Size.Offset.Y = e.clientY - state.dragOffset.y;
            render();
        }
    };
    const onMouseUp = () => { state.isDragging = false; state.isResizing = false; };

    const generateFullCode = () => {
        let code = `-- Gerado pelo Pro UI Creator\n\nlocal screenGui = Instance.new("ScreenGui")\nscreenGui.Parent = game.Players.LocalPlayer:WaitForChild("PlayerGui")\nscreenGui.ResetOnSpawn = false\n\n`;
        code += generateCodeForElements(state.elements, 'screenGui');
        return code;
    };
    const generateCodeForElements = (elements, parentVar) => {
        let code = '';
        elements.forEach(el => {
            const varName = el.properties.Name.replace(/\s/g, '');
            const p = el.properties;
            code += `local ${varName} = Instance.new("${el.type}")\n`;
            code += `${varName}.Name = "${p.Name}"\n`;
            code += `${varName}.Parent = ${parentVar}\n`;
            code += `${varName}.Position = UDim2.new(${p.Position.Scale.X}, ${p.Position.Offset.X}, ${p.Position.Scale.Y}, ${p.Position.Offset.Y})\n`;
            code += `${varName}.Size = UDim2.new(${p.Size.Scale.X}, ${p.Size.Offset.X}, ${p.Size.Scale.Y}, ${p.Size.Offset.Y})\n`;
            code += `${varName}.AnchorPoint = Vector2.new(${p.AnchorPoint.X}, ${p.AnchorPoint.Y})\n`;
            const rgb = hexToRgb(p.BackgroundColor3);
            code += `${varName}.BackgroundColor3 = Color3.fromRGB(${rgb.r}, ${rgb.g}, ${rgb.b})\n`;
            if (p.Text !== undefined) {
                const textRgb = hexToRgb(p.TextColor3);
                code += `${varName}.Text = "${p.Text}"\n`;
                code += `${varName}.TextColor3 = Color3.fromRGB(${textRgb.r}, ${textRgb.g}, ${textRgb.b})\n`;
                code += `${varName}.TextSize = ${p.TextSize}\n`;
                code += `${varName}.Font = Enum.Font.${p.Font}\n`;
            }
            code += '\n';
            if (el.children.length > 0) code += generateCodeForElements(el.children, varName);
        });
        return code;
    };
    const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    };

    document.getElementById('view-toggle').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            state.view = e.target.id === 'btn-preview' ? 'preview' : 'code';
            document.getElementById('preview-area').style.display = state.view === 'preview' ? 'block' : 'none';
            document.getElementById('code-area').style.display = state.view === 'code' ? 'block' : 'none';
            document.getElementById('btn-preview').classList.toggle('active', state.view === 'preview');
            document.getElementById('btn-code').classList.toggle('active', state.view === 'code');
            render();
        }
    });

    document.getElementById('panel-tabs').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            state.activePanelTab = e.target.dataset.tab;
            renderPanel();
        }
    });

    document.getElementById('panel-toggle-btn').addEventListener('click', () => {
        state.isPanelCollapsed = !state.isPanelCollapsed;
        document.getElementById('floating-panel').classList.toggle('collapsed', state.isPanelCollapsed);
    });

    document.getElementById('section-add').addEventListener('click', (e) => {
        if (e.target.classList.contains('add-element-btn')) {
            addElement(e.target.dataset.type);
        }
    });

    document.getElementById('section-props').addEventListener('input', (e) => {
        if (e.target.classList.contains('prop-input')) {
            const { key, subkey, subsubkey } = e.target.dataset;
            updateProperty(key, e.target.value, subkey || null, subsubkey || null);
        }
    });

    const explorer = document.getElementById('section-explorer');
    explorer.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('delete-btn')) {
            const id = parseInt(target.dataset.id);
            if (confirm('Tem certeza que deseja excluir este elemento e todos os seus filhos?')) {
                removeElementFromTree(state.elements, id);
                if (state.selectedId === id) state.selectedId = null;
                render();
            }
        } else if (target.classList.contains('toggle-expand')) {
            const id = parseInt(target.dataset.id);
            state.expandedNodes.has(id) ? state.expandedNodes.delete(id) : state.expandedNodes.add(id);
            renderExplorer();
        } else {
            const node = target.closest('.tree-node-label');
            if (node) {
                state.selectedId = parseInt(node.dataset.id);
                render();
            }
        }
    });

    explorer.addEventListener('dblclick', (e) => {
        if (e.target.classList.contains('node-name')) {
            state.editingNameId = parseInt(e.target.dataset.id);
            renderExplorer();
        }
    });

    explorer.addEventListener('focusout', (e) => {
        if (e.target.classList.contains('rename-input')) {
            const el = findElementById(state.elements, state.editingNameId);
            if (el && e.target.value) el.properties.Name = e.target.value;
            state.editingNameId = null;
            renderExplorer();
        }
    });
    
    explorer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('rename-input')) {
            e.target.blur();
        }
    });

    explorer.addEventListener('dragstart', (e) => {
        const node = e.target.closest('.tree-node');
        if (node) {
            state.draggedElementId = parseInt(node.dataset.id);
            e.dataTransfer.effectAllowed = 'move';
        }
    });

    explorer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetNode = e.target.closest('.tree-node');
        document.querySelectorAll('.dragging-over').forEach(n => n.classList.remove('dragging-over'));
        if (targetNode) {
            targetNode.classList.add('dragging-over');
        }
    });

    explorer.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetNode = e.target.closest('.tree-node');
        if (targetNode) {
            targetNode.classList.remove('dragging-over');
            const targetId = parseInt(targetNode.dataset.id);
            const draggedId = state.draggedElementId;
            if (draggedId === targetId) return;

            const draggedElement = removeElementFromTree(state.elements, draggedId);
            const targetElement = findElementById(state.elements, targetId);

            if (targetElement && draggedElement) {
                draggedElement.parentId = targetId;
                targetElement.children.push(draggedElement);
                state.expandedNodes.add(targetId);
                render();
            }
        }
    });

    document.getElementById('preview-area').addEventListener('mousedown', (e) => {
        const elTarget = e.target.closest('.roblox-element');
        if (elTarget) {
            const id = parseInt(elTarget.dataset.id);
            const elData = findElementById(state.elements, id);
            if (e.target.classList.contains('resizer')) {
                state.isResizing = true;
                state.dragOffset.x = e.clientX - elData.properties.Size.Offset.X;
                state.dragOffset.y = e.clientY - elData.properties.Size.Offset.Y;
            } else {
                state.isDragging = true;
                state.dragOffset.x = e.clientX - elData.properties.Position.Offset.X;
                state.dragOffset.y = e.clientY - elData.properties.Position.Offset.Y;
            }
            state.selectedId = id;
            render();
        }
    });

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    render();
});
