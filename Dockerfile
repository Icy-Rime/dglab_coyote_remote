ARG DENO_IMAGE_VERSION=2.9.1
ARG BASE_DENO_IMAGE=hub.1panel.dev/denoland/deno:distroless-$DENO_IMAGE_VERSION

FROM $BASE_DENO_IMAGE AS build_static
WORKDIR /app
USER root
ENV NPM_CONFIG_REGISTRY="https://registry.npmmirror.com"

# install deps
COPY ./deno.jsonc ./deno.jsonc
RUN ["deno", "install"]
COPY ./scripts/install_esbuild.ts ./scripts/install_esbuild.ts
RUN ["deno", "task", "install_deps"]

# compile static
COPY ./src ./src
COPY ./static ./static
COPY ./scripts ./scripts
RUN ["deno", "task", "release"]

# ==============================================================================
# the runtime
FROM $BASE_DENO_IMAGE
WORKDIR /app
USER root
ENV NPM_CONFIG_REGISTRY="https://registry.npmmirror.com"

COPY ./deno.jsonc ./deno.jsonc
COPY ./server ./server
RUN ["deno", "install", "-e", "./server"]
COPY --from=build_static /app/dist ./dist

# The port that your application listens to.
EXPOSE 18970
CMD ["serve", "--allow-read=dist", "--allow-env=SL_REQUEST_SIGN_KEY,ALLOW_SL_USER_AGENT_PART,SL_ADMIN_LIST", "--port", "18970", "./server/api.ts"]

# docker buildx build -t dglab_coyote_remote . && docker run -p 18970:18970 -it --rm dglab_coyote_remote
# podman build -t dglab_coyote_remote . && podman run -p 18970:18970 -it --rm dglab_coyote_remote
