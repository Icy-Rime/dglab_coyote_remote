ARG DENO_IMAGE_VERSION=2.6.8
ARG BASE_DENO_IMAGE=hub.1panel.dev/denoland/deno:distroless-$DENO_IMAGE_VERSION

FROM $BASE_DENO_IMAGE AS build_static
WORKDIR /app
USER root
ENV NPM_CONFIG_REGISTRY="https://registry.npmmirror.com"

# install deps
COPY ./deno.jsonc ./deno.jsonc
RUN ["deno", "install"]
COPY ./scripts/build.ts ./scripts/build.ts
RUN ["deno", "task", "install_deps"]

# compile static
COPY ./src ./src
COPY ./static ./static
COPY ./scripts ./scripts
RUN ["deno", "task", "docker_build"]

# ==============================================================================
# the runtime
FROM $BASE_DENO_IMAGE
WORKDIR /app
USER root
ENV NPM_CONFIG_REGISTRY="https://registry.npmmirror.com"

COPY ./deno.jsonc ./deno.jsonc
COPY ./server ./server
RUN ["deno", "cache", "./server/api.ts"]
COPY --from=build_static /app/dist ./dist

# The port that your application listens to.
EXPOSE 18970
CMD ["serve", "--allow-read=dist,datakv.db", "--allow-write=datakv.db", "--allow-env", "--port", "18970", "./server/api.ts"]

# docker buildx build -t dglab_coyote_remote . && docker run -p 18970:18970 -it --rm dglab_coyote_remote
# podman build -t dglab_coyote_remote . && podman run -p 18970:18970 -it --rm dglab_coyote_remote
