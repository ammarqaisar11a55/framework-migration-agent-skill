<script>
  import { createBubbler } from 'svelte/legacy';

  const bubble = createBubbler();
  /**
   * @typedef {Object} Props
   * @property {string} [value]
   */

  /** @type {Props} */
  let { value = $bindable('') } = $props();

  export {
  	value,
  }
</script>

<input bind:value oninput={bubble('input')} />
