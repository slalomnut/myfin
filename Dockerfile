# Stage 1: Use yarn to build the app
VITE_MYFIN_BASE_API_URL=https://myfin.apps.os-prd.cjgolden.net
FROM quay.io/evanshortiss/s2i-nodejs-nginx as builder
COPY * ./
RUN npm install
RUN npm run build
EXPOSE 8443
