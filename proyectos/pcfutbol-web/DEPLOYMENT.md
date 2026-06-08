# Deployment

Firebase Hosting uses separate targets for pre-production and production.

- Pre-production: https://pcgaffer-preprod.web.app
- Production: https://pcgaffer.com and https://pcfutbol-web.web.app

Normal flow:

1. Run the build and production-readiness audits.
2. Deploy to pre-production with `npm run deploy:preprod`.
3. QA the pre-production URL.
4. Deploy production only after explicit approval with `npm run deploy:production`.
