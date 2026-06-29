.PHONY: up down build logs certs seed lint test
up:        ; docker compose up --build
down:      ; docker compose down -v
build:     ; docker compose build
logs:      ; docker compose logs -f
certs:     ; ./deploy/scripts/gen-certs.sh
seed:      ; docker compose exec api npm run seed
lint:      ; cd apps/api && npm run lint && cd ../web && npm run lint
test:      ; cd apps/api && npm test
