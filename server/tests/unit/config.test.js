// config.js validates JWT_SECRET when it is loaded, so each case loads a fresh copy.
function loadConfigWith(secret) {
  const saved = process.env.JWT_SECRET;
  if (secret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = secret;
  try {
    let config;
    jest.isolateModules(() => {
      // Don't let dotenv refill JWT_SECRET from the real .env file.
      jest.doMock('dotenv', () => ({ config: () => ({}) }));
      config = require('../../src/config');
    });
    return config;
  } finally {
    process.env.JWT_SECRET = saved;
  }
}

describe('config JWT_SECRET check', () => {
  it.each([
    [undefined, 'is not set'],
    ['', 'is not set'],
    ['short-but-random-9f8e7d', 'shorter than 32'],
    ['change-me-to-a-long-random-string-xyz', 'placeholder'],
    ['dev-only-secret-dev-only-secret-dev-only', 'placeholder'],
  ])('refuses to start with %p', (secret, message) => {
    expect(() => loadConfigWith(secret)).toThrow(message);
  });

  it('accepts a long random secret', () => {
    const secret = 'a3f1c9e07b2d4f6a8c0e1b3d5f7a9c2e4b6d8f0a1c3e5b7d9f';
    expect(loadConfigWith(secret).jwtSecret).toBe(secret);
  });
});
