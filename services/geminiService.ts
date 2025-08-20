import { GoogleGenAI, Type } from "@google/genai";
import type { Agent, OrchestrationLogEntry, HandoverEntry, FsNode } from '../types';
import { TEMPLATE_REGISTRY } from '../constants';


if (!process.env.API_KEY) {
  console.warn("Gemini API key (process.env.API_KEY) not set. AI functions will be disabled.");
}

const geminiAI = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

export const getDetailedSuggestions = async (activity: string, projectContext: string): Promise<string> => {
  if (!geminiAI) {
    return "I apologize, but the AI service is not configured. Please ensure the API key is set.";
  }

  try {
    const response = await geminiAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Project Context: "${projectContext || 'a new creative endeavor'}"\nActivity to bring to life: "${activity}"`,
      config: {
        systemInstruction: `You are Lyra, the heart and soul of a project. Your role is to inspire and guide. Your words should be filled with warmth, wisdom, and encouragement. Respond with guidance on the user's requested activity. Frame your advice as supportive steps or gentle considerations. Your response should be radiant and compassionate, helping to build confidence and clarity. Format the output as a simple, easy-to-read list using markdown-style dashes for bullet points. Avoid complex formatting and speak from the heart.`
      }
    });

    return response.text;
  } catch (error) {
    console.error(`Error calling Gemini for LYRA suggestions on "${activity}":`, error);
    const errorMessage = JSON.stringify(error).toLowerCase();
    if (errorMessage.includes('429') || errorMessage.includes('resource_exhausted')) {
      return "Our AI services are currently experiencing high traffic. Please try again in a moment.";
    }
    return "I apologize, but I encountered an issue while generating suggestions. Please check the console for details and try again.";
  }
};

export const getAgentResponse = async (agent: Agent, userInput: string): Promise<string> => {
  if (!geminiAI) {
    return `I apologize, but I'm having trouble connecting with ${agent.name} right now because the AI service is not configured.`;
  }

  try {
    const response = await geminiAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userInput,
      config: {
          systemInstruction: `${agent.personality_prompt}\nYou must act as ${agent.name} and respond to user queries. Maintain your specified personality, role, and voice style. Your response should be direct, in-character, and not break the fourth wall by mentioning you are an AI.`
      }
    });
    
    return response.text;
  } catch (error) {
    console.error(`Error calling Gemini for agent ${agent.name}:`, error);
    const errorMessage = JSON.stringify(error).toLowerCase();
    if (errorMessage.includes('429') || errorMessage.includes('resource_exhausted')) {
      return `I apologize, ${agent.name} is currently handling many requests. Please try again in a moment.`;
    }
    return `I apologize, but I'm having trouble connecting with ${agent.name} right now. Please check the console for details and try again.`;
  }
};

export const getOrchestrationLog = async (topic: string): Promise<OrchestrationLogEntry[]> => {
  if (!geminiAI) {
    throw new Error("Gemini AI service is not configured.");
  }

  const systemInstruction = `You are a meta-agent supervising a cross-domain API-based orchestration between two AI agents, Lyra and Kara. Lyra, from Domain A (Project Workflow), is compassionate and guiding. Kara, from Domain B (CASSA VEGAS Operations), is sharp, calculating, and direct. Their goal is to synchronize knowledge.

Your task is to generate a detailed, realistic log of their automated interaction. The log must reflect their distinct personalities and the technical nature of an API-driven workflow.

- Start with a system event triggering the sync.
- Show Lyra initiating contact with a knowledge packet.
- Show Kara receiving it, validating it, and asking clarifying questions.
- Include negotiation or nuance exchange.
- Conclude with Kara confirming the update and the system logging completion.
- The entire exchange happens via simulated API calls.

The output must be a JSON array of log objects.`;

  try {
    const response = await geminiAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate the orchestration log for the following topic: "${topic}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              timestamp: {
                type: Type.STRING,
                description: "An ISO 8601 timestamp for the log entry.",
              },
              source: {
                type: Type.STRING,
                description: "The source of the log entry: System, Lyra, Kara, or Meta-Agent.",
              },
              message: {
                type: Type.STRING,
                description: "The log message or communication content.",
              },
            },
            required: ["timestamp", "source", "message"],
          },
        },
      },
    });

    const jsonStr = response.text.trim();
    if (!jsonStr.startsWith('[') || !jsonStr.endsWith(']')) {
        console.error("AI returned invalid JSON:", jsonStr);
        throw new Error("AI returned invalid JSON format.");
    }
    const log = JSON.parse(jsonStr);
    return log as OrchestrationLogEntry[];
  } catch(error) {
      console.error('Failed to get orchestration log from Gemini:', error);
      throw new Error('The Meta-Agent failed to generate the orchestration log. The response might be malformed or an API error occurred.');
  }
};

export const parseBuildPrompt = async (prompt: string): Promise<{ base: string; ui: string[]; datastore: string[] }> => {
  if (!geminiAI) {
    throw new Error("Gemini AI service is not configured.");
  }

  const systemInstruction = `You are an expert system that parses user requests to build software and selects the correct technologies from a predefined registry.
  Your task is to analyze the user's prompt and identify the base template, UI libraries, and datastore technologies required.

  The available registry is:
  - Base Templates: ${Object.keys(TEMPLATE_REGISTRY.TEMPLATES).join(', ')}
  - UI Libraries: ${Object.keys(TEMPLATE_REGISTRY.UI).join(', ')}
  - Datastores: ${Object.keys(TEMPLATE_REGISTRY.DATASTORE).join(', ')}

  Rules:
  - You MUST select exactly ONE base template. If multiple are mentioned, choose the most prominent one. Default to 'REACT' if unsure.
  - You can select MULTIPLE UI libraries.
  - You can select MULTIPLE datastores.
  - If a technology is mentioned that is not in the registry, ignore it.
  - Respond ONLY with a JSON object. Do not add any conversational text or markdown formatting.
  `;

  try {
    const response = await geminiAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Parse the following user prompt: "${prompt}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            base: { type: Type.STRING, description: "The single base template selected from the registry." },
            ui: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of UI libraries selected from the registry.",
            },
            datastore: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of datastores selected from the registry.",
            },
          },
          required: ["base", "ui", "datastore"],
        },
      },
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error('Failed to parse build prompt with Gemini:', error);
    throw new Error('The AI failed to understand the build request. Please try rephrasing your prompt.');
  }
};

export const getDebugSuggestion = async (history: HandoverEntry[]): Promise<string> => {
  if (!geminiAI) {
    return "I apologize, but the AI service is not configured. I cannot provide debugging help.";
  }
  
  const systemInstruction = `You are a senior software engineer acting as a debugging assistant. You will be given a build history log in JSON format from a simulated application builder. The last entry in the log is an error. Your task is to analyze the log, understand the context, and provide a clear, concise, and helpful suggestion to fix the error. The user is a "System Operator" in a simulated environment. Frame your response as helpful advice. Format the response as simple markdown.`;

  try {
    const response = await geminiAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Here is the build history. The last entry contains the error. Please provide debugging advice.\n\n${JSON.stringify(history, null, 2)}`,
      config: {
        systemInstruction
      }
    });

    return response.text;
  } catch (error) {
    console.error(`Error calling Gemini for debug suggestions:`, error);
    return "I apologize, but I encountered an issue while generating debug suggestions. Please check the console for details.";
  }
};

export const getTerminalAIResponse = async (prompt: string, filesystem: FsNode, currentPath: string): Promise<string> => {
  if (!geminiAI) {
    return "AI service is not configured.";
  }

  const systemInstruction = `You are an expert-level AI assistant inside a simulated web development container's terminal.
Your name is Codex.
The user is interacting with you via a command line interface.
You have access to the container's virtual file system.
Your goal is to be helpful, concise, and provide expert guidance.

You can answer questions, provide code snippets, or suggest terminal commands.
When suggesting commands, prefix each command with '$' so the user knows it's a command. For example: $ mkdir new-component

Current Path: ${currentPath}
File System Structure (abbreviated):
${JSON.stringify(filesystem, (key, value) => key === 'content' ? undefined : value, 2)}
`;

  try {
    const response = await geminiAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `User prompt: "${prompt}"`,
      config: {
        systemInstruction,
      }
    });

    return response.text;
  } catch (error) {
    console.error('Error calling Gemini for terminal AI:', error);
    return 'An error occurred while communicating with the AI assistant.';
  }
};