---
name: smartagri
description: Smart Agriculture Agentic AI Framework instructions, Node-RED architecture, and execution guidelines for Antigravity IDE.
---

# Smart Agriculture Agentic AI Framework

## Overview
This repository contains a full-stack, multi-agent precision agriculture framework powered by **Node-RED**, **Express**, and an autonomous **OODA Engine**.

## Quick Commands
- Start Server: `node server.js`
- Web Dashboard: `http://localhost:3000`
- Node-RED Flow Editor: `http://localhost:3000/red`

## Component Structure
- `server.js`: Express server & embedded Node-RED runtime engine.
- `flows.json`: Node-RED 5-node agent pipeline flow configuration.
- `lib/simulator.js`: Field telemetry generator & scenario stress simulator.
- `lib/agentic-engine.js`: Multi-agent perception, reasoning, tool-calling, and actuation engine.
- `public/`: Web dashboard UI (index.html, style.css, app.js).
