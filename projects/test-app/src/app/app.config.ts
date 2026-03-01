import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideInAppDevTools, Plugin } from 'ng-inapp-dev-tool';
// To test locally, create a `local.config.ts` file in this folder (it is git-ignored)
// and export your absolute project path from there: `export const projectRoot = '/your/path';`
// import { projectRoot } from './local.config';

const devToolPlugins: Plugin[] = [];

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
        provideInAppDevTools({
            plugins: devToolPlugins,
            editor: 'antigravity',
            projectRoot: '' // Replace with `projectRoot` when testing locally
        }),
    ],
};
