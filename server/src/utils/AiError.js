// An AI failure with a short code. Never carries the key or the complaint text.
export class AiError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.name = 'AiError';
    this.code = code;
  }
}