import { Component } from '@angular/core';

@Component({
    selector: 'app-hero-section',
    standalone: true,
    template: `
        <section class="hero">
            <h2>Hero Section Component</h2>
            <p>This is a child component for testing the inspector's Parent navigation.</p>
            <button class="cta-btn">Get Started</button>
        </section>
    `,
    styles: [`
        .hero {
            text-align: center;
            padding: 2rem;
            border: 1px dashed rgba(0,0,0,0.1);
            border-radius: 12px;
            margin-top: 1.5rem;
        }
        h2 {
            margin: 0 0 0.5rem;
            font-size: 1.5rem;
        }
        p { margin: 0 0 1rem; color: #666; }
        .cta-btn {
            background: oklch(69.02% 0.277 332.77);
            color: white;
            border: none;
            padding: 0.5rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
        }
    `]
})
export class HeroSectionComponent {}
