import { createAction, createReducer, createSelector, on, props } from '@ngrx/store';

// Small demo store so visitors can watch the dev tool's State plugin react
// live — the counter and preferences slices give the state tree some depth,
// and every button on the landing page dispatches a real action.

export interface PreferencesState {
    theme: 'dark' | 'light';
    notifications: {
        enabled: boolean;
        unread: number;
    };
}

export interface DemoState {
    counter: number;
    preferences: PreferencesState;
}

export const increment = createAction('[Demo] Increment');
export const decrement = createAction('[Demo] Decrement');
export const reset = createAction('[Demo] Reset');
export const toggleTheme = createAction('[Demo] Toggle Theme');
export const notificationReceived = createAction('[Demo] Notification Received');
export const markAllRead = createAction('[Demo] Mark All Read');
export const setNotificationsEnabled = createAction(
    '[Demo] Set Notifications Enabled',
    props<{ enabled: boolean }>(),
);

export const counterReducer = createReducer(
    0,
    on(increment, count => count + 1),
    on(decrement, count => count - 1),
    on(reset, () => 0),
);

const initialPreferences: PreferencesState = {
    theme: 'dark',
    notifications: { enabled: true, unread: 0 },
};

export const preferencesReducer = createReducer(
    initialPreferences,
    on(toggleTheme, state => ({
        ...state,
        theme: state.theme === 'dark' ? 'light' as const : 'dark' as const,
    })),
    on(notificationReceived, state => state.notifications.enabled
        ? { ...state, notifications: { ...state.notifications, unread: state.notifications.unread + 1 } }
        : state),
    on(markAllRead, state => ({
        ...state,
        notifications: { ...state.notifications, unread: 0 },
    })),
    on(setNotificationsEnabled, (state, { enabled }) => ({
        ...state,
        notifications: { ...state.notifications, enabled },
    })),
);

export const demoReducers = {
    counter: counterReducer,
    preferences: preferencesReducer,
};

export const selectCounter = (state: DemoState) => state.counter;
export const selectPreferences = (state: DemoState) => state.preferences;
export const selectTheme = createSelector(selectPreferences, p => p.theme);
export const selectNotifications = createSelector(selectPreferences, p => p.notifications);
