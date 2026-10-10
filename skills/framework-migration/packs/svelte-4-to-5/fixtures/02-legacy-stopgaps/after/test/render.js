// Mounts a component into the document with the API of the installed Svelte version.
import * as svelte from "svelte";

export function render(Component, props = {}) {
  const target = document.createElement("div");
  document.body.append(target);
  if (typeof svelte.mount === "function") {
    const component = svelte.mount(Component, { target, props });
    svelte.flushSync();
    return { target, component, destroy: () => svelte.unmount(component) };
  }
  // Svelte 4: components are classes.
  const component = new Component({ target, props });
  return { target, component, destroy: component.$destroy.bind(component) };
}

export const settle = () => svelte.tick();

export const text = (node) => node.textContent.replace(/\s+/g, " ").trim();
