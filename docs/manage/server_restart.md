ssh -i ~/.ssh/gda-ce01 azlan@34.124.244.233

cd /var/www/baligirls

pnpm install

# Build API (tsc) and web-vite app
pnpm --filter @ascortbali/api build
cd app/web-vite && pnpm build && cd ../..

# Restart active PM2 processes (Vite SSR web + Express API)
pm2 restart baligirls-api baligirls-web-vite --update-env

pm2 save

# Notes:
# - baligirls-web (legacy Next.js) is stopped and no longer served.
# - Web app runs on port 8002 (Vite SSR + Express).
# - API runs on port 8001.