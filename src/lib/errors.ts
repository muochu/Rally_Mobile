export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

export const reportError = (
  _error: unknown,
  _context?: Record<string, unknown>,
): void => {
  return;
};
