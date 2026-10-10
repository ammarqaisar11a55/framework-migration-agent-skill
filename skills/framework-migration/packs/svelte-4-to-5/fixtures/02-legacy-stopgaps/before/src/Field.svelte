<svelte:options accessors={true} />

<script>
  export let value = '';
</script>

<input bind:value on:input />
