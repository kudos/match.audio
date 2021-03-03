FROM node:14.2.0

ENV PATH="/app/node_modules/.bin:${PATH}"

WORKDIR /app

COPY package.json package.json
COPY yarn.lock yarn.lock

RUN yarn

COPY . .

RUN yarn run build

ENV PORT 3000
EXPOSE 3000

CMD ["yarn", "start"]
