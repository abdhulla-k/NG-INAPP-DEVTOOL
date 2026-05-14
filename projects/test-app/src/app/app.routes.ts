import { Routes } from '@angular/router';
import { Component } from '@angular/core';
import { HeroSectionComponent } from './hero-section.component';

@Component({ standalone: true, template: '<h2>About Page</h2>' })
export class AboutComponent {}

@Component({ standalone: true, template: '<h2>Contact Page</h2>' })
export class ContactComponent {}

const authGuard = () => true;

export const routes: Routes = [
    { path: '', component: HeroSectionComponent },
    { path: 'about', component: AboutComponent },
    { 
        path: 'contact', 
        component: ContactComponent,
        canActivate: [authGuard]
    },
    {
        path: 'lazy',
        loadComponent: () => Promise.resolve(AboutComponent)
    }
];
