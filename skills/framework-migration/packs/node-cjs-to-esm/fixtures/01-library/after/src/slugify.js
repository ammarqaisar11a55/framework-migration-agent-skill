import defaultsModule from './defaults.json' with { type: 'json' };
const { separator } = defaultsModule;

// Lower-case words joined by the separator, with everything else dropped.
export default function slugify(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join(separator);
}
