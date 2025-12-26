// OpenAI API configuration for device health analysis
import OpenAI from 'openai';

let openai = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} else {
  console.warn('⚠ OpenAI API key not configured - using rule-based predictions only');
}

export const analyzeDeviceHealth = async (sensorData) => {
  try {
    if (!openai) {
      console.log('ℹ Using fallback rule-based prediction (no OpenAI API key)');
      return generateFallbackAnalysis(sensorData);
    }

    const sensorSummary = JSON.stringify(sensorData, null, 2);

    const message = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert IoT device health analyst. Analyze the provided sensor data and determine:
1. Health Score (0-100, where 100 is perfect health)
2. Failure Risk (LOW, MEDIUM, or HIGH)
3. A brief explanation of your assessment

Consider:
- Temperature: Normal range 20-80°C, above 85°C is concerning
- Vibration: Normal < 0.5, concerning 0.5-0.8, critical > 0.8
- Pressure: Normal 20-35 units, above 40 is critical
- Trends and patterns in the data

Respond ONLY with valid JSON in this format:
{
  "healthScore": <number>,
  "failureRisk": "<LOW|MEDIUM|HIGH>",
  "reason": "<brief explanation>"
}`,
          role: 'system',
        },
        {
          role: 'user',
          content: `Analyze this sensor data: ${sensorSummary}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const responseText = message.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Validate response structure
    if (
      typeof analysis.healthScore !== 'number' ||
      !['LOW', 'MEDIUM', 'HIGH'].includes(analysis.failureRisk) ||
      typeof analysis.reason !== 'string'
    ) {
      throw new Error('Invalid response structure');
    }

    return analysis;
  } catch (error) {
    console.error('✗ OpenAI analysis error:', error.message);
    
    // Fallback analysis based on rules
    return generateFallbackAnalysis(sensorData);
  }
};

const generateFallbackAnalysis = (sensorData) => {
  const { temperature = 70, vibration = 0.5, pressure = 30 } = sensorData;

  let healthScore = 100;
  let failureRisk = 'LOW';
  let reason = 'Device operating normally';

  // Temperature assessment
  if (temperature > 85) {
    healthScore -= 30;
    failureRisk = 'HIGH';
    reason = 'Excessive temperature detected';
  } else if (temperature > 75) {
    healthScore -= 15;
    if (failureRisk === 'LOW') failureRisk = 'MEDIUM';
    reason = 'Elevated temperature';
  }

  // Vibration assessment
  if (vibration > 0.8) {
    healthScore -= 25;
    failureRisk = 'HIGH';
    reason = 'Critical vibration levels detected';
  } else if (vibration > 0.6) {
    healthScore -= 15;
    if (failureRisk === 'LOW') failureRisk = 'MEDIUM';
    reason = 'Elevated vibration detected';
  }

  // Pressure assessment
  if (pressure > 40) {
    healthScore -= 20;
    failureRisk = 'HIGH';
    reason = 'Pressure exceeds safe limits';
  } else if (pressure > 35) {
    healthScore -= 10;
    if (failureRisk === 'LOW') failureRisk = 'MEDIUM';
    reason = 'Elevated pressure';
  }

  // Ensure valid score range
  healthScore = Math.max(0, Math.min(100, healthScore));

  return { healthScore, failureRisk, reason };
};

export default openai;
