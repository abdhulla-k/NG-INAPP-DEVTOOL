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
import { DevToolShellComponent } from './dev-tool-shell.component';

// Import build in plugins

// Setup build in plugins here
const BUILT_IN_PLUGINS: Plugin[] = [];

// Interface / Rules of our plugin
export interface DevToolConfig {
    plugins?: Plugin[];
}

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

        // Provide the callback to run at startup phase to setup everything initially
        provideAppInitializer(() => {
            // Inject the platform ID to check where we are running
            const platformId = inject(PLATFORM_ID);

            // Once weare in browser (continue). don't want to run in ssr
            if (isPlatformBrowser(platformId)) {
                // Inject root/application reference of angular
                const appRef = inject(ApplicationRef);

                // Make sure the applicatin is stable and not middle of performing work that might result in a UI change.
                appRef.isStable
                    .pipe(first((isStable) => isStable === true))
                    .subscribe(() => {
                        // Get the app component ref from the application (root) ref
                        const appRootView = appRef.components[0]?.hostView;

                        // Make sure existance before starting
                        if (appRootView) {
                            console.log(
                                '[DevTool] App is stable in browser. Creating and attaching shell component.'
                            );

                            // Get root injector (environment injector) to create component programatically
                            // We are providing this injector becouse the component need its injector to access dependencies
                            const environmentInjector = appRef.injector;
                            const shellComponentRef = createComponent(DevToolShellComponent, {
                                environmentInjector, // Provide root injector to access from root/environmentProviders
                            });

                            // Push the component to the body
                            document.body.appendChild(
                                shellComponentRef.location.nativeElement
                            );
                        } else {
                            // Show error
                            console.error(
                                '[DevTool] Could not find the application root view.'
                            );
                        }
                    });
            }
        }),
    ]);
}
