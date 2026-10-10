import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';

@Component({
  selector: 'app-greeting',
  imports: [NgIf, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault],
  template: `
    <h2 *ngIf="name; else anonymous">Hello {{ name }}</h2>
    <ng-template #anonymous><h2>Hello stranger</h2></ng-template>
    <ul>
      <li *ngFor="let item of items; let i = index; trackBy: byValue">{{ i + 1 }}. {{ item }}</li>
    </ul>
    <p [ngSwitch]="mood">
      <span *ngSwitchCase="'happy'">Feeling good</span>
      <span *ngSwitchCase="'tired'">Needs coffee</span>
      <span *ngSwitchDefault>No idea</span>
    </p>
    <button (click)="greet.emit(name)">Greet</button>
  `,
})
export class Greeting {
  @Input() name = '';
  @Input() items: string[] = [];
  @Input() mood = 'other';
  @Output() greet = new EventEmitter<string>();

  byValue(_index: number, item: string) {
    return item;
  }
}
