const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");

const app = express();

// Enable CORS for GitHub Pages frontend
app.use(cors({ origin: "*" }));

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }, // Allow any frontend to connect
});

// Manage rooms and canvas states
const rooms = {};

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle creating a room
    socket.on("createRoom", ({ width, height, canvasColor }, callback) => {
        const roomCode = Math.random().toString(36).substring(2, 8);
        rooms[roomCode] = { width, height, canvasColor, canvasState: [] };
        socket.join(roomCode);
        callback(roomCode);
    });

    // Handle joining a room
    socket.on("joinRoom", (roomCode, callback) => {
        if (rooms[roomCode]) {
            socket.join(roomCode);
            callback({ 
                success: true, 
                width: rooms[roomCode].width, 
                height: rooms[roomCode].height,
                canvasColor: rooms[roomCode].canvasColor 
            });
            socket.emit("canvasState", rooms[roomCode].canvasState);
        } else {
            callback({ success: false, message: "Room not found" });
        }
    });

    // Handle drawing events
    socket.on("draw", (roomCode, data) => {
        if (rooms[roomCode]) {
            rooms[roomCode].canvasState.push(data);
            socket.to(roomCode).emit("draw", data);
        }
    });

    // Handle erase events
    socket.on("erase", (roomCode, data) => {
        if (rooms[roomCode]) {
            rooms[roomCode].canvasState = rooms[roomCode].canvasState.filter(obj => {
                return !data.erasedObjects.some(erasedObj => 
                    JSON.stringify(obj.path) === JSON.stringify(erasedObj.path)
                );
            });
            socket.to(roomCode).emit("erase", data);
        }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Use correct port for Heroku
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
