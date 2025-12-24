<script lang="ts">
  let { shouldError }: { shouldError: boolean } = $props();

  if (shouldError) {
    throw new Error('Rendering error caught by svelte:boundary');
  }
</script>

<div>This should not render if error is thrown</div>
