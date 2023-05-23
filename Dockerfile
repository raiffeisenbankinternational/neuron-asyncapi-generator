FROM artifacts.rbi.tech/docker/node:16 as builder

COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json
COPY ./lib /app/lib

WORKDIR /app

RUN npm install && npm run package

FROM artifacts.rbi.tech/docker/node:16-alpine

COPY --from=builder /app/dist ./dist

RUN npm config set registry https://artifacts.rbi.tech/artifactory/api/npm/npm-group/ && \
    npm install --prefix=dist --no-save --no-package-lock @npmcli/run-script typescript

ENTRYPOINT [ "node", "/dist/index.js" ]
