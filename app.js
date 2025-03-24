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

// First, move the layers array initialization to the top
// Add this near the other initial constants
let layers = [];

// Move the layer-related functions up, before any usage
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

function setActiveLayer(layer) {
    layers.forEach(l => l._selected = false);
    layer._selected = true;
    renderLayers();
}

function renderLayers() {
    const layerList = document.getElementById('layerList');
    if (!layerList) return; // Guard clause in case the element isn't ready

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

// After the canvas initialization, create the first layer
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

// Create initial layer and set it as active
const firstLayer = createLayer(STANDARD_WIDTH, STANDARD_HEIGHT);
setActiveLayer(firstLayer);

// Initialize drawing mode
canvas.isDrawingMode = true;
initBrush();

// Initialize Socket.io connection
let socket;
try {
    const serverUrl = "https://fabric-websocket-app-a840df0c5fa5.herokuapp.com";
    console.log('Attempting to connect to:', serverUrl);
    
    socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        forceNew: true,
        withCredentials: false
    });

    socket.on('connect', () => {
        console.log('Connected to server successfully');
        connectionStatus.textContent = 'Connected';
        connectionStatus.className = 'connection-status connected';
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error details:', {
            message: error.message,
            description: error.description,
            context: error.context,
            type: error.type
        });
        connectionStatus.textContent = 'Connection Failed - Retrying...';
        connectionStatus.className = 'connection-status disconnected';
    });

    socket.on('disconnect', (reason) => {
        console.log('Disconnected from server. Reason:', reason);
        connectionStatus.textContent = 'Disconnected';
        connectionStatus.className = 'connection-status disconnected';
    });
} catch (error) {
    console.error('Socket initialization error:', error);
    alert('Failed to initialize connection. Please refresh the page.');
}

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
    canvas.freeDrawingBrush.color = canvas.backgroundColor || '#ffffff';
    
    // Set custom cursor
    canvas.freeDrawingCursor = createEraserCursor(eraserSize * 2);
    
    // Remove existing path:created handler
    canvas.off('path:created');
    
    // Add eraser-specific path:created handler
    canvas.on('path:created', function(event) {
        if (!socket.connected) {
            alert('Lost connection to server. Your changes may not be saved.');
            return;
        }

        const eraserPath = event.path;
        canvas.remove(eraserPath);
        
        const activeLayer = layers.find(layer => layer._selected) || layers[0];
        const objectsToRemove = [];
        
        // Get eraser path points
        const eraserPoints = eraserPath.path.map(point => {
            if (point[0] === 'M' || point[0] === 'L') {
                return { x: point[1], y: point[2] };
            }
            return null;
        }).filter(point => point !== null);
        
        // Check each object in the active layer
        activeLayer.getObjects().forEach(obj => {
            if (!obj.path) return;
            
            // Get object path points
            const objPoints = obj.path.map(point => {
                if (point[0] === 'M' || point[0] === 'L') {
                    return { x: point[1], y: point[2] };
                }
                return null;
            }).filter(point => point !== null);
            
            // Check if any point of the eraser path is close to any point of the object
            const shouldRemove = eraserPoints.some(eraserPoint => {
                return objPoints.some(objPoint => {
                    const dx = eraserPoint.x - objPoint.x;
                    const dy = eraserPoint.y - objPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    return distance <= eraserSize;
                });
            });
            
            if (shouldRemove) {
                objectsToRemove.push(obj);
            }
        });
        
        if (objectsToRemove.length > 0) {
            objectsToRemove.forEach(obj => {
                activeLayer.remove(obj);
            });
            
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

// Update the drawing handler in both pencil and brush click events
function createDrawingHandler() {
    return function(event) {
        if (!socket.connected) {
            alert('Lost connection to server. Your changes may not be saved.');
            return;
        }

        const path = event.path;
        const activeLayer = layers.find(layer => layer._selected) || layers[0];
        canvas.remove(path);
        
        // Get the current viewport transform
        const vpt = canvas.viewportTransform;
        const zoom = vpt[0];
        
        // Create a new path with adjusted properties
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
    };
}

// Update the pencil click handler
pencilBtn.addEventListener('click', () => {
    setActiveButton(pencilBtn);
    canvas.freeDrawingCursor = 'crosshair';
    canvas.off('path:created');
    canvas.on('path:created', createDrawingHandler());
    
    initBrush();
    canvas.isDrawingMode = true;
    const size = parseInt(brushSize.value, 10);
    canvas.freeDrawingBrush.width = size;
    canvas.freeDrawingBrush.color = colorPicker.value;
    canvas.requestRenderAll();
});

// Update the brush click handler
brushBtn.addEventListener('click', () => {
    setActiveButton(brushBtn);
    canvas.freeDrawingCursor = 'crosshair';
    canvas.off('path:created');
    canvas.on('path:created', createDrawingHandler());
    
    initBrush();
    canvas.isDrawingMode = true;
    const size = parseInt(brushSize.value, 10);
    canvas.freeDrawingBrush.width = size * 2;
    canvas.freeDrawingBrush.color = colorPicker.value;
    canvas.requestRenderAll();
});

eraserBtn.addEventListener('click', () => {
    setActiveButton(eraserBtn);
    initEraser();
});

// Update the brush size handler
brushSize.addEventListener('input', () => {
    if (canvas.freeDrawingBrush) {
        const size = parseInt(brushSize.value, 10);
        
        if (eraserBtn.classList.contains('active')) {
            canvas.freeDrawingBrush.width = size;
            canvas.freeDrawingCursor = createEraserCursor(size * 2);
        } else if (brushBtn.classList.contains('active')) {
            canvas.freeDrawingBrush.width = size * 2;
        } else {
            canvas.freeDrawingBrush.width = size;
        }
    }
});

// Color picker handler
colorPicker.addEventListener('input', (e) => {
    if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = e.target.value;
        canvas.requestRenderAll();
    }
});

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

// Update the clear canvas handler
clearBtn.addEventListener('click', () => {
    const activeLayer = layers.find(layer => layer._selected);
    if (activeLayer) {
        if (confirm('Are you sure you want to clear this layer?')) {
            const objects = activeLayer.getObjects();
            objects.forEach(obj => {
                activeLayer.remove(obj);
            });
            
            const roomCode = roomCodeDisplay.textContent.split(': ')[1];
            if (roomCode && socket.connected) {
                socket.emit('erase', roomCode, {
                    layer: layers.indexOf(activeLayer),
                    erasedObjects: objects.map(obj => obj.toObject())
                });
            }
            
            activeLayer.addWithUpdate();
            canvas.requestRenderAll();
            history.saveState();
        }
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

// Update join room handler
joinRoomBtn.addEventListener('click', () => {
    if (!socket.connected) {
        alert('Not connected to server. Please refresh the page.');
        return;
    }

    const roomCode = roomCodeInput.value.trim();
    socket.emit('joinRoom', roomCode, ({ success, width, height, canvasColor, message }) => {
        if (success) {
            // Set the canvas dimensions
            canvas.setWidth(STANDARD_WIDTH);
            canvas.setHeight(STANDARD_HEIGHT);
            canvasEl.width = STANDARD_WIDTH;
            canvasEl.height = STANDARD_HEIGHT;
            
            canvas.backgroundColor = canvasColor;
            currentCanvasColor = canvasColor;
            
            // Clear existing layers
            layers.forEach(layer => canvas.remove(layer));
            layers = [];
            
            // Create new first layer
            const firstLayer = createLayer(STANDARD_WIDTH, STANDARD_HEIGHT);
            setActiveLayer(firstLayer);

            alert('Joined room successfully!');
            roomCodeDisplay.textContent = `Room Code: ${roomCode}`;
            copyCodeBtn.style.display = 'block';
            
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

// Add this near the top of your file
const connectionStatus = document.createElement('div');
connectionStatus.className = 'connection-status';
document.body.appendChild(connectionStatus);

// Update connection status
socket.on('connect', () => {
    connectionStatus.textContent = 'Connected';
    connectionStatus.className = 'connection-status connected';
});

socket.on('disconnect', () => {
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.className = 'connection-status disconnected';
});

// Add this helper function near the top of your file
function getPathPoints(path) {
    if (!path || !path.path) return [];
    return path.path.map(point => {
        // Handle different path command types
        if (point[0] === 'M' || point[0] === 'L') {
            return { x: point[1], y: point[2] };
        }
        return null;
    }).filter(point => point !== null);
} 