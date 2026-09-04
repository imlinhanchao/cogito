export interface ConfigData {
  db: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    entityPrefix: string;
  };
  port: number;
  jwtSecret: string;
  salt: string;
  github: {
    clientId: string;
    clientSecret: string;
  };
  steam: {
    apiKey: string;
    mirror?: string;
  };
}

export interface ConfigStatus {
  configured: boolean;
}
