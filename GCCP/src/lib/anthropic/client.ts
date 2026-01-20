import Anthropic from '@anthropic-ai/sdk';

export class AnthropicClient {
  private client: Anthropic;
  private apiKey: string;

  constructor(apiKey?: string) {
    // Prioritize passed key (if admin sets specific one), otherwise use env
    const key = apiKey || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;

    if (!key) {
      throw new Error('API Key is missing. Please set NEXT_PUBLIC_ANTHROPIC_API_KEY in .env.local');
    }
    this.apiKey = key;
    this.client = new Anthropic({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true // Required for client-side usage
    });
  }

  async generate(params: {
    system: string;
    messages: Anthropic.MessageParam[];
    model: string;
    maxTokens?: number;
    temperature?: number;
  }) {
    return this.client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens || 4096,
      messages: params.messages,
      system: params.system,
      temperature: params.temperature || 0.7,
    });
  }

  async *stream(params: {
    system: string;
    messages: Anthropic.MessageParam[];
    model: string;
    maxTokens?: number;
    temperature?: number;
  }) {
    const stream = await this.client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens || 4096,
      messages: params.messages,
      system: params.system,
      temperature: params.temperature || 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }
}
