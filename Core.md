# Core Architecture and Plugin Development

Welcome to the core documentation for Angular DevTools! This project is designed with a **plugin-based architecture**, allowing developers to easily extend its functionality without modifying the core system.

## How the Plugin System Works

The dev tool shell is designed to be a dashboard that renders different tools as plugins. A plugin simply consists of an Angular Component and a unique name.

The core interface for a plugin is defined as follows:

```typescript
import { Type } from "@angular/core";

export interface Plugin {
  // A unique name for your plugin
  name: string;

  // The Angular component that will be rendered inside the dev tool
  component: Type<any>;
}
```

## Creating Your Own Plugin

Follow these steps to create a custom plugin for the Angular Dev Tool:

### 1. Create a Component

First, generate a standard Angular component that will serve as the UI for your tool:

```bash
ng generate component my-custom-tool
```

Inside your component, you can use any Angular features, inject services, and manage state as you normally would.

```typescript
import { Component } from "@angular/core";

@Component({
  selector: "app-my-custom-tool",
  standalone: true,
  template: `
    <div class="plugin-container">
      <h2>My Custom Tool</h2>
      <p>This is a custom plugin running inside the Angular Dev Tool!</p>
      <button (click)="doSomething()">Click Me</button>
    </div>
  `,
})
export class MyCustomToolComponent {
  doSomething() {
    console.log("Action from custom plugin!");
  }
}
```

### 2. Register the Plugin

Once you have your component, you can register it when providing the dev tool in your application's config (`app.config.ts`):

```typescript
import { ApplicationConfig } from "@angular/core";
import { provideInAppDevTools, Plugin } from "ng-inapp-dev-tool";
import { MyCustomToolComponent } from "./my-custom-tool/my-custom-tool.component";

const myCustomPlugin: Plugin = {
  name: "My Custom Tool",
  component: MyCustomToolComponent,
};

export const appConfig: ApplicationConfig = {
  providers: [
    // ...other providers
    provideInAppDevTools({
      plugins: [myCustomPlugin],
    }),
  ],
};
```

### 3. Built-in Plugins vs Custom Plugins

If you provide a plugin with the same `name` as a built-in plugin, the custom plugin will _not_ override the built-in one. Ensure your plugin names are unique to avoid conflicts.

## Future Core Updates

If you are modifying the core dev tool structure (`dev-tool-shell` or `providers.ts`), please ensure that:

1. The `Plugin` interface remains backward compatible.
2. You update this `Core.md` file with any new architectural decisions or changes to the plugin registration process.
