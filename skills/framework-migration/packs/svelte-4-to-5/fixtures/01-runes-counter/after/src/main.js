import App from './App.svelte';
import { mount, unmount } from "svelte";

const app = mount(App, { target: document.getElementById('app') });

export function teardown() {
  unmount(app);
}

export default app;
