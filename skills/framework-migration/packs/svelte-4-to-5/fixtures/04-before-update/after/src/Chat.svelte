<script>
  import ChatLog from './ChatLog.svelte';

  let messages = $state(['Hello']);

  function send() {
    messages = [...messages, `Message ${messages.length + 1}`];
  }
</script>

<ChatLog {messages} />
<button onclick={send}>Send</button>
