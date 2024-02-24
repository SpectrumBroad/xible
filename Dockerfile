# syntax=docker/dockerfile:1

FROM node:20

EXPOSE 9600

# copy
WORKDIR /app
COPY ["package.json", "package-lock.json", "routes.js", "index.js", "config.json", "child.js", "./"]
COPY ["./app", "./app"]
COPY ["./bin", "./bin"]
COPY ["./editor", "./editor"]

# install
RUN npm ci --omit=dev

# run
ENTRYPOINT [ "node", "./bin/xible.js", "server", "start" ]
