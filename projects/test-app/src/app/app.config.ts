import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideInAppDevTools, Plugin } from 'ng-inapp-dev-tool';
import { DummyPluginComponent } from './dummy-plugin.component';

const devToolPlugins: Plugin[] = [
  { name: 'Dummy Plugin', component: DummyPluginComponent },
];

import { routes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideInAppDevTools({ plugins: devToolPlugins }),
  ],
};
