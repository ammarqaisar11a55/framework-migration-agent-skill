<script>
  import { Button } from '../src/lib/index.js';

  let clicks = $state(0);
</script>

<Button variant="danger" type="submit" aria-label="Delete item" on:click={() => (clicks += 1)}>
  {#snippet icon()}
    <svg class="trash"></svg>
  {/snippet}
  Delete
</Button>
<Button>Plain</Button>
<p class="clicks">Clicks {clicks}</p>
