const http = require('http');
const express = require('express');
const path = require('path');
const RED = require('node-red');
const simulator = require('./lib/simulator');
const agenticEngine = require('./lib/agentic-engine');

const app = express();
app.use(express.json());

// Node-RED Configuration Settings
const settings = {
    httpAdminRoot: "/red",
    httpNodeRoot: "/api/nodered",
    userDir: path.join(__dirname, ".nodered"),
    flowFile: path.join(__dirname, 'flows.json'),
    functionGlobalContext: {
        simulator: simulator,
        agenticEngine: agenticEngine
    },
    logging: {
        console: {
            level: "info",
            metrics: false,
            audit: false
        }
    }
};

// Create Express Server
const server = http.createServer(app);

// Initialize Node-RED runtime
RED.init(server, settings);

// Mount Node-RED admin editor & node routes
app.use(settings.httpAdminRoot, RED.httpAdmin);
app.use(settings.httpNodeRoot, RED.httpNode);

// Serve static frontend dashboard
app.use(express.static(path.join(__dirname, 'public')));

// Application REST APIs
app.get('/api/telemetry', (req, res) => {
    res.json(simulator.getTelemetry());
});

app.get('/api/agent/memory', (req, res) => {
    res.json({
        logs: agenticEngine.getMemoryHistory(),
        latestTelemetry: simulator.getTelemetry()
    });
});

app.post('/api/scenario', (req, res) => {
    const { scenario } = req.body;
    const telemetry = simulator.injectScenario(scenario);
    // Execute an agentic cycle immediately on scenario injection
    const decision = agenticEngine.processCycle(telemetry);
    if (decision.primaryAction !== 'IDLE') {
        simulator.applyActuation(decision.primaryAction);
    }
    res.json({ success: true, scenario, telemetry, decision });
});

app.post('/api/agent/trigger', (req, res) => {
    const telemetry = simulator.getTelemetry();
    const decision = agenticEngine.processCycle(telemetry);
    if (decision.primaryAction !== 'IDLE') {
        simulator.applyActuation(decision.primaryAction);
    }
    res.json({ success: true, decision, telemetry: simulator.getTelemetry() });
});

app.post('/api/crop', (req, res) => {
    const { cropName } = req.body;
    const telemetry = simulator.setCrop(cropName);
    const decision = agenticEngine.processCycle(telemetry);
    res.json({ success: true, cropName, telemetry, decision });
});

app.post('/api/actuator', (req, res) => {
    const { action } = req.body;
    const telemetry = simulator.applyActuation(action);
    res.json({ success: true, action, telemetry });
});

app.delete('/api/agent/memory', (req, res) => {
    agenticEngine.clearMemory();
    res.json({ success: true, message: 'Agent memory logs cleared.' });
});

// Default fallback to index.html
app.use((req, res, next) => {
    if (req.path.startsWith('/red') || req.path.startsWith('/api')) {
        return next();
    }
    if (req.method === 'GET') {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    next();
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🌱 Agentic AI Smart Agriculture Framework Running!`);
    console.log(`-------------------------------------------------------`);
    console.log(`🖥️  Web Dashboard UI:      http://localhost:${PORT}`);
    console.log(`🔄 Node-RED Flow Editor:  http://localhost:${PORT}/red`);
    console.log(`=======================================================`);
    RED.start();
});
