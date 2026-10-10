<script>
  import { createBubbler } from 'svelte/legacy';

  const bubble = createBubbler();
  /**
   * @typedef {Object} Props
   * @property {string} [variant]
   * @property {import('svelte').Snippet} [icon]
   * @property {import('svelte').Snippet} [children]
   */

  /** @type {Props & { [key: string]: any }} */
  let { variant = 'primary', icon, children, ...rest } = $props();
</script>

<button class="btn btn-{variant}" {...rest} onclick={bubble('click')}>
  {#if icon}<span class="icon">{@render icon?.()}</span>{/if}
  {@render children?.()}
</button>
