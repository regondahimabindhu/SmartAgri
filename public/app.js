// Client Dashboard Logic for Agentic AI Smart Agriculture Framework

async function fetchTelemetry() {
  try {
    const res = await fetch('/api/telemetry');
    const data = await res.json();
    updateTelemetryUI(data);
  } catch (err) {
    console.error('Failed to fetch telemetry:', err);
  }
}

async function fetchAgentMemory() {
  try {
    const res = await fetch('/api/agent/memory');
    const data = await res.json();
    updateLogsUI(data.logs);
  } catch (err) {
    console.error('Failed to fetch agent memory:', err);
  }
}

function updateTelemetryUI(data) {
  document.getElementById('val-soil-moisture').innerText = data.soilMoisture;
  document.getElementById('val-ambient-temp').innerText = data.ambientTemp;
  document.getElementById('val-humidity').innerText = data.humidity;
  document.getElementById('val-rain-prob').innerText = data.weatherForecast.rainProbability;
  
  document.getElementById('val-npk').innerText = `${data.npk.nitrogen} / ${data.npk.phosphorus} / ${data.npk.potassium}`;
  document.getElementById('val-pest').innerText = data.pestRiskIndex;
  document.getElementById('val-reservoir').innerText = data.waterReservoirLevel;
  document.getElementById('val-crop').innerText = data.cropType;

  // Dynamic Crop Target Indicator
  const cropTargets = {
    'Tomato (Flowering Stage)': '50% H2O Target',
    'Paddy Rice (Submerged)': '75% H2O Target',
    'Wheat (Tillering Stage)': '40% H2O Target',
    'Lettuce (Vegetative)': '60% H2O Target'
  };
  const targetText = cropTargets[data.cropType] || '50% H2O Target';
  document.getElementById('val-crop-target').innerText = targetText;

  // Update Visual Progress Bars
  document.getElementById('bar-soil-moisture').style.width = `${Math.min(100, Math.max(0, data.soilMoisture))}%`;
  document.getElementById('bar-ambient-temp').style.width = `${Math.min(100, Math.max(0, (data.ambientTemp / 50) * 100))}%`;
  document.getElementById('bar-humidity').style.width = `${Math.min(100, Math.max(0, data.humidity))}%`;
  document.getElementById('bar-rain-prob').style.width = `${Math.min(100, Math.max(0, data.weatherForecast.rainProbability))}%`;
  document.getElementById('bar-reservoir').style.width = `${Math.min(100, Math.max(0, data.waterReservoirLevel))}%`;

  // NPK Bars
  document.getElementById('bar-npk-n').style.width = `${Math.min(100, (data.npk.nitrogen / 80) * 100)}%`;
  document.getElementById('bar-npk-p').style.width = `${Math.min(100, (data.npk.phosphorus / 60) * 100)}%`;
  document.getElementById('bar-npk-k').style.width = `${Math.min(100, (data.npk.potassium / 80) * 100)}%`;

  // Impact metrics
  document.getElementById('val-water-saved').innerText = data.totalWaterSavedLiters.toLocaleString();
  document.getElementById('val-total-cycles').innerText = data.totalIrrigationCycles;

  document.getElementById('last-update-time').innerText = 'Last updated: ' + new Date(data.timestamp).toLocaleTimeString();

  // Update Status Pills
  updatePill('pill-soil-moisture', data.soilMoisture < 30 ? 'Low Deficit' : 'Optimal', data.soilMoisture < 30 ? 'pill-red' : 'pill-green');
  updatePill('pill-ambient-temp', data.ambientTemp > 32 ? 'High Heat' : 'Normal', data.ambientTemp > 32 ? 'pill-amber' : 'pill-blue');
  updatePill('pill-humidity', data.humidity > 80 ? 'High Dampness' : 'Balanced', data.humidity > 80 ? 'pill-amber' : 'pill-green');
  updatePill('pill-rain', data.weatherForecast.rainProbability > 70 ? 'Incoming Storm' : 'Clear Sky', data.weatherForecast.rainProbability > 70 ? 'pill-amber' : 'pill-green');
  updatePill('pill-pest-status', data.pestRiskIndex.includes('HIGH') ? 'ALERT' : 'Safe', data.pestRiskIndex.includes('HIGH') ? 'pill-red' : 'pill-green');

  // Actuator states
  document.getElementById('status-pump').innerText = data.pumpStatus;
  document.getElementById('status-pump').className = `status-pill ${data.pumpStatus === 'ON' ? 'pill-red' : 'pill-green'}`;
  
  document.getElementById('status-valve').innerText = data.valveStatus;
  document.getElementById('status-valve').className = `status-pill ${data.valveStatus.includes('OPEN') ? 'pill-amber' : 'pill-green'}`;

  document.getElementById('status-fertigation').innerText = data.fertigationPump;
  document.getElementById('status-fertigation').className = `status-pill ${data.fertigationPump === 'ON' ? 'pill-amber' : 'pill-green'}`;

  // Update active crop button state
  document.querySelectorAll('.btn-crop').forEach(btn => {
    btn.classList.toggle('active', btn.innerText.includes(data.cropType.split(' ')[0]));
  });
}

function updatePill(id, text, className) {
  const el = document.getElementById(id);
  if (el) {
    el.innerText = text;
    el.className = `status-pill ${className}`;
  }
}

function updateLogsUI(logs) {
  const container = document.getElementById('reasoning-logs');
  if (!logs || logs.length === 0) {
    container.innerHTML = `
      <div class="log-entry">
        <span class="log-time">[${new Date().toLocaleTimeString()}]</span>
        <span class="log-action">AGENT READY</span>
        <div class="log-step">No active agent memory logs. Trigger a cycle or inject a scenario to watch perception & reasoning.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = logs.map(log => {
    const timeStr = new Date(log.timestamp).toLocaleTimeString();
    
    const stepsHtml = log.reasoningSteps.map(step => `
      <div class="log-step">${escapeHtml(step)}</div>
    `).join('');

    const toolsHtml = log.toolExecutions ? log.toolExecutions.map(t => `
      <span class="tool-badge">🔧 Tool: ${t.tool}()</span>
    `).join('') : '';

    return `
      <div class="log-entry">
        <div>
          <span class="log-time">[${timeStr}]</span>
          <span class="log-action">ACTION: ${log.primaryAction}</span>
          <span style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">Confidence: ${(log.confidenceScore * 100).toFixed(0)}%</span>
        </div>
        <div style="margin-top: 6px;">${toolsHtml}</div>
        ${stepsHtml}
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function injectScenario(scenario) {
  try {
    const res = await fetch('/api/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario })
    });
    const data = await res.json();
    updateTelemetryUI(data.telemetry);
    fetchAgentMemory();
  } catch (err) {
    console.error('Failed to inject scenario:', err);
  }
}

async function selectCrop(cropName) {
  try {
    const res = await fetch('/api/crop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cropName })
    });
    const data = await res.json();
    updateTelemetryUI(data.telemetry);
    fetchAgentMemory();
  } catch (err) {
    console.error('Failed to select crop:', err);
  }
}

async function manualActuator(action) {
  try {
    const res = await fetch('/api/actuator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    updateTelemetryUI(data.telemetry);
  } catch (err) {
    console.error('Failed manual actuation:', err);
  }
}

async function triggerAgentCycle() {
  try {
    const res = await fetch('/api/agent/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    updateTelemetryUI(data.telemetry);
    fetchAgentMemory();
  } catch (err) {
    console.error('Failed to trigger agent cycle:', err);
  }
}

async function clearAgentMemory() {
  try {
    await fetch('/api/agent/memory', { method: 'DELETE' });
    fetchAgentMemory();
  } catch (err) {
    console.error('Failed to clear agent memory:', err);
  }
}

// Initial polling setup
fetchTelemetry();
fetchAgentMemory();

setInterval(() => {
  fetchTelemetry();
  fetchAgentMemory();
}, 4000);
