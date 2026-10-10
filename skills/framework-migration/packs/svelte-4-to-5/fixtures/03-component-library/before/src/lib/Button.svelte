<script>
  export let variant = 'primary';
</script>

<button class="btn btn-{variant}" {...$$restProps} on:click>
  {#if $$slots.icon}<span class="icon"><slot name="icon" /></span>{/if}
  <slot />
</button>
