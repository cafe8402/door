import { createApiMiddleware } from './api.mjs';
export default function scannerApiPlugin() {
  return {
    name: 'mundansok-url-scanner',
    configureServer(server) { server.middlewares.use(createApiMiddleware()); },
    configurePreviewServer(server) { server.middlewares.use(createApiMiddleware()); },
  };
}
