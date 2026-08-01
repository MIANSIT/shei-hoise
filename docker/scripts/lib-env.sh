# Sourced (not executed) by the other scripts. Resolves which environment to
# target from the caller's $1 ("dev" default, or "prod") and sets:
#   ENV_NAME, ENV_FILE (absolute path), COMPOSE (docker compose command prefix)
#
# Caller must already have DOCKER_DIR set.

ENV_NAME="${1:-dev}"
case "$ENV_NAME" in
  dev)
    ENV_FILE="$DOCKER_DIR/.env"
    COMPOSE_FILES="-f $DOCKER_DIR/docker-compose.yml -f $DOCKER_DIR/docker-compose.dev.yml"
    ;;
  prod)
    ENV_FILE="$DOCKER_DIR/.env.prod"
    COMPOSE_FILES="-f $DOCKER_DIR/docker-compose.yml"
    ;;
  *)
    echo "Usage: $0 [dev|prod]  (default: dev)" >&2
    exit 1
    ;;
esac

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found. Copy it from $(basename "$ENV_FILE").example first." >&2
  exit 1
fi

COMPOSE="docker compose $COMPOSE_FILES --env-file $ENV_FILE"
