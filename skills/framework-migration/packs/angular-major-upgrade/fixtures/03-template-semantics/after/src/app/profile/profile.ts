import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

export interface User {
  name: string;
  address: { city: string } | null;
}

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2>{{ user?.name ?? 'Guest' }}</h2>
    @if ($safeNavigationMigration(user?.address) === null) {
      <p class="address">No address on file</p>
    } @else {
      <p class="address">Lives in {{ user?.address?.city }}</p>
    }
    <input class="nickname" (input)="rename($event.target.value)" />
    <p class="nick">{{ nickname }}</p>
  `,
})
export class Profile {
  @Input() user: User | null = null;
  nickname = '';

  rename(value: string) {
    this.nickname = value.trim();
  }
}
