# Stage 1: Use yarn to build the app
FROM quay.io/evanshortiss/s2i-nodejs-nginx as builder
ENV VITE_MYFIN_BASE_API_URL=https://myfin.apps.os-prd.cjgolden.net
COPY . .
EXPOSE 8443
RUN npm install
RUN npm run build
