# ToolSQL Update Build Guide

This guide explains how to prepare and rebuild ToolSQL for a new update.

## Quick Start: Rebuild After Update

App files updated but the .exe is old? Do this:

```bash
cd D:\1.Development\ToolSQL
node portable/build.mjs
```

Output: `portable/dist/toolsql/toolsql-win_x64.exe` and `ToolSql.Server.exe`

Then test the new .exe before distributing.

## Build Requirements

Before rebuilding, ensure you have:

- **Node.js** (v16+) — check with `node --version`
- **@neutralinojs/neu CLI** — installed globally or via `npx`
- **.NET SDK 6.0+** (for C# SQL Server component) — check with `dotnet --version`

## Scope

ToolSQL currently has 2 delivery modes:

- Static web app: open `sql-formatter.html` directly in the browser
- Portable Windows app: built through Neutralino at `portable/` (includes C# SQL Server sidecar)

## Files Commonly Updated

Most feature or UI changes happen in:

- `sql-formatter.html`
- `css/style.css`
- `js/core/script.js`
- `js/core/i18n.js`
- `js/modules/` (`bulk-update.js`, `cs-formatter.js`, `sql-comment.js`, `code-generator.js`)
- `js/modules/sql-export.js` (SQL Server export feature)
- `vendor/`

If you add a new file that the portable app needs at runtime, you must also add it to `APP_FILES` in `portable/build.mjs`.

## Before Rebuilding

1. **Commit or stash** any uncommitted changes (build script may fail otherwise).
2. **Test in browser** — Open `sql-formatter.html` directly and verify:
   - Data Formatter
   - Add Comment
   - C# Column Align
   - Bulk Update with templates
   - Theme switching (light/dark)
   - LocalStorage history persists
   - Language switching (vi/en/ko)
3. **Update `portable/build.mjs`** if you added new files:
   - New JS modules → add to `APP_FILES`
   - New CSS → add to `APP_FILES`
   - New vendor libs → add to `APP_FILES`
   - New images/icons used at runtime → add to `APP_FILES`
4. If you added **new user-facing text**, update `js/core/i18n.js` with all languages.
5. If you modified the **C# SQL Server component** (`server/ToolSql.Server/`), ensure it compiles: `dotnet build server/ToolSql.Server/ToolSql.Server.csproj`

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
cd D:\1.Development\ToolSQL
node portable/build.mjs
```

**What this script does:**

1. Copies web app files from the root into `portable/resources/`
2. Builds the Neutralino app and embeds all resources into a single `.exe`
3. Compiles the C# SQL Server sidecar component (`ToolSql.Server.exe`)
4. Cleans up intermediate files
5. Verifies both executables were created successfully

**Expected output:**

- `portable/dist/toolsql/toolsql-win_x64.exe` (main UI app, ~50-80 MB)
- `portable/dist/toolsql/ToolSql.Server.exe` (SQL Server export helper)

**Build time:** ~2–5 minutes (first run may be slower if Neutralino CLI is downloading).

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

1. **Implement the update** in the main app files.
2. **Test in browser** using `sql-formatter.html` (hard refresh: Ctrl+Shift+R).
3. **Update `portable/build.mjs`** if new runtime files were added.
4. **Run the build:** `node portable/build.mjs`
5. **Test the generated .exe:**
   - Launch `toolsql-win_x64.exe` only (ToolSql.Server.exe starts automatically with it).
   - Verify all updated features work.
   - Check theme, language, and localStorage features.
   - Re-test key flows from Step 2.
6. **Distribute the updated .exe:**
   - Replace the old `toolsql-win_x64.exe` with the new one.
   - ToolSql.Server.exe in the same folder must be present.
   - Test on a clean machine if possible to catch missing dependencies.

## Version Numbering (Optional)

If you want to track .exe versions:

1. Update a version constant in the app (e.g., `js/core/script.js` or HTML title).
2. The version is embedded at build time — no manual version file needed.
3. Neutralino and .NET will both version the .exe with Windows file properties (right-click → Properties → Details).

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npx: command not found` | Install Node.js from nodejs.org or use a terminal with Node.js in PATH |
| `dotnet: command not found` | Install .NET SDK 6.0+ from dotnet.microsoft.com |
| `@neutralinojs/neu: command not found` | Run with `npx --yes @neutralinojs/neu` or install globally: `npm install -g @neutralinojs/neu` |
| Build succeeds but .exe has old features | Check that `APP_FILES` in `portable/build.mjs` includes all your new files |
| .exe crashes immediately on launch | Test `sql-formatter.html` in browser first to isolate web app vs. Neutralino issues |
| C# SQL Server component won't compile | Run `dotnet restore server/ToolSql.Server/ToolSql.Server.csproj` first, then retry |

## Notes

- The web version has no framework and no frontend build pipeline — it runs as-is in any browser.
- The portable build depends on the files listed in `APP_FILES` inside `portable/build.mjs` — if you add a new JS/CSS/vendor file, you must add it there or it won't be embedded.
- A successful build does not automatically mean every new asset was included — always launch the .exe and verify your changes are visible.
- The SQL Server export feature (`js/modules/sql-export.js` + `ToolSql.Server.exe`) requires both the Neutralino UI and the C# sidecar to run together.
