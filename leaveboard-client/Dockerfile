# syntax=docker/dockerfile:1

FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Pass the Vite public env var at build time
ARG VITE_BASE_URL
ENV VITE_BASE_URL=${VITE_BASE_URL}

RUN npm run build

EXPOSE 7091

# Use vite preview to serve the built app on port 7091
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "7091"]
