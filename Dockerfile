# ─── Stage 1: build the CRA app to static assets (OFFLINE) ───────────────────
# The build network can't reach the npm registry reliably, so we do NOT run
# `npm ci`. Instead we reuse the node_modules shipped in the build context
# (see .dockerignore, which deliberately does NOT ignore node_modules).
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
# CI unset => react-scripts does not treat lint warnings as errors.
RUN npm run build

# ─── Stage 2: lightweight nginx runner ───────────────────────────────────────
# Serves the static build and reverse-proxies /api to the management backend.
FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 6060
CMD ["nginx", "-g", "daemon off;"]
