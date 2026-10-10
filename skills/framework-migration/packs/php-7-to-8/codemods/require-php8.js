// Stage "php-8", after Rector: the code now uses PHP 8.0 syntax (match, nullsafe, promoted
// properties, str_contains, ...), so composer.json's PHP requirement has to say so. A `php`
// constraint that still allows 7.x becomes "^8.0"; config.platform.php pinned to 7.x is reported
// (it makes Composer resolve dependencies for the wrong PHP). Run `composer update --lock` after
// the stage when the project commits composer.lock (its content hash covers the requirement).

export const include = (path) => path === "composer.json";

const allows7 = (constraint) => /(^|[\s|,^~>=<])7(\.|\b)|>=?\s*[5-7](\.|\b)/.test(constraint);

export default function transform(file, _api, options) {
  const composer = JSON.parse(file.source);
  let changed = false;
  const php = composer.require?.php;
  if (typeof php === "string" && allows7(php)) {
    composer.require.php = "^8.0";
    changed = true;
    options.note(`composer.json: require.php "${php}" → "^8.0" (the migrated code needs PHP 8.0)`);
  }
  const platform = composer.config?.platform?.php;
  if (typeof platform === "string" && /^7\./.test(platform)) {
    options.note(`composer.json: config.platform.php is "${platform}"; set it to the PHP 8 version you deploy on, then composer update`);
  }
  if (!changed) return undefined;
  const indent = /^([ \t]+)"/m.exec(file.source)?.[1] ?? "    ";
  return `${JSON.stringify(composer, null, indent)}\n`;
}
