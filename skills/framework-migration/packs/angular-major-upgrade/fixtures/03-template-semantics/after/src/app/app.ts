import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Profile } from './profile/profile';

@Component({
  selector: 'app-root',
  imports: [Profile],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<app-profile [user]="null" />`,
})
export class App {}
