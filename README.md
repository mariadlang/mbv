# My Best Version Planner

Aplicación web local-first para convertir visión personal en metas, hábitos, acciones semanales y reflexión diaria. Está diseñada para acompañar sin culpa: los días no programados no penalizan la constancia y los pendientes vencidos pueden reprogramarse.

## Stack

- React 19 + TypeScript + vinext
- React Router para navegación de la SPA
- Dexie/IndexedDB como persistencia local
- React Hook Form + Zod para formularios y backups
- Zustand para estado de interfaz
- Recharts y Lucide para visualización e iconografía
- Vitest y Playwright para pruebas

## Desarrollo

Requiere Node.js 22.13 o superior y pnpm.

```bash
pnpm install
pnpm dev
```

La app queda disponible en `http://localhost:3000`. Para verificar antes de publicar:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

## Datos y privacidad

No se requiere cuenta ni servidor. Toda la información se guarda en IndexedDB dentro del navegador del dispositivo. Ajustes permite exportar un backup JSON, validarlo al importarlo y borrar todos los datos locales.

La separación UI → hook → servicio → repositorio permite sustituir IndexedDB por Supabase sin reescribir las pantallas. Consulta [docs/architecture](docs/architecture/architecture.md) y [docs/decisions](docs/decisions/0001-local-first.md).

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
