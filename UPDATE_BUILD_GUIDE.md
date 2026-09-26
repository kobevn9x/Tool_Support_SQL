# ToolSQL Update Build Guide

This guide explains how to prepare and rebuild ToolSQL for a new update.

## Scope

ToolSQL currently has 2 delivery modes:

- Static web app: open `sql-formatter.html` directly in the browser
- Portable Windows app: built through Neutralino at `portable/`

## Files Commonly Updated

Most feature or UI changes happen in:

- `sql-formatter.html`
- `css/style.css`
- `js/core/script.js`
- `js/core/i18n.js`
- `js/modules/` (`bulk-update.js`, `cs-formatter.js`, `sql-comment.js`, `code-generator.js`)
- `vendor/`

If you add a new file that the portable app needs at runtime, you must also add it to `APP_FILES` in `portable/build.mjs`.

## Before Rebuilding

1. Make code changes in the main app files.
2. If you add new user-facing text, update `js/core/i18n.js`.
3. If you add a new runtime asset, update `portable/build.mjs` so it gets copied into `portable/resources/`.
4. Open `sql-formatter.html` in a browser and verify the change manually.
5. Re-check key flows:
   - Data Formatter
   - Add Comment
   - C# Column Align
   - Theme switching
   - LocalStorage-based history/settings

## Rebuild The Static Web Version

There is no compile step for the web version.

To validate the latest update:

1. Save the changed files.
2. Open `sql-formatter.html` in Chrome, Edge, or Firefox.
3. Hard refresh the page to avoid stale cached JS/CSS.
4. Verify the updated behavior.

## Rebuild The Portable App

The repository includes a build script:

```bash
node portable/build.mjs
```

What this script does:

1. Deletes and recreates `portable/resources/`
2. Copies required web files into `portable/resources/`
3. Runs Neutralino build with embedded resources
4. Verifies the output executable exists

Expected output:

- `portable/dist/toolsql/toolsql-win_x64.exe`
- `portable/dist/toolsql/ToolSql.Server.exe`

## Portable Build Checklist

Before running the build:

1. Confirm Node.js is available.
2. Confirm the files required by the app are listed in `portable/build.mjs`.
3. Confirm your latest edits are saved.

After running the build:

1. Check that `portable/dist/toolsql/toolsql-win_x64.exe` and `ToolSql.Server.exe` were generated in the same folder.
2. Launch `toolsql-win_x64.exe` only. The SQL Export API starts with the window and stops when it closes.
3. Verify the updated UI and behavior inside the portable app, including SQL Server Export.
4. Re-test the same flows you checked in the browser.

## When You Add New Files

If a new update introduces files such as:

- new JS files
- new CSS files
- new vendor libraries
- new images/icons used by the app

then update this array in `portable/build.mjs`:

```js
const APP_FILES = [
  'sql-formatter.html',
  'css/style.css',
  'js/core/script.js',
  'js/core/i18n.js',
  'js/modules/bulk-update.js',
  'js/modules/cs-formatter.js',
  'js/modules/sql-comment.js',
  'js/modules/code-generator.js',
  'js/modules/sql-export.js',
  'js/modules/sql-server-sidecar.js',
  'js/neutralino.js',
  'vendor/bwip-js-min.js',
  'vendor/LICENSE.bwip-js.txt',
];
```

If the file is not listed there, the portable build may succeed but the app can break at runtime because the resource was never embedded.

## Recommended Release Flow

1. Implement the update.
2. Test in browser using `sql-formatter.html`.
3. Update `portable/build.mjs` if new runtime files were added.
4. Run `node portable/build.mjs`.
5. Test the generated `.exe`.
6. Package or distribute the updated build.

## Notes

- The web version has no framework and no frontend build pipeline.
- The portable build depends on the files copied into `portable/resources/`.
- A successful portable build does not guarantee that every new runtime asset was included, so always test the generated app after build.
