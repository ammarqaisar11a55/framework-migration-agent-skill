import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Inbox } from './inbox/inbox';

@Component({
  selector: 'app-root',
  imports: [Inbox],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<h1>Inbox</h1><app-inbox />`,
})
export class App {}
