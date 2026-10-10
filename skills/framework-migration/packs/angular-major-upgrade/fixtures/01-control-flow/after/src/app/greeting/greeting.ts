import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
} from "@angular/core";

@Component({
  selector: "app-greeting",
  imports: [],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (name) {
      <h2>Hello {{ name }}</h2>
    } @else {
      <h2>Hello stranger</h2>
    }
    <ul>
      @for (item of items; track byValue(i, item); let i = $index) {
        <li>{{ i + 1 }}. {{ item }}</li>
      }
    </ul>
    <p>
      @switch (mood) {
        @case ("happy") {
          <span>Feeling good</span>
        }
        @case ("tired") {
          <span>Needs coffee</span>
        }
        @default {
          <span>No idea</span>
        }
      }
    </p>
    <button (click)="greet.emit(name)">Greet</button>
  `,
})
export class Greeting {
  @Input() name = "";
  @Input() items: string[] = [];
  @Input() mood = "other";
  @Output() greet = new EventEmitter<string>();

  byValue(_index: number, item: string) {
    return item;
  }
}
