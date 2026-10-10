<script>
  import { run } from 'svelte/legacy';

  let { name } = $props();

  let greeting = $derived(`Hello ${name}`);
  run(() => {
    document.title = greeting;
  });
</script>

<h1>{greeting}</h1>
