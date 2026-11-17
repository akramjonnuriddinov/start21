# One image: the Go API also serves the built Vue app and the audio.

FROM node:22-alpine AS web
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM golang:1.26-alpine AS api
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY cmd/ cmd/
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /echo-server ./cmd/server

FROM alpine:3.22
COPY --from=api /echo-server /usr/local/bin/echo-server
COPY --from=web /app/dist /srv/web
ENV STATIC_DIR=/srv/web PORT=8080
EXPOSE 8080
CMD ["echo-server"]
