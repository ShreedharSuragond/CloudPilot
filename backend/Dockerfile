FROM cgr.dev/chainguard/go:latest AS build
ARG APP=api
WORKDIR /src
COPY go.mod go.sum ./
COPY . ./
RUN go mod download
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/cloudpilot ./cmd/${APP}

FROM scratch
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /out/cloudpilot /usr/local/bin/cloudpilot
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/cloudpilot"]
