import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="origin">Opened from {{ origin }}</p>`,
})
export class Detail {
  // Navigation state is only available while the navigation runs, i.e. in the constructor.
  readonly origin = (inject(Router).getCurrentNavigation()?.extras.state?.['from'] as string | undefined) ?? 'nowhere';
}
