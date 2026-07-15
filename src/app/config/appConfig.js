import { APP_NAME, APP_VERSION } from '../../config/appSettings';

export const appConfig = {
  name: APP_NAME,
  version: APP_VERSION,
  environment: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === 'production',
};

export default appConfig;
