import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';

describe('Detail', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes)] }));

  it('reads where it was opened from out of the navigation state', async () => {
    const harness = await RouterTestingHarness.create('/');
    (harness.routeNativeElement!.querySelector('button') as HTMLButtonElement).click();
    await TestBed.inject(Router).navigated;
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('.origin')?.textContent).toBe('Opened from home');
  });

  it('falls back when opened directly', async () => {
    const harness = await RouterTestingHarness.create('/detail');
    expect(harness.routeNativeElement!.querySelector('.origin')?.textContent).toBe('Opened from nowhere');
  });
});
