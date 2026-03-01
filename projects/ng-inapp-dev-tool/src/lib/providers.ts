import { isPlatformBrowser } from '@angular/common';
import {
    ApplicationRef,
    createComponent,
    EnvironmentProviders,
    inject,
    isDevMode,
    makeEnvironmentProviders,
    provideAppInitializer,
    PLATFORM_ID,
} from '@angular/core';
import { first } from 'rxjs';

import { Plugin, NG_INAPP_DEV_TOOL_PLUGINS } from './plugin.token';
import { DevToolConfig, NG_INAPP_DEV_TOOL_CONFIG } from './config.token';
import { DevToolShellComponent } from './dev-tool-shell.component';

// Import build in plugins

// Setup build in plugins here
const BUILT_IN_PLUGINS: Plugin[] = [];


// Provider to return our plugins
export function provideInAppDevTools(
    config: DevToolConfig // Configeration by user
): EnvironmentProviders {

    // Make sure the application is in development mode
    if (!isDevMode()) {
        return makeEnvironmentProviders([]);
    }

    // Cullect Plugins
    const userPlugins = config.plugins ?? []; // User provided 
    const builtInPluginNames = new Set(BUILT_IN_PLUGINS.map(p => p.name)); // Default

    // Filter out any user plugins that would override a built-in one by name
    const uniqueUserPlugins = userPlugins.filter(p => !builtInPluginNames.has(p.name));

    // Combine the lists
    const allPlugins = [...BUILT_IN_PLUGINS, ...uniqueUserPlugins];



    // Return the plugins and token after converting the dependency (provider) to environmentProviders
    return makeEnvironmentProviders([
        {
            provide: NG_INAPP_DEV_TOOL_PLUGINS,
            useValue: allPlugins,
        },
        {
            provide: NG_INAPP_DEV_TOOL_CONFIG,
            useValue: config,
        },

        // Provide the callback to run at startup phase to setup everything initially
        provideAppInitializer(() => {
            // Inject the platform ID to check where we are running
            const platformId = inject(PLATFORM_ID);

            // Once weare in browser (continue). don't want to run in ssr
            if (isPlatformBrowser(platformId)) {
                // Inject root/application reference of angular
                const appRef = inject(ApplicationRef);

                // Function to check for app root view
                const checkAppRoot = (attempts = 0) => {
                    const appRootView = appRef.components[0]?.hostView;
                    if (appRootView) {
                        console.log('[DevTool] App root view found. Creating shell.');
                        const environmentInjector = appRef.injector;
                        const shellComponentRef = createComponent(DevToolShellComponent, {
                            environmentInjector,
                        });
                        document.body.appendChild(shellComponentRef.location.nativeElement);
                    } else if (attempts < 10) {
                        // Try again in 100ms
                        setTimeout(() => checkAppRoot(attempts + 1), 100);
                    } else {
                        console.error('[DevTool] Could not find application root view after 10 attempts.');
                    }
                };

                // Start checking
                checkAppRoot();
            }
        }),
    ]);
}
