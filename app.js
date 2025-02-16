// Initialize canvas element with fixed dimensions first
const canvasEl = document.getElementById('canvas');
const containerWidth = window.innerWidth - 40;
const containerHeight = window.innerHeight - 100;

// Set both the CSS and actual canvas dimensions
canvasEl.style.width = `${containerWidth}px`;
canvasEl.style.height = `${containerHeight}px`;
canvasEl.width = containerWidth;
canvasEl.height = containerHeight;

// Initialize Fabric canvas with default cursor settings
const canvas = new fabric.Canvas('canvas', {
    isDrawingMode: true,
    backgroundColor: 'white',
    width: containerWidth,
    height: containerHeight,
    // Use Fabric.js default cursors
    defaultCursor: 'default',
    hoverCursor: 'pointer',
    freeDrawingCursor: 'crosshair',
    moveCursor: 'move',
    rotationCursor: 'crosshair',
});

// History management
const history = {
    states: [],
    currentStateIndex: -1,
    maxStates: 50,

    saveState() {
        const state = JSON.stringify(canvas.toJSON());
        
        if (this.currentStateIndex < this.states.length - 1) {
            this.states = this.states.slice(0, this.currentStateIndex + 1);
        }

        this.states.push(state);
        this.currentStateIndex++;

        if (this.states.length > this.maxStates) {
            this.states.shift();
            this.currentStateIndex--;
        }

        this.updateButtons();
    },

    undo() {
        if (this.currentStateIndex > 0) {
            this.currentStateIndex--;
            this.loadState();
        }
    },

    redo() {
        if (this.currentStateIndex < this.states.length - 1) {
            this.currentStateIndex++;
            this.loadState();
        }
    },

    loadState() {
        if (this.currentStateIndex >= 0) {
            const state = this.states[this.currentStateIndex];
            canvas.clear();
            canvas.loadFromJSON(state, () => {
                canvas.renderAll();
                canvas.isDrawingMode = true;
                
                // Restore brush settings
                canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
                canvas.freeDrawingBrush.width = parseInt(brushSize.value, 10);
                canvas.freeDrawingBrush.color = colorPicker.value;
            });
        }
        this.updateButtons();
    },

    updateButtons() {
        const undoBtn = document.getElementById('undo');
        const redoBtn = document.getElementById('redo');
        
        undoBtn.disabled = this.currentStateIndex <= 0;
        redoBtn.disabled = this.currentStateIndex >= this.states.length - 1;
    }
};

// Initialize brush
canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
canvas.freeDrawingBrush.width = 5;
canvas.freeDrawingBrush.color = '#000000';

// Tool buttons
const pencilBtn = document.getElementById('pencil');
const brushBtn = document.getElementById('brush');
const eraserBtn = document.getElementById('eraser');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const clearBtn = document.getElementById('clear');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');

// Save state after each path is created and add to active layer
canvas.on('path:created', (event) => {
    const path = event.path;
    path.selectable = false;
    path.evented = false;
    path.hasBorders = false;
    path.hasControls = false;
    
    // Get the active layer
    const activeLayer = layers.find(layer => layer._selected) || layers[0];
    
    // Add path to the active layer
    canvas.remove(path);
    path.opacity = activeLayer.opacity;
    activeLayer.addWithUpdate(path);
    
    // Ensure correct layer order
    layers.forEach(layer => {
        canvas.bringToFront(layer);
    });
    
    canvas.requestRenderAll();
    history.saveState();
});

// Tool handlers
pencilBtn.addEventListener('click', () => {
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = parseInt(brushSize.value, 10);
    canvas.freeDrawingBrush.color = colorPicker.value;
});

brushBtn.addEventListener('click', () => {
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = parseInt(brushSize.value, 10) * 2;
    canvas.freeDrawingBrush.color = colorPicker.value;
});

eraserBtn.addEventListener('click', () => {
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = parseInt(brushSize.value, 10);
    canvas.freeDrawingBrush.color = '#ffffff';
});

// Color picker handler
colorPicker.addEventListener('input', (e) => {
    canvas.freeDrawingBrush.color = e.target.value;
});

// Brush size handler
brushSize.addEventListener('input', (e) => {
    canvas.freeDrawingBrush.width = parseInt(e.target.value, 10);
});

// Clear canvas handler
clearBtn.addEventListener('click', () => {
    const activeLayer = canvas.getActiveObject();
    if (activeLayer && activeLayer.type === 'group') {
        // Clear only the contents of the active layer
        activeLayer.getObjects().forEach(obj => {
            activeLayer.remove(obj);
        });
        activeLayer.addWithUpdate();
        canvas.requestRenderAll();
    } else {
        // If no layer is active, clear the active layer or the first layer
        const layerToClear = layers.find(layer => layer._selected) || layers[0];
        if (layerToClear) {
            layerToClear.getObjects().forEach(obj => {
                layerToClear.remove(obj);
            });
            layerToClear.addWithUpdate();
            canvas.requestRenderAll();
        }
    }
    history.saveState();
});

// Undo/Redo handlers
undoBtn.addEventListener('click', () => history.undo());
redoBtn.addEventListener('click', () => history.redo());

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
            history.redo();
        } else {
            history.undo();
        }
    } else if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        history.redo();
    }
});

// Window resize handler
window.addEventListener('resize', () => {
    const newWidth = window.innerWidth - 40;
    const newHeight = window.innerHeight - 100;
    
    canvasEl.style.width = `${newWidth}px`;
    canvasEl.style.height = `${newHeight}px`;
    canvasEl.width = newWidth;
    canvasEl.height = newHeight;
    
    canvas.setDimensions({
        width: newWidth,
        height: newHeight
    });
    
    canvas.renderAll();
});

// Save initial state
history.saveState();

// Disable selection
canvas.selection = false;

// Debug info
console.log('Canvas initialized with properties:', {
    width: canvas.width,
    height: canvas.height,
    isDrawingMode: canvas.isDrawingMode,
    brushColor: canvas.freeDrawingBrush.color,
    brushWidth: canvas.freeDrawingBrush.width
});

// Reset canvas view
canvas.setZoom(1);
canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
canvas.renderAll();

// Initialize layers array and create first layer
let layers = [];

// Function to create a new layer
function createLayer() {
    const layerNumber = layers.length + 1;
    const newLayer = new fabric.Group([], {
        left: 0,
        top: 0,
        width: canvas.width,
        height: canvas.height,
        selectable: true,
        evented: true,
        opacity: 1,
        transparentCorners: false,
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
        name: `Layer ${layerNumber}`,
        selectionColor: 'transparent',
        borderColor: 'transparent',
        hoverCursor: 'default'
    });

    // Add to beginning of layers array (top of list)
    layers.push(newLayer);
    
    // Remove and re-add all layers to ensure correct rendering
    layers.forEach(layer => {
        canvas.remove(layer);
    });
    
    // Add layers back in reverse order so first layer is on top
    for (let i = layers.length - 1; i >= 0; i--) {
        canvas.add(layers[i]);
    }
    
    canvas.renderAll();
    return newLayer;
}

// Initialize first layer after canvas setup
const firstLayer = createLayer();
setActiveLayer(firstLayer);

// Function to render layers
function renderLayers() {
    const layerList = document.getElementById('layerList');
    layerList.innerHTML = '';

    // Render layers in reverse order to show newest layers at the top
    [...layers].reverse().forEach((layer) => {
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item' + (layer._selected ? ' active' : '');
        
        const layerContent = document.createElement('div');
        layerContent.className = 'layer-content';
        
        const layerName = document.createElement('span');
        layerName.textContent = layer.name;
        layerContent.appendChild(layerName);
        
        // Add visual indicator for active layer
        if (layer._selected) {
            layerItem.style.backgroundColor = '#e3f2fd';
            layerItem.style.borderColor = '#2196f3';
        }
        
        const opacityContainer = document.createElement('div');
        opacityContainer.className = 'opacity-container';
        
        const opacityValue = document.createElement('span');
        opacityValue.textContent = `${Math.round(layer.opacity * 100)}%`;
        opacityValue.className = 'opacity-value';
        
        const opacitySlider = document.createElement('input');
        opacitySlider.type = 'range';
        opacitySlider.min = '0';
        opacitySlider.max = '100';
        opacitySlider.value = layer.opacity * 100;
        opacitySlider.className = 'opacity-slider';
        
        opacitySlider.addEventListener('input', (e) => {
            e.stopPropagation();
            const opacity = parseInt(e.target.value, 10) / 100;
            console.log(`Changing opacity of ${layer.name} to ${opacity}`);
            
            layer.set('opacity', opacity);
            layer.getObjects().forEach(obj => obj.set('opacity', opacity));
            opacityValue.textContent = `${Math.round(opacity * 100)}%`;
            canvas.requestRenderAll();
        });
        
        opacityContainer.appendChild(opacityValue);
        opacityContainer.appendChild(opacitySlider);
        layerContent.appendChild(opacityContainer);
        
        layerItem.appendChild(layerContent);
        layerItem.onclick = (e) => {
            if (!e.target.classList.contains('opacity-slider')) {
                setActiveLayer(layer);
            }
        };
        
        layerList.appendChild(layerItem);
    });
}

// Function to set active layer
function setActiveLayer(layer) {
    if (layer) {
        // Clear previous selection state
        layers.forEach(l => l._selected = false);
        
        // Set new active layer
        layer._selected = true;
        canvas.discardActiveObject();
        renderLayers();
    }
}

// Add layer button now creates additional layers
document.getElementById('addLayer').addEventListener('click', () => {
    const newLayer = createLayer();
    setActiveLayer(newLayer);
    canvas.renderAll();
});

// Delete layer
document.getElementById('deleteLayer').addEventListener('click', () => {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
        canvas.remove(activeObject);
        layers = layers.filter(layer => layer !== activeObject);
        renderLayers();
    }
});

// Move layer up (visually down in the stack)
document.getElementById('moveLayerUp').addEventListener('click', () => {
    const activeLayer = layers.find(layer => layer._selected);
    if (activeLayer) {
        const index = layers.indexOf(activeLayer);
        if (index < layers.length - 1) {
            // Update array order
            [layers[index], layers[index + 1]] = [layers[index + 1], layers[index]];
            
            // Clear canvas selection
            canvas.discardActiveObject();
            
            // Remove and re-add all layers to ensure correct rendering
            layers.forEach(layer => {
                canvas.remove(layer);
            });
            
            // Add layers back in correct order
            layers.forEach(layer => {
                canvas.add(layer);
            });
            
            // Restore active layer selection
            setActiveLayer(activeLayer);
            canvas.renderAll();
        }
    }
});

// Move layer down (visually up in the stack)
document.getElementById('moveLayerDown').addEventListener('click', () => {
    const activeLayer = layers.find(layer => layer._selected);
    if (activeLayer) {
        const index = layers.indexOf(activeLayer);
        if (index > 0) {
            // Update array order
            [layers[index], layers[index - 1]] = [layers[index - 1], layers[index]];
            
            // Clear canvas selection
            canvas.discardActiveObject();
            
            // Remove and re-add all layers to ensure correct rendering
            layers.forEach(layer => {
                canvas.remove(layer);
            });
            
            // Add layers back in correct order
            layers.forEach(layer => {
                canvas.add(layer);
            });
            
            // Restore active layer selection
            setActiveLayer(activeLayer);
            canvas.renderAll();
        }
    }
});

// Update layers on object selection
canvas.on('object:selected', renderLayers);
canvas.on('selection:cleared', renderLayers);

// Initial render
renderLayers(); 