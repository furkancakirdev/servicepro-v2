# Dependency Notes

## Part 12 alignment

- Removed `@tailwindcss/postcss` because the project remains on Tailwind CSS v3 and uses the classic PostCSS plugin configuration.
- Pinned `tailwindcss` to `^3.4.17` to stay on the stable v3 line.
- Pinned `next-auth` to `5.0.0-beta.25` and `@auth/prisma-adapter` to `2.11.1` to avoid drift during clean installs.
- Removed `tw-animate-css` because it targets Tailwind CSS v4.

## Animation replacement

- `tw-animate-css` utility classes were replaced with the repo's existing Tailwind animation tokens from Part 11:
  - `animate-fade-in`
  - `animate-fade-in-scale`
- This keeps dialogs, menus, selects, and login alerts animated without depending on Tailwind v4-only utilities.

## PostCSS status

- `postcss.config.mjs` already matches the Tailwind v3 setup:
  - `tailwindcss`
  - `autoprefixer`
