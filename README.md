# Angular DevTools: Making Angular Development Easier 🚀

## ✨ Our Goal: Better Developer Tools for Angular

We were inspired by the great developer experience of the **Nuxt.js DevTools**. This project brings a powerful, built-in **developer tool** right into your running Angular applications.

Angular is strong, but sometimes development can feel slow. Our purpose is simple: to help you build Angular apps faster and more effectively. This tool will give you instant, helpful information to make Angular much more **developer-friendly**.

We think key debugging and analysis tools should be available exactly where you need them—inside your app.

### Built-in plugins

- **Overview:** A built-in dashboard that displays your Angular version, component count, page count, and active plugins at a glance.

- **Components:** A live tree of every Angular component on the page. Inspect public state with signals unwrapped, see **Inputs and Outputs** in their own badged sections (both `@Input()`/`@Output()` and `input()`/`output()` styles), and **edit state inline** — strings and numbers are click-to-edit, booleans toggle with a checkbox, and writable signals go through `.set()`. Changes render in your app immediately.

- **Source Code Navigation (Open in Editor):** Click any component in your running app to instantly open its source file in your code editor (VS Code, Cursor, WebStorm, IDEA, or a custom dev-server handler).

- **Routes:** Every registered route with guards and lazy markers, the currently matched chain, one-click navigation, and an **interactive route tree** that highlights the active branch live and picks up lazily loaded child routes as the router discovers them.

- **Assets:** Every loaded image, font, script, and fetch — with type filters, previews, and where-used DOM mapping.

- **SEO:** A live social share-card preview plus tables of your Open Graph, Twitter, and general head tags, with pass/warn checks for title/description lengths, canonical URLs, missing OG tags, `lang`, viewport, and accidental `noindex`.

- **Profiler:** Record change detection to find slow spots — per-component template update counts with total/avg/max timings, app-level CD cycle stats, and highlighting for components that render slowly.

- **State:** Auto-detects **NgRx or NGXS** (no extra dependency needed), renders the current store state as an expandable tree, and logs every dispatched action with timestamps.

The dev tool also remembers its UI between reloads — toggle position, open/closed panel, panel size, and the active plugin are persisted to `localStorage`.

### On the roadmap

- **Module Discovery & Install:** Search for and install popular third-party Angular libraries right from the devtool interface.

- **Quick Actions:** Run common Angular commands (like `ng generate`) directly from the in-app interface.

## 🛠️ Getting Started

### 1. Install It

```bash
npm install ng-inapp-dev-tool --save-dev
```

Then register it in your `app.config.ts`:

```typescript
import { provideInAppDevTools } from "ng-inapp-dev-tool";

export const appConfig: ApplicationConfig = {
  providers: [
    // ...
    provideInAppDevTools({
      editor: "vscode",
      projectRoot: "/absolute/path/to/your/repo", // enables "Open in editor"
    }),
  ],
};
```

The tool only activates in dev mode (`isDevMode()`) — production builds get empty providers and zero runtime cost.

### 2. Testing Locally

To test the devtool locally in the `test-app`, you need to configure your absolute project path so the editor plugin knows where to open files.

1. Create a file named `local.config.ts` inside `projects/test-app/src/app/`. (This file is ignored by git so your path won't be exposed).
2. Inside it, export your path:
   ```typescript
   export const projectRoot = "/absolute/path/to/your/cloned/repo";
   ```
3. In `projects/test-app/src/app/app.config.ts`, uncomment the import and use it:

   ```typescript
   import { projectRoot } from "./local.config";

   // ...
   provideInAppDevTools({
     plugins: devToolPlugins,
     editor: "antigravity",
     projectRoot: projectRoot,
   });
   ```

## 🧩 Plugin Architecture

This devtool is built with extensibility in mind! If you want to contribute or build your own custom tools to integrate into the dev tool shell, please check out the [Core Documentation (Core.md)](./Core.md) for a guide on how to create and register a plugin.
