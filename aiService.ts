
import { GoogleGenAI, Type, Part } from "@google/genai";
import { AIConfig } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export async function analyzePostureFromMedia(mediaParts: Part[], method: string, lang: string, config: AIConfig) {
  try {
    const prompt = `
      Analyze this workplace posture/video for a ${method} ergonomic assessment.
      Please provide estimated ergonomic scores for the following parameters based on the visual evidence.
      Additionally, provide a very short, summarized reason (in ${lang === 'fa' ? 'Persian (Farsi)' : 'English'}) for EACH parameter's score, explaining exactly which posture or movement observed in the footage led to that specific score.
      
      Method: ${method}
      
      Return the result in JSON format ONLY.
    `;

    if (config.provider === 'ollama') {
      const response = await fetch(`${config.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.ollamaModel || 'llava',
          prompt: prompt + "\\n\\nThe JSON format must have root keys: 'estimatedParameters', 'parameterReasons', and 'observations'. Keys should match the standard ergonomic params (neck, trunk, upperArm, lowerArm, wrist, legs, etc).",
          images: mediaParts.filter(p => p.inlineData).map(p => p.inlineData!.data),
          stream: false,
          format: "json",
        })
      });
      if (!response.ok) {
         throw new Error(`Ollama API error: ${response.statusText}`);
      }
      const data = await response.json();
      return JSON.parse(data.response);
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          ...mediaParts,
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimatedParameters: {
              type: Type.OBJECT,
              description: "The estimated ergonomic parameters based on the visual evidence.",
              properties: {
                neck: { type: Type.INTEGER },
                trunk: { type: Type.INTEGER },
                upperArm: { type: Type.INTEGER },
                lowerArm: { type: Type.INTEGER },
                legs: { type: Type.INTEGER },
                back: { type: Type.INTEGER },
                arms: { type: Type.INTEGER },
                wrist: { type: Type.INTEGER },
                wristTwist: { type: Type.INTEGER },
                load: { type: Type.INTEGER },
                coupling: { type: Type.INTEGER },
                activity: { type: Type.INTEGER },
                force: { type: Type.INTEGER },
                muscle: { type: Type.INTEGER },
              }
            },
            parameterReasons: {
              type: Type.OBJECT,
              description: `Short reason for each corresponding parameter score in ${lang === 'fa' ? 'Persian' : 'English'}. Keys must match estimatedParameters.`,
              properties: {
                neck: { type: Type.STRING },
                trunk: { type: Type.STRING },
                upperArm: { type: Type.STRING },
                lowerArm: { type: Type.STRING },
                legs: { type: Type.STRING },
                back: { type: Type.STRING },
                arms: { type: Type.STRING },
                wrist: { type: Type.STRING },
                wristTwist: { type: Type.STRING },
                load: { type: Type.STRING },
                coupling: { type: Type.STRING },
                activity: { type: Type.STRING },
                force: { type: Type.STRING },
                muscle: { type: Type.STRING },
              }
            },
            observations: {
              type: Type.STRING,
              description: "Brief professional observations about the posture."
            }
          },
          required: ["estimatedParameters", "parameterReasons"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
}

