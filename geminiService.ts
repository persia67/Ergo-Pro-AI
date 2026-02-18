
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export async function analyzePostureFromImage(base64Image: string, method: string) {
  try {
    const prompt = `
      Analyze this workplace posture for a ${method} ergonomic assessment.
      Please provide estimated ergonomic scores for the following parameters based on the image:
      Method: ${method}
      
      Return the result in JSON format ONLY.
    `;

    // Define a schema based on common ergonomic parameters
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
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
              description: "The estimated ergonomic parameters based on the image.",
              properties: {
                neck: { type: Type.INTEGER },
                trunk: { type: Type.INTEGER },
                upperArm: { type: Type.INTEGER },
                lowerArm: { type: Type.INTEGER },
                legs: { type: Type.INTEGER },
                back: { type: Type.INTEGER },
                arms: { type: Type.INTEGER },
              }
            },
            observations: {
              type: Type.STRING,
              description: "Brief professional observations about the posture."
            }
          },
          required: ["estimatedParameters"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
}
