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
import { OverviewComponent } from './plugins/overview/overview.component';
import { ComponentsComponent } from './plugins/components/components.component';
import { RoutesComponent } from './plugins/routes/routes.component';
import { AssetsComponent } from './plugins/assets/assets.component';
import { SeoComponent } from './plugins/seo/seo.component';
import { ProfilerComponent } from './plugins/profiler/profiler.component';
import { StateComponent } from './plugins/state/state.component';

// Setup build in plugins here
const BUILT_IN_PLUGINS: Plugin[] = [
    {
        name: 'Overview',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>',
        order: 0,
        component: OverviewComponent
    },
    {
        name: 'Components',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="3" width="4" height="4" rx="1"/><rect x="4" y="17" width="4" height="4" rx="1"/><rect x="10" y="17" width="4" height="4" rx="1"/><rect x="16" y="17" width="4" height="4" rx="1"/><path d="M12 7v5"/><path d="M6 12v5"/><path d="M18 12v5"/><path d="M6 12h12"/></svg>',
        order: 1,
        component: ComponentsComponent
    },
    {
        name: 'Routes',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="6" height="4" rx="1"/><rect x="15" y="4" width="6" height="4" rx="1"/><rect x="15" y="10" width="6" height="4" rx="1"/><rect x="15" y="16" width="6" height="4" rx="1"/><polyline points="9 12 12 12 12 6 15 6"/><line x1="12" y1="12" x2="15" y2="12"/><polyline points="12 12 12 18 15 18"/></svg>',
        order: 2,
        component: RoutesComponent
    },
    {
        name: 'Assets',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
        order: 3,
        component: AssetsComponent
    },
    {
        name: 'SEO',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
        order: 4,
        component: SeoComponent
    },
    {
        name: 'Profiler',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
        order: 5,
        component: ProfilerComponent
    },
    {
        name: 'State',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
        order: 6,
        component: StateComponent
    }
];


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
                        // Append to <html> rather than <body>. If the host app's <body>
                        // has filter/transform/perspective/contain/will-change, it becomes
                        // the containing block for position: fixed descendants — which
                        // breaks the toggle, inspector overlay, and shell panel positioning.
                        document.documentElement.appendChild(shellComponentRef.location.nativeElement);
                        // The shell view is deliberately detached from ApplicationRef
                        // (it manages its own CD), so run its initial change detection
                        // manually — otherwise ngOnInit never fires and restored UI
                        // state (open panel, position) wouldn't render until a click.
                        shellComponentRef.changeDetectorRef.detectChanges();
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
