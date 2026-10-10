import { TestBed } from '@angular/core/testing';
import { Profile } from './profile';

describe('Profile', () => {
  const render = (user: Profile['user']) => {
    const fixture = TestBed.createComponent(Profile);
    fixture.componentInstance.user = user;
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  };

  it('shows a guest without an address when there is no user', () => {
    const { el } = render(null);
    expect(el.querySelector('h2')?.textContent).toBe('Guest');
    expect(el.querySelector('.address')?.textContent).toBe('No address on file');
  });

  it('shows the city of a user with an address', () => {
    const { el } = render({ name: 'Ada', address: { city: 'London' } });
    expect(el.querySelector('h2')?.textContent).toBe('Ada');
    expect(el.querySelector('.address')?.textContent).toBe('Lives in London');
  });

  it('shows no address for a user whose address is null', () => {
    const { el } = render({ name: 'Grace', address: null });
    expect(el.querySelector('.address')?.textContent).toBe('No address on file');
  });

  it('takes a nickname from the input', () => {
    const { fixture, el } = render(null);
    const input = el.querySelector<HTMLInputElement>('.nickname')!;
    input.value = '  Countess ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el.querySelector('.nick')?.textContent).toBe('Countess');
  });
});
