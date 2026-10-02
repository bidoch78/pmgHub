FROM node:22-alpine

WORKDIR /app

COPY simulator/package*.json ./simulator/
RUN cd simulator && npm install --save-dev nodemon

COPY simulator ./simulator
COPY web ./web

WORKDIR /app/simulator

EXPOSE 3000

CMD ["npm", "run", "dev"]
