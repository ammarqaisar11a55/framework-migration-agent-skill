<script>
  import Counter from './Counter.svelte';

  let last = $state('none');
</script>

<Counter start={2} label="Clicks" on:change={(event) => (last = event.detail.count)}>
  {#snippet footer({ count })}
    <p>Footer sees {count}</p>
  {/snippet}
  <span>Child content</span>
</Counter>
<p class="last">Last change: {last}</p>
