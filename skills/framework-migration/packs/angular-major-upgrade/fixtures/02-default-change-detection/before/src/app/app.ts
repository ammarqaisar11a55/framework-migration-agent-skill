import { Component } from '@angular/core';
import { Inbox } from './inbox/inbox';

@Component({
  selector: 'app-root',
  imports: [Inbox],
  template: `<h1>Inbox</h1><app-inbox />`,
})
export class App {}
