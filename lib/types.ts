export type Role = 'system' | 'user' | 'assistant';
export type Message = { role: Role; content: string };

export type ChatRequest = {
  messages: Message[];
  model?: string;
  temperature?: number;
  webAssist?: boolean;
  ollamaBase?: string;
};
