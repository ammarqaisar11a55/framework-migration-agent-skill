import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button (click)="open()">Open detail</button>`,
})
export class Home {
  private readonly router = inject(Router);

  open() {
    return this.router.navigate(['/detail'], { state: { from: 'home' } });
  }
}
