import { TestBed } from '@angular/core/testing';
import { Inbox } from './inbox';
import { MessageFeed } from './message-feed';

describe('Inbox', () => {
  it('renders messages pushed by the feed', () => {
    const fixture = TestBed.createComponent(Inbox);
    const feed = TestBed.inject(MessageFeed);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.count')?.textContent).toBe('0 message(s)');
    feed.messages.next('hello');
    feed.messages.next('again');
    fixture.detectChanges();
    expect(el.querySelector('.count')?.textContent).toBe('2 message(s)');
    expect([...el.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['hello', 'again']);
    expect(el.querySelector('.status')?.textContent).toBe('last: again');
  });
});
