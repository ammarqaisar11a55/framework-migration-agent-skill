import App from './App.svelte';

const app = new App({ target: document.getElementById('app') });

export function teardown() {
  app.$destroy();
}

export default app;
