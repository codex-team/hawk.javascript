<script lang="ts">
  let {triggerError = $bindable(false)} = $props();

  $effect(() => {
    if (triggerError) {
      throw new Error('Error in $effect rune - caught by boundary');
    }
  });
</script>

<div>
  <p>This component has an effect that can throw an error.</p>
  <p>Trigger status: {triggerError ? 'Active (will throw error)' : 'Inactive'}</p>
</div>
