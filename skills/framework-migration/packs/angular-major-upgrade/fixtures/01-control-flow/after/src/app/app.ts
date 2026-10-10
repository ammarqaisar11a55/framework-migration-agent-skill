import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Greeting } from './greeting/greeting';

@Component({
  selector: 'app-root',
  imports: [Greeting],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-greeting [name]="name" [items]="items" [mood]="mood" (greet)="onGreet($event)" />
    <p class="log">Greeted {{ greeted }} time(s)</p>
  `,
})
export class App {
  name = 'Ada';
  items = ['tea', 'cake'];
  mood: 'happy' | 'tired' | 'other' = 'happy';
  greeted = 0;

  onGreet(_name: string) {
    this.greeted += 1;
    this.mood = 'tired';
  }
}
