<script>
  import { Button } from '../src/lib/index.js';

  let clicks = 0;
</script>

<Button variant="danger" type="submit" aria-label="Delete item" on:click={() => (clicks += 1)}>
  <svg slot="icon" class="trash"></svg>
  Delete
</Button>
<Button>Plain</Button>
<p class="clicks">Clicks {clicks}</p>
