import { Routes } from '@angular/router';
import { LandingComponent } from './landing.component';

export const routes: Routes = [
    { path: '', component: LandingComponent },
    // Catch-all so any unknown deep link falls back to the landing page.
    { path: '**', redirectTo: '' },
];
