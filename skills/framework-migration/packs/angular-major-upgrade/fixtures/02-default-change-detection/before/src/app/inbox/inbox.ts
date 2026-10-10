import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { MessageFeed } from './message-feed';

@Component({
  selector: 'app-inbox',
  template: `
    <p class="count">{{ messages.length }} message(s)</p>
    <ul>
      @for (message of messages; track $index) {
        <li>{{ message }}</li>
      }
    </ul>
    <p class="status">{{ status }}</p>
  `,
})
export class Inbox implements OnInit, OnDestroy {
  private readonly feed = inject(MessageFeed);
  private subscription?: Subscription;
  // Plain fields, mutated outside template events: rendered by default (eager) change detection.
  messages: string[] = [];
  status = 'idle';

  ngOnInit() {
    this.subscription = this.feed.messages.subscribe((message) => {
      this.messages.push(message);
      this.status = `last: ${message}`;
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}
