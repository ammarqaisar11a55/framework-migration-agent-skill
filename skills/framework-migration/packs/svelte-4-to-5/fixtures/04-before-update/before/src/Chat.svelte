<script>
  import ChatLog from './ChatLog.svelte';

  let messages = ['Hello'];

  function send() {
    messages = [...messages, `Message ${messages.length + 1}`];
  }
</script>

<ChatLog {messages} />
<button on:click={send}>Send</button>
