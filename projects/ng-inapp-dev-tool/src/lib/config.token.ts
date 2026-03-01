import { InjectionToken } from '@angular/core';
import { Plugin } from './plugin.token';

export interface DevToolConfig {
    plugins?: Plugin[];
    editor?: string | boolean;
    projectRoot?: string;
}

export const NG_INAPP_DEV_TOOL_CONFIG = new InjectionToken<DevToolConfig>('NG_INAPP_DEV_TOOL_CONFIG');
