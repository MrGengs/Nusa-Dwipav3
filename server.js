// Load required modules
const http = require("http");                 // http server core module
const path = require("path");
const express = require("express");           // web framework external module
const socketIo = require("socket.io");        // web socket external module
const easyrtc = require("open-easyrtc");      // EasyRTC external module
const cors = require("cors");                 // CORS middleware
// To generate a certificate for local development with https, you can run
// `npm run dev2`, it will create the node_modules/.cache/webpack-dev-server/server.pem file.
// Then stop it, change the lines here and run `npm start`.
// To enable https on the node server, uncomment the next lines
// and the webServer line down below.
// const https = require("https");
// const fs = require("fs");
// const privateKey = fs.readFileSync("node_modules/.cache/webpack-dev-server/server.pem", "utf8");
// const certificate = fs.readFileSync("node_modules/.cache/webpack-dev-server/server.pem", "utf8");
// const credentials = { key: privateKey, cert: certificate };

// Set process name
process.title = "networked-aframe-server";

// Get port or default to 8080
const port = process.env.PORT || 8080;

// Setup and configure Express http server.
const app = express();

// Enable CORS for all routes
app.use(cors());

// Trust proxy for Vercel
app.set('trust proxy', true);

// Serve the bundle in-memory in development (needs to be before the express.static)
if (process.env.NODE_ENV === "development") {
  const webpackDevMiddleware = require("webpack-dev-middleware");
  const webpack = require("webpack");
  const config = require("./webpack.config.js");
  const compiler = webpack(config);
  app.use(
    webpackDevMiddleware(compiler, {
      index: false,
      publicPath: "/dist/",
    }),
  );
}

// Serve EasyRTC client files from node_modules
// This makes /easyrtc/easyrtc.js available to the browser
app.use('/easyrtc', express.static(path.join(__dirname, 'node_modules', 'open-easyrtc', 'api')));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Start Express http server with increased timeout
const webServer = http.createServer(app);

// Increase server timeout to handle long-polling
webServer.keepAliveTimeout = 60000;
webServer.headersTimeout = 65000;

// Configure Socket.IO with proper settings
const io = socketIo(webServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true
  },
  path: '/socket.io/',
  serveClient: false,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Handle connection events
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected (${socket.id}):`, reason);
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
  
  // Log all events for debugging
  const originalEmit = socket.emit;
  socket.emit = function(event, ...args) {
    if (event !== 'pong' && event !== 'ping') {
      console.log(`Emitting event: ${event}`, args);
    }
    return originalEmit.apply(socket, [event, ...args]);
  };
});

// Configure EasyRTC
const rtc = easyrtc.listen(app, io, {
  logLevel: 'debug',
  appIceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { 
      urls: 'turn:numb.viagenie.ca',
      username: 'webrtc@live.com',
      credential: 'muazkh'
    }
  ]
});

// Handle EasyRTC events using the correct API
if (rtc && rtc.events) {
  rtc.events.on('roomCreate', (appObj, creatorConnectionObj, roomName, roomOptions, callback) => {
    console.log('Room created:', roomName);
    if (typeof callback === 'function') {
      callback(null, roomName);
    }
  });

  rtc.events.on('roomJoin', (connectionObj, roomName, roomParameter, callback) => {
    console.log('User joined room:', roomName, 'Connection ID:', connectionObj.getConnectionId());
    if (typeof callback === 'function') {
      callback(null);
    }
  });

  rtc.events.on('connection', (connectionObj) => {
    console.log('New connection:', connectionObj.getConnectionId());
    
    if (connectionObj && connectionObj.events) {
      connectionObj.events.on('disconnect', () => {
        console.log('Connection closed:', connectionObj.getConnectionId());
      });
      
      connectionObj.events.on('error', (error) => {
        console.error('Connection error:', error);
      });
    }
  });
} else {
  console.log('EasyRTC events not available, using basic setup');
}

// Set additional EasyRTC options
easyrtc.setOption("logLevel", "debug");
easyrtc.setOption("demosEnable", false);

// Listen on port
webServer.listen(port, () => {
  console.log("listening on http://localhost:" + port);
});
