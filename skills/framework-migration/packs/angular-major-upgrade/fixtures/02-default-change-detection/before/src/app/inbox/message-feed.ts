import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/** Messages pushed from outside any template event, e.g. a socket. */
@Injectable({ providedIn: 'root' })
export class MessageFeed {
  readonly messages = new Subject<string>();
}
