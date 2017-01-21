FROM node:6.9.4-alpine

ADD . /app

WORKDIR /app

RUN npm install --production

ENV DEBUG igint-scrape:*

EXPOSE 3000

ENTRYPOINT ["node", "index.js"]
