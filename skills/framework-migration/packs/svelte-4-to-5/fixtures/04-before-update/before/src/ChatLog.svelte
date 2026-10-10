<script>
  import { beforeUpdate, afterUpdate } from 'svelte';

  export let messages = [];

  let log;
  let autoscroll = false;

  beforeUpdate(() => {
    autoscroll = log && log.offsetHeight + log.scrollTop > log.scrollHeight - 20;
  });

  afterUpdate(() => {
    if (autoscroll) log.dataset.scrolledTo = String(messages.length);
  });
</script>

<ul class="log" bind:this={log}>
  {#each messages as message}
    <li>{message}</li>
  {/each}
</ul>
