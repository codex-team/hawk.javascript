<script lang="ts">
  throw new Error('Error caught by svelte:boundary');
</script>

<div>This should not render if error is thrown</div>
