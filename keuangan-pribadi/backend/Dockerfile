FROM node:20-alpine

WORKDIR /app

# Salin manifest dulu agar cache layer npm tetap efisien.
COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 5000
CMD ["npm", "start"]
