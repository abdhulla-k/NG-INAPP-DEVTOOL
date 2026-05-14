import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, ActivatedRouteSnapshot, Route } from '@angular/router';
import { filter, Subscription } from 'rxjs';

interface ParsedRoute {
    path: string;
    componentName: string;
    guards: string[];
    isLazy: boolean;
    routeRef: Route;
}

interface MatchedRoute {
    path: string;
    componentName: string;
    guards: string[];
    routeRef: Route;
}

@Component({
    selector: 'ng-inapp-dev-tool-routes',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="routes-container">
            <header class="section-header">
                <h2>Current route</h2>
            </header>
            
            <div class="current-route-input-group">
                <div class="route-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
                <input 
                    type="text" 
                    [value]="currentUrl" 
                    (keyup.enter)="navigateTo($event)"
                    class="route-input"
                    placeholder="Enter path to navigate"
                />
            </div>
            <p class="help-text">Edit path above to navigate</p>

            <div class="spacer"></div>

            <header class="section-header">
                <svg class="header-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"></path><path d="M16.5 9.4L7.55 4.24"></path><polyline points="3.29 7.04 12 12.05 20.71 7.04"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                <h2>Matched Routes</h2>
            </header>
            
            <div class="table-container">
                <table class="routes-table">
                    <thead>
                        <tr>
                            <th>Route Path</th>
                            <th>Name</th>
                            <th>Guards</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (m of matchedRoutes; track m.path; let last = $last) {
                            <tr [class.active-row]="last">
                                <td class="path-cell">
                                    @if (last) { <span class="badge active">active</span> }
                                    <span class="path-text">{{ m.path || '/' }}</span>
                                </td>
                                <td class="name-cell">{{ m.componentName }}</td>
                                <td class="guards-cell">
                                    @for (g of m.guards; track g) { <span class="guard-badge">{{ g }}</span> }
                                    @if (!m.guards.length) { <span class="text-muted">-</span> }
                                </td>
                            </tr>
                        }
                        @if (matchedRoutes.length === 0) {
                            <tr>
                                <td colspan="3" class="text-muted text-center">No matching route found.</td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>

            <div class="spacer"></div>

            <header class="section-header">
                <svg class="header-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                <h2>All Routes</h2>
                <span class="route-count">{{ allRoutes.length }} routes registered</span>
            </header>

            <div class="table-container">
                <table class="routes-table interactive">
                    <thead>
                        <tr>
                            <th>Route Path</th>
                            <th>Name</th>
                            <th>Guards</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (r of allRoutes; track r.path) {
                            <tr
                                (click)="navigateByRoute(r.path)"
                                [class.active-row]="matchedRouteRefs.has(r.routeRef)"
                                [class.has-params]="hasParams(r.path)"
                            >
                                <td class="path-cell">
                                    @if (matchedRouteRefs.has(r.routeRef)) { <span class="badge active">active</span> }
                                    <span class="path-text">/{{ r.path }}</span>
                                    @if (hasParams(r.path)) { <span class="badge params" title="Route requires params — click disabled">params</span> }
                                </td>
                                <td class="name-cell">
                                    {{ r.componentName }}
                                    @if (r.isLazy) { <span class="text-muted">(lazy)</span> }
                                </td>
                                <td class="guards-cell">
                                    @for (g of r.guards; track g) { <span class="guard-badge">{{ g }}</span> }
                                    @if (!r.guards.length) { <span class="text-muted">-</span> }
                                </td>
                            </tr>
                        }
                        @if (allRoutes.length === 0) {
                            <tr>
                                <td colspan="3" class="text-muted text-center">No routes registered.</td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
            
            <div class="bottom-padding"></div>
        </div>
    `,
    styles: [`
        .routes-container {
            padding: 20px;
            color: #fff;
            font-family: 'Inter', sans-serif;
            height: 100%;
            box-sizing: border-box;
            overflow-y: auto;
        }

        .section-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            color: #e2e8f0;
        }

        .section-header h2 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .header-icon {
            width: 16px;
            height: 16px;
            margin-right: 8px;
            color: #94a3b8;
        }

        .route-count {
            margin-left: 10px;
            font-size: 12px;
            color: #64748b;
            font-weight: normal;
            text-transform: none;
        }

        .current-route-input-group {
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            overflow: hidden;
            transition: border-color 0.2s;
        }

        .current-route-input-group:focus-within {
            border-color: var(--vivid-pink, oklch(69.02% 0.277 332.77));
        }

        .route-icon {
            padding: 8px 12px;
            color: #94a3b8;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .route-icon svg {
            width: 16px;
            height: 16px;
        }

        .route-input {
            flex: 1;
            background: transparent;
            border: none;
            color: #fff;
            font-size: 14px;
            padding: 10px 10px 10px 0;
            outline: none;
            font-family: monospace;
        }

        .help-text {
            margin: 6px 0 0;
            font-size: 11px;
            color: #64748b;
        }

        .spacer {
            height: 30px;
        }

        .table-container {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            overflow-x: auto;
        }

        .routes-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 13px;
        }

        .routes-table th {
            padding: 12px 16px;
            color: #94a3b8;
            font-weight: 500;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            white-space: nowrap;
        }

        .routes-table td {
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            vertical-align: middle;
        }

        .routes-table tbody tr:last-child td {
            border-bottom: none;
        }

        .routes-table.interactive tbody tr {
            cursor: pointer;
            transition: background 0.2s;
        }

        .routes-table.interactive tbody tr:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        .active-row {
            background: rgba(255, 65, 248, 0.05) !important;
        }

        .path-cell {
            font-family: monospace;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .badge.active {
            background: rgba(255, 65, 248, 0.15);
            color: var(--vivid-pink, #FF41F8);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            font-family: 'Inter', sans-serif;
        }

        .badge.params {
            background: rgba(168, 139, 250, 0.15);
            color: #a78bfa;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            font-family: 'Inter', sans-serif;
            margin-left: 6px;
        }

        .routes-table.interactive tbody tr.has-params {
            cursor: default;
        }
        .routes-table.interactive tbody tr.has-params:hover {
            background: transparent;
        }

        .path-text {
            color: #e2e8f0;
        }

        .name-cell {
            color: #cbd5e1;
            font-family: monospace;
        }

        .guards-cell {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }

        .guard-badge {
            background: rgba(255, 255, 255, 0.1);
            color: #94a3b8;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-family: monospace;
        }

        .text-muted {
            color: #64748b;
        }

        .text-center {
            text-align: center;
        }
        
        .bottom-padding {
            height: 40px;
        }
    `]
})
export class RoutesComponent implements OnInit, OnDestroy {
    private router = inject(Router, { optional: true });
    private cdr = inject(ChangeDetectorRef);
    private sub?: Subscription;

    currentUrl = '';
    allRoutes: ParsedRoute[] = [];
    matchedRoutes: MatchedRoute[] = [];
    matchedRouteRefs = new Set<Route>();

    ngOnInit() {
        if (!this.router) return;

        // Parse all routes
        this.allRoutes = this.parseRoutes(this.router.config);

        // Initial state
        this.updateCurrentState();

        // Listen for navigations
        this.sub = this.router.events.pipe(
            filter(e => e instanceof NavigationEnd)
        ).subscribe(() => {
            this.updateCurrentState();
        });
    }

    ngOnDestroy() {
        this.sub?.unsubscribe();
    }

    private updateCurrentState() {
        if (!this.router) return;
        
        this.currentUrl = this.router.url;
        
        // Build matched routes + collect their route configs so the All Routes
        // table can highlight by reference (works for parameterized routes too).
        this.matchedRoutes = [];
        this.matchedRouteRefs = new Set<Route>();
        let currentSnapshot: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;

        while (currentSnapshot) {
            if (currentSnapshot.routeConfig) {
                const config = currentSnapshot.routeConfig;
                const pathUrl = currentSnapshot.url.map(s => s.path).join('/');

                this.matchedRoutes.push({
                    path: pathUrl || (config.path ?? '/'),
                    componentName: this.getComponentName(config),
                    guards: this.getGuards(config),
                    routeRef: config,
                });
                this.matchedRouteRefs.add(config);
            }

            currentSnapshot = currentSnapshot.firstChild;
        }

        this.cdr.detectChanges();
    }

    hasParams(path: string): boolean {
        return path.includes(':') || path.includes('**');
    }

    private parseRoutes(routes: Route[], parentPath = ''): ParsedRoute[] {
        let parsed: ParsedRoute[] = [];

        for (const route of routes) {
            const currentPath = parentPath ? `${parentPath}/${route.path}` : (route.path || '');
            
            // Avoid adding root empty paths if they just redirect or are purely wrapper
            // But we do want to show them if they have a component
            if (route.component || route.loadComponent || route.loadChildren || route.redirectTo) {
                const isLazy = !!route.loadChildren || !!route.loadComponent;
                let cName = this.getComponentName(route);
                
                parsed.push({
                    path: currentPath,
                    componentName: cName,
                    guards: this.getGuards(route),
                    isLazy,
                    routeRef: route
                });
            }

            // Recurse children
            if (route.children) {
                parsed = parsed.concat(this.parseRoutes(route.children, currentPath));
            }
            
            // Recurse loaded lazy children (if available dynamically in the router)
            if ((route as any)._loadedRoutes) {
                parsed = parsed.concat(this.parseRoutes((route as any)._loadedRoutes, currentPath));
            }
        }

        return parsed;
    }

    private getComponentName(route: Route): string {
        if (route.component) {
            return route.component.name || 'AnonymousComponent';
        }
        if (route.loadComponent) {
            return 'LazyComponent';
        }
        if (route.loadChildren) {
            return 'LazyModule/Routes';
        }
        if (route.redirectTo) {
            return `Redirect -> ${route.redirectTo}`;
        }
        return 'Unknown';
    }

    private getGuards(route: Route): string[] {
        const guards: string[] = [];
        if (route.canActivate) {
            route.canActivate.forEach(g => guards.push(typeof g === 'function' ? g.name || 'fn' : g.name || 'Guard'));
        }
        if (route.canActivateChild) {
            route.canActivateChild.forEach(g => guards.push(typeof g === 'function' ? g.name || 'fn' : g.name || 'Guard'));
        }
        if (route.canDeactivate) {
            route.canDeactivate.forEach(g => guards.push(typeof g === 'function' ? g.name || 'fn' : g.name || 'Guard'));
        }
        if (route.canMatch) {
            route.canMatch.forEach(g => guards.push(typeof g === 'function' ? g.name || 'fn' : g.name || 'Guard'));
        }
        if (route.canLoad) {
            route.canLoad.forEach(g => guards.push(typeof g === 'function' ? g.name || 'fn' : g.name || 'Guard'));
        }
        return guards;
    }

    navigateTo(event: Event) {
        const input = event.target as HTMLInputElement;
        const url = input.value;
        this.navigateByRoute(url);
    }

    navigateByRoute(path: string) {
        if (!this.router || !path) return;
        // Refuse to navigate to a literal :param/** path — it would create a broken URL.
        if (this.hasParams(path)) return;
        let targetPath = path;
        if (!targetPath.startsWith('/')) {
            targetPath = '/' + targetPath;
        }
        this.router.navigateByUrl(targetPath);
    }
}
