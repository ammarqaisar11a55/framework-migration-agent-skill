import { TestBed } from '@angular/core/testing';
import { Greeting } from './greeting';

describe('Greeting', () => {
  it('greets by name, lists the items and shows the mood', () => {
    const fixture = TestBed.createComponent(Greeting);
    fixture.componentInstance.name = 'Ada';
    fixture.componentInstance.items = ['tea', 'cake'];
    fixture.componentInstance.mood = 'happy';
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h2')?.textContent).toBe('Hello Ada');
    expect([...el.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['1. tea', '2. cake']);
    expect(el.querySelector('p')?.textContent?.trim()).toBe('Feeling good');
  });

  it('falls back to a stranger and an unknown mood, and emits on click', () => {
    const fixture = TestBed.createComponent(Greeting);
    const emitted: string[] = [];
    fixture.componentInstance.greet.subscribe((name) => emitted.push(name));
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h2')?.textContent).toBe('Hello stranger');
    expect(el.querySelector('p')?.textContent?.trim()).toBe('No idea');
    el.querySelector('button')!.click();
    expect(emitted).toEqual(['']);
  });
});
