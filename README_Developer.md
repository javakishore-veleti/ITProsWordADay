# README Developer

## Start the app

1. Install portal dependencies:

npm --prefix Portals/EnglishWordADayPortal install

2. Start backend and frontend together from repo root:

npm start

3. Open the app:

http://localhost:3000

## Stop the app

1. Stop backend and frontend:

npm run stop

## Restart the app

1. Restart backend and frontend:

npm run restart

## If lock or port issues happen

1. Force clean stale processes and locks:

npm run stop && lsof -ti :3001 | xargs kill -9 2>/dev/null || true && pkill -f "next dev" || true && pkill -f "go run main.go" || true

2. Remove Next.js dev lock and start again:

rm -f Portals/EnglishWordADayPortal/.next/dev/lock && npm start
