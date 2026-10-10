<script>
  import Counter from './Counter.svelte';

  let last = 'none';
</script>

<Counter start={2} label="Clicks" on:change={(event) => (last = event.detail.count)}>
  <p slot="footer" let:count>Footer sees {count}</p>
  <span>Child content</span>
</Counter>
<p class="last">Last change: {last}</p>
