FROM denoland/deno:distroless AS build_static

WORKDIR /app
USER root

# install deps
COPY ./deno.jsonc ./deno.jsonc
RUN ["deno", "install"]

# compile static
COPY ./src ./src
COPY ./static ./static
COPY ./scripts ./scripts
RUN ["deno", "task", "install_deps"]
# RUN ["deno", "cache", "main.ts"]

# ==============================================================================
# the runtime
FROM denoland/deno:distroless
WORKDIR /app
USER root

# The port that your application listens to.

COPY ./deno.jsonc ./deno.jsonc
COPY --from=build_static /app/dist ./dist
COPY ./server ./server

RUN ["deno", "cache", "./server/api.ts"]

EXPOSE 18970
CMD ["serve", "--allow-read=dist", "--port", "18970", "./server/api.ts"]

# docker buildx build -t dglab_coyote_remote . && docker run -p 18970:18970 -it --rm dglab_coyote_remote