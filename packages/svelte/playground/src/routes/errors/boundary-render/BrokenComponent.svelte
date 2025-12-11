<script lang="ts">
  // This component throws an error during rendering
  throw new Error('Component rendering error - intentional for testing');
</script>

<div>
  <p>This content will never render because the error is thrown first.</p>
</div>
