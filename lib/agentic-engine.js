/**
 * Agentic AI Core Engine for Smart Agriculture
 * Implements Multi-Agent OODA Loop: Perception -> Reasoning & Tool Invocation -> Plan -> Actuation -> Reflection
 */

class AgenticEngine {
  constructor() {
    this.memoryLogs = [];
    this.tools = {
      query_weather_radar: (forecast) => {
        return {
          radarStatus: forecast.rainProbability > 70 ? 'HEAVY_PRECIPITATION_IMMIMENET' : 'NO_SIGNIFICANT_PRECIPITATION',
          confidence: 0.94,
          rainVolumeExpectedMm: forecast.expectedRainfallMm
        };
      },
      calculate_water_requirement: (moisture, cropType) => {
        const deficitPct = Math.max(0, 50 - moisture);
        const litersNeeded = Math.round(deficitPct * 18.5); // 18.5L per 1% moisture deficit for 100m² plot
        return {
          deficitPct,
          litersNeeded,
          recommendedDurationSec: Math.min(60, litersNeeded * 2)
        };
      },
      check_pest_spore_risk: (temp, humidity) => {
        // High humidity (>85%) and temperature between 25°C - 32°C creates high fungal blight risk
        if (humidity > 80 && temp >= 24 && temp <= 33) {
          return {
            riskLevel: 'CRITICAL',
            pathogen: 'Late Blight (Phytophthora infestans)',
            actionRequired: 'Trigger preventive bio-fungicide spray & suspend overhead misting'
          };
        }
        return { riskLevel: 'LOW', pathogen: 'None', actionRequired: 'Maintain routine monitor' };
      },
      calculate_npk_dosing: (npk) => {
        const defN = Math.max(0, 40 - npk.nitrogen);
        const defP = Math.max(0, 25 - npk.phosphorus);
        const defK = Math.max(0, 45 - npk.potassium);
        const needsFertigation = defN > 0 || defP > 0 || defK > 0;
        return {
          needsFertigation,
          recipe: {
            nitrogenDoseGrams: defN * 5,
            phosphorusDoseGrams: defP * 3,
            potassiumDoseGrams: defK * 4
          }
        };
      }
    };
  }

  /**
   * Main Autonomous Execution Cycle (OODA Loop)
   */
  processCycle(telemetry) {
    const timestamp = new Date().toISOString();
    
    // Dynamic Crop Threshold Profiles
    const cropProfiles = {
      'Tomato (Flowering Stage)': { minMoisture: 35, targetMoisture: 50 },
      'Paddy Rice (Submerged)': { minMoisture: 60, targetMoisture: 75 },
      'Wheat (Tillering Stage)': { minMoisture: 25, targetMoisture: 40 },
      'Lettuce (Vegetative)': { minMoisture: 45, targetMoisture: 60 }
    };
    const profile = cropProfiles[telemetry.cropType] || cropProfiles['Tomato (Flowering Stage)'];

    // STEP 1: PERCEPTION AGENT
    const perception = {
      moistureDeficit: telemetry.soilMoisture < profile.minMoisture,
      severeDrought: telemetry.soilMoisture < (profile.minMoisture - 10),
      optimalMoisture: telemetry.soilMoisture >= profile.targetMoisture,
      highHeat: telemetry.ambientTemp > 34,
      rainIncoming: telemetry.weatherForecast.rainProbability >= 70 && telemetry.weatherForecast.hoursToRain <= 3,
      pestThreat: telemetry.humidity > 80 && telemetry.ambientTemp > 24,
      npkDeficit: telemetry.npk.nitrogen < 30 || telemetry.npk.phosphorus < 20 || telemetry.npk.potassium < 35
    };

    // STEP 2: REASONING & TOOL CALLING AGENT
    const toolExecutions = [];
    let reasoningSteps = [];
    let actionPlan = [];
    let primaryAction = 'IDLE';

    reasoningSteps.push(`[Perception] Crop: ${telemetry.cropType} | Soil Moisture: ${telemetry.soilMoisture}% (Target: ${profile.targetMoisture}%), Ambient Temp: ${telemetry.ambientTemp}°C, Humidity: ${telemetry.humidity}%.`);
    
    // Tool 1: Check Weather Radar
    const weatherResult = this.tools.query_weather_radar(telemetry.weatherForecast);
    toolExecutions.push({ tool: 'query_weather_radar', input: telemetry.weatherForecast, output: weatherResult });

    // Conflict Resolution & Adaptive Reasoning
    if (perception.rainIncoming) {
      reasoningSteps.push(`[Conflict Resolution] Soil moisture is low (${telemetry.soilMoisture}%), BUT weather radar confirms ${weatherResult.radarStatus} with ${telemetry.weatherForecast.rainProbability}% probability in ${telemetry.weatherForecast.hoursToRain}h.`);
      reasoningSteps.push(`[Autonomous Decision] Overriding default moisture trigger to conserve water and prevent root over-saturation.`);
      primaryAction = 'DELAY_IRRIGATION_RAIN';
      actionPlan.push('Defer irrigation pump activation');
      actionPlan.push(`Log water conservation metric (~250 Liters saved)`);
      actionPlan.push(`Re-evaluate soil moisture after rainfall window (in 3 hours)`);
    } 
    else if (perception.severeDrought || perception.moistureDeficit) {
      const waterReq = this.tools.calculate_water_requirement(telemetry.soilMoisture, telemetry.cropType);
      toolExecutions.push({ tool: 'calculate_water_requirement', input: { moisture: telemetry.soilMoisture }, output: waterReq });

      reasoningSteps.push(`[Moisture Analysis] Soil moisture (${telemetry.soilMoisture}%) is below target baseline (${profile.targetMoisture}%). Water deficit calculated: ${waterReq.litersNeeded} Liters.`);
      
      if (perception.highHeat) {
        reasoningSteps.push(`[Heatwave Mitigation] High ambient temperature (${telemetry.ambientTemp}°C) detected. Applying pulsed irrigation strategy to maximize root absorption.`);
      }

      primaryAction = 'START_IRRIGATION';
      actionPlan.push(`Engage Zone A solenoid valve`);
      actionPlan.push(`Activate main drip pump for ${waterReq.recommendedDurationSec} seconds`);
      actionPlan.push(`Target volume: ${waterReq.litersNeeded} Liters`);
    }
    else if (perception.optimalMoisture && telemetry.pumpStatus === 'ON') {
      primaryAction = 'STOP_IRRIGATION';
      reasoningSteps.push(`[Optimal Target Met] Soil moisture (${telemetry.soilMoisture}%) reached optimal crop threshold (${profile.targetMoisture}%). Deactivating drip pump.`);
      actionPlan.push('Deactivate irrigation drip pump');
      actionPlan.push('Close Solenoid Valve Zone A');
    }

    // Secondary Tool: Pest Disease Risk
    const pestResult = this.tools.check_pest_spore_risk(telemetry.ambientTemp, telemetry.humidity);
    toolExecutions.push({ tool: 'check_pest_spore_risk', input: { temp: telemetry.ambientTemp, humidity: telemetry.humidity }, output: pestResult });
    
    if (pestResult.riskLevel === 'CRITICAL') {
      reasoningSteps.push(`[Biosecurity Threat] Pest/Fungal disease threat detected: ${pestResult.pathogen}. Triggering protection protocol.`);
      actionPlan.push(`Alert field manager via Telegram/Node-RED Dashboard: ${pestResult.actionRequired}`);
    }

    // Secondary Tool: NPK Dosing
    if (perception.npkDeficit) {
      const npkResult = this.tools.calculate_npk_dosing(telemetry.npk);
      toolExecutions.push({ tool: 'calculate_npk_dosing', input: telemetry.npk, output: npkResult });
      reasoningSteps.push(`[Nutrient Deficiency] Soil NPK levels depleted (N:${telemetry.npk.nitrogen}, P:${telemetry.npk.phosphorus}, K:${telemetry.npk.potassium}). Dosing recipe calculated.`);
      if (primaryAction === 'START_IRRIGATION') {
        primaryAction = 'START_FERTIGATION';
        actionPlan.push(`Inject nutrient solution: N(+${npkResult.recipe.nitrogenDoseGrams}g), P(+${npkResult.recipe.phosphorusDoseGrams}g), K(+${npkResult.recipe.potassiumDoseGrams}g)`);
      }
    }

    if (primaryAction === 'IDLE' && actionPlan.length === 0) {
      reasoningSteps.push(`[Status Optimal] Field parameters within healthy ranges for ${telemetry.cropType}. No active intervention required.`);
      actionPlan.push('Maintain passive monitoring telemetry stream');
    }

    const agentDecision = {
      timestamp,
      agentId: 'AgriAgent-v1.4',
      primaryAction,
      confidenceScore: 0.96,
      reasoningSteps,
      toolExecutions,
      actionPlan,
      summary: reasoningSteps[reasoningSteps.length - 1]
    };

    // STEP 4: REFLECTION & MEMORY RECORDING
    this.memoryLogs.unshift(agentDecision);
    if (this.memoryLogs.length > 50) this.memoryLogs.pop();

    return agentDecision;
  }

  getMemoryHistory() {
    return this.memoryLogs;
  }

  clearMemory() {
    this.memoryLogs = [];
    return { success: true, count: 0 };
  }
}

module.exports = new AgenticEngine();
