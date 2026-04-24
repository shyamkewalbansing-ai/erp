# Productie Deploy — Facturatie

## Waarom zie je de update niet na `git pull` + `yarn build`?

De app is een **PWA (Progressive Web App)** met een aggressieve service-worker cache. Zelfs na een nieuwe build blijft de browser de oude `index.html` + oude JS-bundles serveren totdat:

1. De service worker een **nieuwe `CACHE_NAME`** detecteert, **OF**
2. De browser hard ververst (Cmd+Shift+R / Ctrl+Shift+R), **OF**
3. De PWA van het beginscherm wordt verwijderd en opnieuw toegevoegd.

## Juiste deploy-volgorde

```bash
cd /home/facturatie/htdocs/facturatie.sr

# 1) Pull laatste code (bevat SW versie-bump indien nodig)
git pull

# 2) Backend herstart
supervisorctl restart facturatie-backend

# 3) Frontend build (clean build — belangrijk!)
cd frontend
rm -rf build node_modules/.cache
yarn build

# 4) Optioneel: nginx cache purgen (alleen als je custom cache-rules hebt)
# nginx -s reload

# 5) Service-worker cache-busting — BELANGRIJK
# Open in de browser: https://jouw-domain.com/?v=$(date +%s)
# Dit triggert de browser om een nieuwe SW op te halen.
```

## Hoe weet ik of mijn update live is?

```bash
# Check de service-worker cache versie in de gedeployde build
grep "CACHE_NAME" /home/facturatie/htdocs/facturatie.sr/frontend/build/service-worker.js

# Vergelijk met git HEAD
grep "CACHE_NAME" /home/facturatie/htdocs/facturatie.sr/frontend/public/service-worker.js
```

Beide moeten dezelfde versie tonen (bv. `boekhouding-v5-2026-04-24`).

## Bij elke nieuwe deploy

**Update `CACHE_NAME` in `/frontend/public/service-worker.js`** naar een nieuwe unieke string (bv. datum prefix). Dit zorgt dat:

1. Alle bestaande clients de oude cache invalideren
2. Service worker `activate` event verwijdert oude cache entries
3. Gebruikers krijgen automatisch de nieuwe versie bij volgende pagina-load

## Nginx headers (aanbevolen)

Voor `service-worker.js` NOOIT cachen in nginx:

```nginx
location = /service-worker.js {
    add_header Cache-Control "public, max-age=0, must-revalidate";
    add_header Pragma "no-cache";
    expires 0;
}
```

Voor `/static/*` (hashed filenames) JUIST wel lang cachen:

```nginx
location /static/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```
