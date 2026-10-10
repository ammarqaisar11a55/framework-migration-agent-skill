import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  it('counts greetings and changes the mood', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.log')?.textContent).toBe('Greeted 0 time(s)');
    el.querySelector('button')!.click();
    fixture.detectChanges();
    expect(el.querySelector('.log')?.textContent).toBe('Greeted 1 time(s)');
    expect(el.querySelector('app-greeting p')?.textContent?.trim()).toBe('Needs coffee');
  });
});
