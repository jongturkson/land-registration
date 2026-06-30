import 'dotenv/config';

export const env = {
  port: process.env['PORT'] ?? '3000',
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  jwtAccessSecret: process.env['JWT_ACCESS_SECRET'] ?? '',
  jwtRefreshSecret: process.env['JWT_REFRESH_SECRET'] ?? '',
  publicAppUrl: process.env['PUBLIC_APP_URL'] ?? 'http://localhost:5174',
} as const;
