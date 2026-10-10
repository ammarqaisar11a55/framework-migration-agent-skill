<script>
  import { createEventDispatcher } from 'svelte';

  export let start = 0;
  export let label = 'Count';

  const dispatch = createEventDispatcher();
  let count = start;

  $: doubled = count * 2;

  function increment() {
    count += 1;
    dispatch('change', { count });
  }
</script>

<button on:click={increment}>{label}: {count}</button>
<p>Doubled: {doubled}</p>
<slot name="footer" {count} />
<slot />
