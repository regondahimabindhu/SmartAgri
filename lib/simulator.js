/**
 * IoT Field Simulator for Agentic AI Smart Agriculture
 * Simulates soil moisture, temperature, humidity, NPK, weather forecast, and crop health metrics.
 */

class FieldSimulator {
  constructor() {
    this.state = {
      cropType: 'Tomato (Flowering Stage)',
      soilMoisture: 32,          // %
      soilTemp: 24.5,             // °C
      ambientTemp: 28.0,          // °C
      humidity: 68,               // %
      npk: { nitrogen: 45, phosphorus: 30, potassium: 50 }, // mg/kg
      weatherForecast: {
        condition: 'Partly Cloudy',
        rainProbability: 15,      // %
        expectedRainfallMm: 0,
        hoursToRain: 12
      },
      waterReservoirLevel: 85,    // %
      pumpStatus: 'OFF',
      valveStatus: 'CLOSED',
      fertigationPump: 'OFF',
      pestRiskIndex: 'LOW',
      totalWaterSavedLiters: 1420,
      totalIrrigationCycles: 34,
      lastAgentAction: 'Monitoring field condition',
      lastReasoning: 'Soil moisture is within acceptable threshold (32%). Rain risk low.',
      timestamp: new Date().toISOString()
    };
  }

  getTelemetry() {
    // Add subtle ambient fluctuations unless locked by scenario
    if (!this.state.scenarioLocked) {
      this.state.soilTemp += (Math.random() - 0.5) * 0.2;
      this.state.ambientTemp += (Math.random() - 0.5) * 0.3;
      this.state.humidity += (Math.random() - 0.5) * 0.5;

      // Natural soil drying when pump is OFF
      if (this.state.pumpStatus === 'OFF' && this.state.soilMoisture > 15) {
        this.state.soilMoisture -= 0.1;
      }
    }

    // Clamp values
    this.state.soilMoisture = Math.min(100, Math.max(10, parseFloat(this.state.soilMoisture.toFixed(1))));
    this.state.soilTemp = parseFloat(this.state.soilTemp.toFixed(1));
    this.state.ambientTemp = parseFloat(this.state.ambientTemp.toFixed(1));
    this.state.humidity = Math.min(100, Math.max(20, parseFloat(this.state.humidity.toFixed(1))));
    this.state.timestamp = new Date().toISOString();

    return { ...this.state };
  }

  applyActuation(action, durationSec = 10) {
    if (action === 'START_IRRIGATION') {
      this.state.pumpStatus = 'ON';
      this.state.valveStatus = 'OPEN (Zone A)';
      this.state.soilMoisture = Math.min(85, parseFloat((this.state.soilMoisture + 15).toFixed(1)));
      this.state.waterReservoirLevel = Math.max(10, this.state.waterReservoirLevel - 3);
      this.state.totalIrrigationCycles += 1;
      this.state.lastAgentAction = `Irrigation executed for ${durationSec}s`;
    } else if (action === 'STOP_IRRIGATION') {
      this.state.pumpStatus = 'OFF';
      this.state.valveStatus = 'CLOSED';
      this.state.lastAgentAction = 'Irrigation pump deactivated (Soil target reached)';
    } else if (action === 'START_FERTIGATION') {
      this.state.fertigationPump = 'ON';
      this.state.npk.nitrogen += 10;
      this.state.npk.phosphorus += 5;
      this.state.npk.potassium += 8;
      this.state.lastAgentAction = 'Fertigation dosing applied (NPK boost)';
    } else if (action === 'STOP_FERTIGATION') {
      this.state.fertigationPump = 'OFF';
      this.state.lastAgentAction = 'Fertigation dosing completed';
    } else if (action === 'DELAY_IRRIGATION_RAIN') {
      this.state.pumpStatus = 'OFF';
      this.state.valveStatus = 'CLOSED';
      this.state.totalWaterSavedLiters += 250;
      this.state.lastAgentAction = 'Irrigation deferred due to incoming rain forecast (Saved 250L)';
    }
    return this.getTelemetry();
  }

  setCrop(cropName) {
    const cropProfiles = {
      'Tomato (Flowering Stage)': { minMoisture: 35, targetMoisture: 50 },
      'Paddy Rice (Submerged)': { minMoisture: 60, targetMoisture: 75 },
      'Wheat (Tillering Stage)': { minMoisture: 25, targetMoisture: 40 },
      'Lettuce (Vegetative)': { minMoisture: 45, targetMoisture: 60 }
    };
    if (cropProfiles[cropName]) {
      this.state.cropType = cropName;
      this.state.lastAgentAction = `Crop profile updated to ${cropName}`;
    }
    return this.getTelemetry();
  }

  injectScenario(scenarioType) {
    this.state.scenarioLocked = true;
    switch (scenarioType) {
      case 'drought':
        this.state.soilMoisture = 22.0;
        this.state.ambientTemp = 36.5;
        this.state.humidity = 30;
        this.state.weatherForecast = {
          condition: 'Heatwave / Clear Sky',
          rainProbability: 5,
          expectedRainfallMm: 0,
          hoursToRain: 48
        };
        this.state.lastAgentAction = 'Scenario Injected: Severe Drought & High Evapotranspiration';
        break;

      case 'rain_approaching':
        this.state.soilMoisture = 26.0;
        this.state.ambientTemp = 23.0;
        this.state.humidity = 82;
        this.state.weatherForecast = {
          condition: 'Thunderstorm Approaching',
          rainProbability: 92,
          expectedRainfallMm: 28,
          hoursToRain: 2
        };
        this.state.lastAgentAction = 'Scenario Injected: Soil Moisture Low BUT Heavy Rain Approaching in 2h';
        break;

      case 'pest_outbreak':
        this.state.soilMoisture = 55.0;
        this.state.ambientTemp = 31.0;
        this.state.humidity = 91;
        this.state.pestRiskIndex = 'HIGH (Fungal Spore Threat)';
        this.state.weatherForecast = {
          condition: 'Humid & Overcast',
          rainProbability: 40,
          expectedRainfallMm: 5,
          hoursToRain: 6
        };
        this.state.lastAgentAction = 'Scenario Injected: High Temp & Humidity creating Fungal Disease Risk';
        break;

      case 'npk_deficiency':
        this.state.soilMoisture = 48.0;
        this.state.npk = { nitrogen: 18, phosphorus: 12, potassium: 22 };
        this.state.lastAgentAction = 'Scenario Injected: Nitrogen & Phosphorus Critical Deficiency';
        break;

      case 'normal':
      default:
        this.state.scenarioLocked = false;
        this.state.soilMoisture = 45.0;
        this.state.ambientTemp = 26.0;
        this.state.humidity = 60;
        this.state.pestRiskIndex = 'LOW';
        this.state.npk = { nitrogen: 45, phosphorus: 30, potassium: 50 };
        this.state.weatherForecast = {
          condition: 'Partly Cloudy',
          rainProbability: 15,
          expectedRainfallMm: 0,
          hoursToRain: 12
        };
        this.state.lastAgentAction = 'Scenario Reset: Normal Optimal Field Conditions';
        break;
    }
    return this.getTelemetry();
  }
}

module.exports = new FieldSimulator();
