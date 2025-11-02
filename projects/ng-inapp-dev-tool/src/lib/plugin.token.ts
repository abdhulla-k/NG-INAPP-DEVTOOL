import { InjectionToken, Type } from '@angular/core';

// Interface / Rules of our plugin
export interface Plugin {
    name: string;

    component: Type<any>;
}

// Creating injection token (unique key in dependency Map of DI) and save it in a variable
export const NG_INAPP_DEV_TOOL_PLUGINS = new InjectionToken<Plugin[]>('NG_INAPP_DEV_TOOL_PLUGINS');