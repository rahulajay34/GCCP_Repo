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

  /**
   * Retry wrapper with exponential backoff for transient API errors
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    signal?: AbortSignal
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Check abort signal before each attempt
      if (signal?.aborted) {
        throw new Error('Aborted');
      }

      try {
        return await fn();
      } catch (err: any) {
        lastError = err;

        // Don't retry on abort
        if (err?.name === 'AbortError' || signal?.aborted) {
          throw err;
        }

        // Retry on rate limits (429) or server errors (5xx)
        const status = err?.status || err?.response?.status;
        if (status === 429 || (status >= 500 && status < 600)) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          console.warn(`API error (${status}), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // Don't retry other errors (auth, bad request, etc.)
        throw err;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  async generate(params: {
    system: string;
    messages: Anthropic.MessageParam[];
    model: string;
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
  }) {
    return this.withRetry(
      () => this.client.messages.create({
        model: params.model,
        max_tokens: params.maxTokens || 8096,
        messages: params.messages,
        system: params.system,
        temperature: params.temperature || 0.7,
      }, { signal: params.signal }),
      3,
      params.signal
    );
  }

  async *stream(params: {
    system: string;
    messages: Anthropic.MessageParam[];
    model: string;
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
  }) {
    // For streaming, we wrap just the initial connection in retry logic
    const stream = await this.withRetry(
      () => this.client.messages.create({
        model: params.model,
        max_tokens: params.maxTokens || 8096,
        messages: params.messages,
        system: params.system,
        temperature: params.temperature || 0.7,
        stream: true,
      }, { signal: params.signal }),
      3,
      params.signal
    );

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }
}
