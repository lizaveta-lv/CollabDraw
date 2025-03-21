// Define standard canvas dimensions
const STANDARD_WIDTH = 1920;
const STANDARD_HEIGHT = 1080;

// Get tool buttons first
const pencilBtn = document.getElementById('pencil');
const brushBtn = document.getElementById('brush');
const eraserBtn = document.getElementById('eraser');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const clearBtn = document.getElementById('clear');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');

// Initialize canvas element with fixed dimensions
const canvasEl = document.getElementById('canvas');
const containerWidth = window.innerWidth - 40;
const containerHeight = window.innerHeight - 100;

// Set both the CSS and actual canvas dimensions
canvasEl.style.width = `${containerWidth}px`;
canvasEl.style.height = `${containerHeight}px`;
canvasEl.width = STANDARD_WIDTH;
canvasEl.height = STANDARD_HEIGHT;

// Initialize Fabric canvas
const canvas = new fabric.Canvas('canvas', {
    isDrawingMode: false,
    backgroundColor: '#ffffff',
    width: STANDARD_WIDTH,
    height: STANDARD_HEIGHT,
    selection: false,
    defaultCursor: 'default',
    hoverCursor: 'default',
    moveCursor: 'default',
    freeDrawingCursor: 'crosshair'
});

// Initialize Socket.io connection
const socket = io();

// Add UI elements for room management
const createRoomBtn = document.getElementById('createRoom');
const joinRoomBtn = document.getElementById('joinRoom');
const roomCodeInput = document.getElementById('roomCode');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');

// Get modal elements
const roomModal = document.getElementById('roomModal');
const closeModal = document.getElementById('closeModal');
const confirmCreateRoom = document.getElementById('confirmCreateRoom');
const canvasWidthInput = document.getElementById('canvasWidth');
const canvasHeightInput = document.getElementById('canvasHeight');

// Add this after other modal element declarations
const canvasColorInput = document.createElement('input');
canvasColorInput.type = 'color';
canvasColorInput.id = 'canvasColor';
canvasColorInput.value = '#ffffff'; // Default white

// Add a variable to store current canvas color
let currentCanvasColor = '#ffffff';

// Add this function near the top of the file after the canvas initialization
function createEraserCursor(size) {
    const scale = 2; // For better resolution
    const canvas = document.createElement('canvas');
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext('2d');
    
    // Make the cursor slightly larger than the eraser size
    const cursorSize = size * scale;
    
    // Draw eraser icon
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2 * scale;
    
    // Draw outer rectangle
    ctx.strokeRect(2 * scale, 2 * scale, cursorSize - 4 * scale, cursorSize - 4 * scale);
    
    // Draw X inside
    ctx.beginPath();
    ctx.moveTo(4 * scale, 4 * scale);
    ctx.lineTo(cursorSize - 4 * scale, cursorSize - 4 * scale);
    ctx.moveTo(cursorSize - 4 * scale, 4 * scale);
    ctx.lineTo(4 * scale, cursorSize - 4 * scale);
    ctx.stroke();
    
    return `url(${canvas.toDataURL()}) ${size/2} ${size/2}, crosshair`;
}

// Initialize brush
function initBrush() {
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = parseInt(brushSize.value, 10);
    canvas.freeDrawingBrush.color = colorPicker.value;
}

// Initialize eraser
function initEraser() {
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    const eraserSize = parseInt(brushSize.value, 10);
    canvas.freeDrawingBrush.width = eraserSize;
    canvas.freeDrawingBrush.color = 'rgba(0,0,0,0)';
    
    // Set custom cursor
    canvas.freeDrawingCursor = createEraserCursor(eraserSize * 2);
    
    // Remove existing path:created handler
    canvas.off('path:created');
    
    // Add eraser-specific path:created handler
    canvas.on('path:created', function(event) {
        const eraserPath = event.path;
        canvas.remove(eraserPath);
        
        const activeLayer = layers.find(layer => layer._selected) || layers[0];
        const objectsToRemove = [];
        
        // Get eraser path bounds
        const eraserBounds = eraserPath.getBoundingRect();
        
        // Check each object in the active layer
        activeLayer.getObjects().forEach(obj => {
            const objBounds = obj.getBoundingRect();
            
            // Check if the eraser path intersects with the object
            if (fabric.Intersection.intersectPolygonPolygon(
                eraserPath.getCoords(),
                obj.getCoords()
            ).status === 'Intersection') {
                objectsToRemove.push(obj);
            }
        });
        
        // Remove intersecting objects
        if (objectsToRemove.length > 0) {
            objectsToRemove.forEach(obj => {
                activeLayer.remove(obj);
            });
            
            // Emit the eraser action
            const roomCode = roomCodeDisplay.textContent.split(': ')[1];
            if (roomCode) {
                socket.emit('erase', roomCode, {
                    layer: layers.indexOf(activeLayer),
                    erasedObjects: objectsToRemove.map(obj => obj.toObject())
                });
            }
            
            activeLayer.addWithUpdate();
            canvas.requestRenderAll();
            history.saveState();
        }
    });
}

// Initialize brush with default settings
initBrush();

// Tool button handlers
pencilBtn.addEventListener('click', () => {
    setActiveButton(pencilBtn);
    canvas.freeDrawingCursor = 'crosshair';
    // Remove eraser handler
    canvas.off('path:created');
    
    // Add back the original drawing handler
    canvas.on('path:created', function(event) {
        const path = event.path;
        path.selectable = false;
        path.evented = false;
        
        const activeLayer = layers.find(layer => layer._selected) || layers[0];
        canvas.remove(path);
        
        const newPath = new fabric.Path(path.path, {
            stroke: path.stroke,
            strokeWidth: path.strokeWidth,
            strokeLineCap: path.strokeLineCap,
            strokeLineJoin: path.strokeLineJoin,
            strokeDashArray: path.strokeDashArray,
            fill: null,
            opacity: activeLayer.opacity,
            selectable: false,
            evented: false
        });
        
        activeLayer.addWithUpdate(newPath);
        
        const roomCode = roomCodeDisplay.textContent.split(': ')[1];
        socket.emit('draw', roomCode, {
            ...newPath.toObject(),
            layer: layers.indexOf(activeLayer)
        });
        
        canvas.requestRenderAll();
        history.saveState();
    });
    
    initBrush();
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush.width = parseInt(brushSize.value, 10);
    canvas.freeDrawingBrush.color = colorPicker.value;
    canvas.requestRenderAll();
});

brushBtn.addEventListener('click', () => {
    setActiveButton(brushBtn);
    canvas.freeDrawingCursor = 'crosshair';
    // Remove eraser handler
    canvas.off('path:created');
    
    // Add back the original drawing handler
    canvas.on('path:created', function(event) {
        const path = event.path;
        path.selectable = false;
        path.evented = false;
        
        const activeLayer = layers.find(layer => layer._selected) || layers[0];
        canvas.remove(path);
        
        const newPath = new fabric.Path(path.path, {
            stroke: path.stroke,
            strokeWidth: path.strokeWidth,
            strokeLineCap: path.strokeLineCap,
            strokeLineJoin: path.strokeLineJoin,
            strokeDashArray: path.strokeDashArray,
            fill: null,
            opacity: activeLayer.opacity,
            selectable: false,
            evented: false
        });
        
        activeLayer.addWithUpdate(newPath);
        
        const roomCode = roomCodeDisplay.textContent.split(': ')[1];
        socket.emit('draw', roomCode, {
            ...newPath.toObject(),
            layer: layers.indexOf(activeLayer)
        });
        
        canvas.requestRenderAll();
        history.saveState();
    });
    
    initBrush();
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush.width = parseInt(brushSize.value, 10) * 2;
    canvas.freeDrawingBrush.color = colorPicker.value;
    canvas.requestRenderAll();
});

eraserBtn.addEventListener('click', () => {
    setActiveButton(eraserBtn);
    initEraser();
});

// Update brush size when input changes
brushSize.addEventListener('input', () => {
    if (canvas.freeDrawingBrush) {
        const size = parseInt(brushSize.value, 10);
        canvas.freeDrawingBrush.width = size;
        
        // Update cursor if eraser is active
        if (eraserBtn.classList.contains('active')) {
            canvas.freeDrawingCursor = createEraserCursor(size * 2);
        }
        
        canvas.requestRenderAll();
    }
});

// Color picker handler
colorPicker.addEventListener('input', (e) => {
    if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = e.target.value;
        canvas.requestRenderAll();
    }
});

// Initialize layers array
let layers = [];

// Function to create a new layer
function createLayer(width = canvas.width, height = canvas.height) {
    const layerNumber = layers.length + 1;
    const newLayer = new fabric.Group([], {
        left: 0,
        top: 0,
        width: width,
        height: height,
        selectable: false,
        evented: false,
        opacity: 1,
        name: `Layer ${layerNumber}`
    });

    layers.push(newLayer);
    canvas.add(newLayer);
    canvas.renderAll();
    return newLayer;
}

// Add zoom control
const zoomSlider = document.createElement('input');
zoomSlider.type = 'range';
zoomSlider.min = '0.1';
zoomSlider.max = '3';
zoomSlider.step = '0.1';
zoomSlider.value = '1';
zoomSlider.className = 'zoom-slider';
zoomSlider.title = 'Zoom';
document.querySelector('.toolbar').appendChild(zoomSlider);

let currentZoom = 1;

// Scale canvas to fit window while maintaining aspect ratio
function scaleCanvas(forceZoom = null) {
    const zoom = forceZoom !== null ? forceZoom : currentZoom;
    currentZoom = zoom;
    zoomSlider.value = zoom;
    
    // Calculate the base scale to fit the canvas in the viewport
    const baseScale = Math.min(
        containerWidth / canvas.width,
        containerHeight / canvas.height
    );
    
    // Apply zoom to the base scale
    const finalScale = baseScale * zoom;
    
    // Update canvas display dimensions while maintaining aspect ratio
    const displayWidth = canvas.width * baseScale;
    const displayHeight = canvas.height * baseScale;
    
    // Set the canvas element size to match the display dimensions
    canvasEl.style.width = `${displayWidth}px`;
    canvasEl.style.height = `${displayHeight}px`;
    
    // Keep the internal dimensions at the actual size
    canvas.setWidth(canvas.width);
    canvas.setHeight(canvas.height);
    
    // Center the canvas
    const left = (containerWidth - displayWidth) / 2;
    const top = (containerHeight - displayHeight) / 2;
    
    // Set the viewport transform
    canvas.setViewportTransform([finalScale, 0, 0, finalScale, left, top]);
    
    if (canvas.freeDrawingBrush) {
        // Adjust brush size based on zoom
        const baseWidth = parseInt(brushSize.value, 10);
        canvas.freeDrawingBrush.width = baseWidth / finalScale;
    }
    
    canvas.requestRenderAll();
}

// Add zoom slider handler
zoomSlider.addEventListener('input', (e) => {
    currentZoom = parseFloat(e.target.value);
    scaleCanvas();
});

// Open modal for creating a room
createRoomBtn.addEventListener('click', () => {
    roomModal.style.display = 'block';
});

// Close modal
closeModal.addEventListener('click', () => {
    roomModal.style.display = 'none';
});

// Update room creation handler
confirmCreateRoom.addEventListener('click', () => {
    const width = parseInt(canvasWidthInput.value);
    const height = parseInt(canvasHeightInput.value);
    const canvasColor = document.getElementById('canvasColor').value;
    
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        alert('Please enter valid dimensions for the canvas.');
        return;
    }
    
    socket.emit('createRoom', { width, height, canvasColor }, (roomCode) => {
        if (roomCode) {
            roomCodeDisplay.textContent = `Room Code: ${roomCode}`;
            copyCodeBtn.style.display = 'block';
            alert(`Room created! Share this code: ${roomCode}`);
            roomModal.style.display = 'none';
            
            // Update canvas dimensions and color
            canvas.setWidth(width);
            canvas.setHeight(height);
            canvasEl.width = width;
            canvasEl.height = height;
            
            // Set the background color and store it
            canvas.backgroundColor = canvasColor;
            currentCanvasColor = canvasColor;
            
            // Clear existing layers
            layers.forEach(layer => {
                canvas.remove(layer);
            });
            layers = [];
            
            // Create new first layer with correct dimensions
            const firstLayer = createLayer(width, height);
            setActiveLayer(firstLayer);
            
            // Calculate initial zoom to fit viewport
            const widthRatio = containerWidth / width;
            const heightRatio = containerHeight / height;
            currentZoom = Math.min(widthRatio, heightRatio, 1);
            zoomSlider.value = currentZoom;
            
            // Scale canvas and render
            scaleCanvas(currentZoom);
            canvas.requestRenderAll();
        } else {
            alert('Error creating room. Please try again.');
        }
    });
});

// Close modal when clicking outside of it
window.addEventListener('click', (event) => {
    if (event.target == roomModal) {
        roomModal.style.display = 'none';
    }
});

// Handle drawing events with coordinate transformation
canvas.on('path:created', function(event) {
    const path = event.path;
    path.selectable = false;
    path.evented = false;
    
    const activeLayer = layers.find(layer => layer._selected) || layers[0];
    canvas.remove(path);
    
    // Get the current viewport transform
    const vpt = canvas.viewportTransform;
    const scale = vpt[0];
    
    // Create a new path with the original coordinates
    const newPath = new fabric.Path(path.path, {
        stroke: path.stroke,
        strokeWidth: path.strokeWidth,
        strokeLineCap: path.strokeLineCap,
        strokeLineJoin: path.strokeLineJoin,
        strokeDashArray: path.strokeDashArray,
        fill: null,
        opacity: activeLayer.opacity,
        selectable: false,
        evented: false
    });
    
    activeLayer.addWithUpdate(newPath);
    
    // Emit the path data without any transformations
    const roomCode = roomCodeDisplay.textContent.split(': ')[1];
    socket.emit('draw', roomCode, {
        ...newPath.toObject(),
        layer: layers.indexOf(activeLayer)
    });
    
    canvas.requestRenderAll();
    history.saveState();
});

// Handle incoming draw events
socket.on('draw', (data) => {
    fabric.util.enlivenObjects([data], (objects) => {
        const path = objects[0];
        
        // Create a new path with the original properties
        const newPath = new fabric.Path(path.path, {
            stroke: path.stroke,
            strokeWidth: path.strokeWidth,
            strokeLineCap: path.strokeLineCap,
            strokeLineJoin: path.strokeLineJoin,
            strokeDashArray: path.strokeDashArray,
            fill: null,
            opacity: path.opacity,
            selectable: false,
            evented: false,
            hasBorders: false,
            hasControls: false
        });
        
        const targetLayer = layers[data.layer] || layers[0];
        targetLayer.addWithUpdate(newPath);
        
        canvas.requestRenderAll();
    });
});

// Handle canvas state from server
socket.on('canvasState', (state) => {
    if (!Array.isArray(state)) return;
    
    // Clear all layers
    layers.forEach(layer => {
        layer.getObjects().forEach(obj => {
            layer.remove(obj);
        });
    });
    
    // Add paths to appropriate layers
    state.forEach(pathData => {
        fabric.util.enlivenObjects([pathData], (objects) => {
            const path = objects[0];
            path.selectable = false;
            path.evented = false;
            path.hasBorders = false;
            path.hasControls = false;
            
            const targetLayer = layers[pathData.layer] || layers[0];
            path.opacity = targetLayer.opacity;
            targetLayer.addWithUpdate(path);
        });
    });
    
    canvas.requestRenderAll();
});

// Create first layer and set it as active
const firstLayer = createLayer();
setActiveLayer(firstLayer);

// Call scale canvas initially
scaleCanvas();

// Update the window resize handler
window.addEventListener('resize', () => {
    containerWidth = window.innerWidth - 40;
    containerHeight = window.innerHeight - 100;
    scaleCanvas();
});

// Layer management
function setActiveLayer(layer) {
    layers.forEach(l => l._selected = false);
    layer._selected = true;
    renderLayers();
}

function renderLayers() {
    const layerList = document.getElementById('layerList');
    layerList.innerHTML = '';

    [...layers].reverse().forEach((layer) => {
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item' + (layer._selected ? ' active' : '');
        
        const layerContent = document.createElement('div');
        layerContent.className = 'layer-content';
        
        const layerName = document.createElement('span');
        layerName.textContent = layer.name;
        layerContent.appendChild(layerName);
        
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

// Layer control buttons
document.getElementById('addLayer').addEventListener('click', () => {
    const newLayer = createLayer();
    setActiveLayer(newLayer);
    canvas.renderAll();
});

document.getElementById('deleteLayer').addEventListener('click', () => {
    if (layers.length <= 1) return;
    
    const activeLayer = layers.find(layer => layer._selected);
    if (activeLayer) {
        canvas.remove(activeLayer);
        layers = layers.filter(layer => layer !== activeLayer);
        setActiveLayer(layers[0]);
        canvas.renderAll();
    }
});

// Move layer up (visually down in the stack)
document.getElementById('moveLayerUp').addEventListener('click', () => {
    const activeLayer = layers.find(layer => layer._selected);
    if (activeLayer) {
        const index = layers.indexOf(activeLayer);
        if (index < layers.length - 1) {
            // Swap layers in the array
            [layers[index], layers[index + 1]] = [layers[index + 1], layers[index]];
            
            // Remove all layers from canvas
            layers.forEach(layer => {
                canvas.remove(layer);
            });
            
            // Re-add layers in new order
            layers.forEach(layer => {
                canvas.add(layer);
            });
            
            canvas.requestRenderAll();
            renderLayers();
        }
    }
});

// Move layer down (visually up in the stack)
document.getElementById('moveLayerDown').addEventListener('click', () => {
    const activeLayer = layers.find(layer => layer._selected);
    if (activeLayer) {
        const index = layers.indexOf(activeLayer);
        if (index > 0) {
            // Swap layers in the array
            [layers[index], layers[index - 1]] = [layers[index - 1], layers[index]];
            
            // Remove all layers from canvas
            layers.forEach(layer => {
                canvas.remove(layer);
            });
            
            // Re-add layers in new order
            layers.forEach(layer => {
                canvas.add(layer);
            });
            
            canvas.requestRenderAll();
            renderLayers();
        }
    }
});

// Clear canvas handler
clearBtn.addEventListener('click', () => {
    const activeLayer = layers.find(layer => layer._selected);
    if (activeLayer) {
        activeLayer.getObjects().forEach(obj => {
            activeLayer.remove(obj);
        });
        activeLayer.addWithUpdate();
        canvas.requestRenderAll();
    }
});

// Initial render
renderLayers();

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
                initBrush();
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

// Undo/Redo handlers
undoBtn.addEventListener('click', () => history.undo());
redoBtn.addEventListener('click', () => history.redo());

// Add error handling for socket connection
socket.on('connect_error', (err) => {
    alert('Connection error: ' + err.message);
});

// Update join room handler
joinRoomBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim();
    socket.emit('joinRoom', roomCode, ({ success, width, height, canvasColor, message }) => {
        if (success) {
            // Update canvas dimensions
            canvas.setWidth(width);
            canvas.setHeight(height);
            canvasEl.width = width;
            canvasEl.height = height;
            
            // Set the background color and store it
            canvas.backgroundColor = canvasColor;
            currentCanvasColor = canvasColor;
            
            // Clear existing layers
            layers.forEach(layer => {
                canvas.remove(layer);
            });
            layers = [];
            
            // Create new first layer with correct dimensions
            const firstLayer = createLayer(width, height);
            setActiveLayer(firstLayer);
            
            // Calculate initial zoom to fit viewport
            const widthRatio = containerWidth / width;
            const heightRatio = containerHeight / height;
            currentZoom = Math.min(widthRatio, heightRatio, 1);
            zoomSlider.value = currentZoom;
            
            alert('Joined room successfully!');
            roomCodeDisplay.textContent = `Room Code: ${roomCode}`;
            copyCodeBtn.style.display = 'block';
            
            // Scale canvas and render
            scaleCanvas(currentZoom);
            canvas.requestRenderAll();
        } else {
            alert(message || 'Failed to join room.');
        }
    });
});

// Add room controls toggle button to toolbar
const roomControlsBtn = document.createElement('button');
roomControlsBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M19 8h-1V3H6v5H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zM8 5h8v3H8V5zm8 12v2H8v-4h8v2zm2-2v-2H6v2H4v-4c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v4h-2z"/>
    </svg>
`;
roomControlsBtn.title = 'Room Controls';
document.querySelector('.toolbar').appendChild(roomControlsBtn);

// Hide room controls by default
const roomControls = document.querySelector('.room-controls');
roomControls.style.display = 'none';

// Toggle room controls visibility
let roomControlsVisible = false;
roomControlsBtn.addEventListener('click', () => {
    roomControlsVisible = !roomControlsVisible;
    roomControls.style.display = roomControlsVisible ? 'flex' : 'none';
    roomControlsBtn.style.backgroundColor = roomControlsVisible ? '#e3f2fd' : '';
});

// Add this after the room controls initialization
const copyCodeBtn = document.createElement('button');
copyCodeBtn.id = 'copyCode';
copyCodeBtn.textContent = 'Copy Code';
copyCodeBtn.style.display = 'none'; // Hide initially
document.querySelector('.room-controls').appendChild(copyCodeBtn);

// Add copy code functionality
copyCodeBtn.addEventListener('click', () => {
    const roomCode = roomCodeDisplay.textContent.split(': ')[1];
    if (roomCode) {
        navigator.clipboard.writeText(roomCode).then(() => {
            alert('Room code copied to clipboard!');
        });
    }
});

// Add socket handler for erase events
socket.on('erase', (data) => {
    const targetLayer = layers[data.layer] || layers[0];
    const objectsToRemove = [];
    
    // Find objects in the layer that match the erased objects
    data.erasedObjects.forEach(erasedObj => {
        targetLayer.getObjects().forEach(obj => {
            if (obj.path && erasedObj.path && 
                JSON.stringify(obj.path) === JSON.stringify(erasedObj.path)) {
                objectsToRemove.push(obj);
            }
        });
    });
    
    // Remove the objects
    objectsToRemove.forEach(obj => {
        targetLayer.remove(obj);
    });
    
    if (objectsToRemove.length > 0) {
        targetLayer.addWithUpdate();
        canvas.requestRenderAll();
    }
});

// Update tool button handlers to manage active state
function setActiveButton(activeBtn) {
    [pencilBtn, brushBtn, eraserBtn].forEach(btn => {
        btn.classList.remove('active');
    });
    activeBtn.classList.add('active');
} 