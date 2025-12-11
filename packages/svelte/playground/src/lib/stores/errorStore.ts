import {writable} from 'svelte/store';

export const errorStore = writable(0);

// Store subscription that throws an error
errorStore.subscribe((value) => {
  if (value > 0) {
    throw new Error('Error in store subscription callback');
  }
});
