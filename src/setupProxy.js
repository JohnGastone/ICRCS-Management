const { createProxyMiddleware } = require('http-proxy-middleware');

// Dev-only. Create React App's dev server (`npm start`) auto-loads this file —
// no import needed. It forwards the same-origin `/api/*` calls the app makes to
// the real management backend, mirroring what nginx does in the Docker build
// (see nginx.conf). Without it, `/api/v1/*` would hit the dev server itself and
// return index.html / 404, so login would be "denied" even with valid creds.
//
// Backend base is http://10.232.0.12:3231/api ; the app requests /api/v1/... so
// the target host below (no /api suffix) yields http://10.232.0.12:3231/api/v1/...
module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://10.232.0.12:3231',
      changeOrigin: true,
    })
  );
};
