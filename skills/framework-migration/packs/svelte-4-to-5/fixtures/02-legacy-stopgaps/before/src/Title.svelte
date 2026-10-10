<script>
  export let name;

  $: greeting = `Hello ${name}`;
  $: {
    document.title = greeting;
  }
</script>

<h1>{greeting}</h1>
