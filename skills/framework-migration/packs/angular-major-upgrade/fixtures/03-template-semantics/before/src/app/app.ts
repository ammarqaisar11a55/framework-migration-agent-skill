import { Component } from '@angular/core';
import { Profile } from './profile/profile';

@Component({
  selector: 'app-root',
  imports: [Profile],
  template: `<app-profile [user]="null" />`,
})
export class App {}
