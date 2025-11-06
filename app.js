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
            else el.properties[key][subkey]
