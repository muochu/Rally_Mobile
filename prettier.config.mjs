/** @type {import("prettier").Config} */
const config = {
  singleQuote: true,
  trailingComma: 'all',
  semi: true,
  plugins: ['@ianvs/prettier-plugin-sort-imports'],
  importOrder: ['^react$', '<THIRD_PARTY_MODULES>', '^@/(.*)$', '^[./]'],
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
};

export default config;
