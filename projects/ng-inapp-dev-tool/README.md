# ng-inapp-dev-tool

In-app developer tools for Angular — inspect components, routes, signals, and assets directly inside your running app. Inspired by [Nuxt DevTools](https://devtools.nuxt.com).

The dev tool mounts itself into your app at startup, gates on `isDevMode()`, and is tree-shaken out of production builds. Zero runtime cost when shipped.

## Install

```bash
npm install ng-inapp-dev-tool --save-dev
```

Requires **Angular 19.2+**. Peer dependencies: `@angular/common`, `@angular/core`, `@angular/router`, `@angular/platform-browser`.

## Usage

Add `provideInAppDevTools()` to your application config:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideInAppDevTools } from 'ng-inapp-dev-tool';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideInAppDevTools({
      editor: 'vscode',
      projectRoot: '/absolute/path/to/your/repo',
    }),
  ],
};
```

That's it. Run `ng serve` and a draggable toggle button appears in the bottom-right corner. Click it to open the dev panel.

## Configuration

```ts
provideInAppDevTools({
  plugins?: Plugin[];           // your custom plugins (built-ins are always added)
  editor?: string | false;      // 'vscode' | 'code' | 'cursor' | 'webstorm' | 'idea' | string | false
  projectRoot?: string;         // absolute filesystem path of your project root
});
```

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `plugins` | `Plugin[]` | `[]` | Custom plugins. Built-ins are always merged in; user plugins with a colliding name are dropped. |
| `editor` | `string \| false` | `'vscode'` | Used by "Open in editor" actions. URL-scheme editors (`vscode`, `code`, `cursor`, `webstorm`, `idea`) work out of the box. Any other value falls back to `fetch('/__open-in-editor?file=...')`, which requires your dev server to expose that endpoint (e.g. via [`launch-editor-middleware`](https://github.com/yyx990803/launch-editor)). Set to `false` to disable open-in-editor entirely. |
| `projectRoot` | `string` | — | Absolute filesystem path of your repo. Required for "Open in editor" — the library composes `${projectRoot}/${componentFilePath}` into the editor URL. |

> **Tip on `projectRoot`:** keep it out of source control. Create a gitignored `local.config.ts` that exports `projectRoot` and import it from `app.config.ts`. See the workspace's test app for an example pattern.

## Built-in plugins

| Plugin | What it does |
| --- | --- |
| **Overview** | Landing dashboard with Angular version, plugin count, and an at-a-glance app summary. |
| **Components** | Live tree of every Angular component on the page. Inspect state, unwrap signals (signals are auto-detected via `isSignal()` and rendered as their underlying value), and jump to source. Hover a node to outline its host element in the page. |
| **Routes** | Every registered route, the active match (parameter-aware), guards, and lazy chunks. One-click navigation for static routes; parameterized routes are flagged and disabled. |
| **Assets** | Every loaded image, font, script, stylesheet, and fetch — sourced from the Performance API with live updates via `PerformanceObserver`. Type filters, image previews, and on-demand DOM scanning to find which elements reference each asset. |
| **Inspector** | Point-and-click any element in the page to reveal its component name and source path. Walk up to the parent component, copy a precise selector + component tree (great for pasting into AI agents), or jump to source. |

## Custom plugins

A plugin is just an Angular component plus a name and an icon. See [Core.md](https://github.com/abdhulla-k/NG-INAPP-DEVTOOL/blob/main/Core.md) for the full guide.

```ts
import { Plugin } from 'ng-inapp-dev-tool';
import { MyToolComponent } from './my-tool.component';

const myPlugin: Plugin = {
  name: 'My Tool',
  icon: '<svg ...>...</svg>',
  order: 10,
  component: MyToolComponent,
};

provideInAppDevTools({
  plugins: [myPlugin],
});
```

## Production behavior

- The provider returns empty providers when `isDevMode()` is false — no runtime cost.
- The shell only mounts in browser environments (gated on `isPlatformBrowser`), so SSR isn't affected.
- All CSS variables are namespaced with `--ngidt-*` so the dev tool's styling can never collide with your design system.

## License

MIT
