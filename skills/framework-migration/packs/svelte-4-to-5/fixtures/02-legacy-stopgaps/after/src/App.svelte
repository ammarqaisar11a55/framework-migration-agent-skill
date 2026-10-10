<script>
  import Field from './Field.svelte';
  import Form from './Form.svelte';
  import Title from './Title.svelte';

  let name = $state('Ada');
  let inputs = $state(0);
</script>

<Title {name} />
<button class="rename" onclick={() => (name = 'Grace')}>Rename</button>
<Field value="start" on:input={() => (inputs += 1)} />
<p class="inputs">Inputs {inputs}</p>
<Form />
