<script>
  import { preventDefault } from 'svelte/legacy';

  let submitted = $state(0);

  function submit() {
    submitted += 1;
  }
</script>

<form onsubmit={preventDefault(submit)}>
  <button type="submit">Send</button>
</form>
<p class="submitted">Submitted {submitted}</p>
