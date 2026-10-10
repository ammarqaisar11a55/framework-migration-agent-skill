<script>
  let submitted = 0;

  function submit() {
    submitted += 1;
  }
</script>

<form on:submit|preventDefault={submit}>
  <button type="submit">Send</button>
</form>
<p class="submitted">Submitted {submitted}</p>
