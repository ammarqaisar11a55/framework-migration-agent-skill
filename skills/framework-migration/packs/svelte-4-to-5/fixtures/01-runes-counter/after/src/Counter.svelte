<script>
  import { createEventDispatcher } from 'svelte';

  /**
   * @typedef {Object} Props
   * @property {number} [start]
   * @property {string} [label]
   * @property {import('svelte').Snippet<[any]>} [footer]
   * @property {import('svelte').Snippet} [children]
   */

  /** @type {Props} */
  let {
    start = 0,
    label = 'Count',
    footer,
    children
  } = $props();

  const dispatch = createEventDispatcher();
  let count = $state(start);

  let doubled = $derived(count * 2);

  function increment() {
    count += 1;
    dispatch('change', { count });
  }
</script>

<button onclick={increment}>{label}: {count}</button>
<p>Doubled: {doubled}</p>
{@render footer?.({ count, })}
{@render children?.()}
