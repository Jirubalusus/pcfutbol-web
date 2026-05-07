export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      error?.code === 'ERR_MODULE_NOT_FOUND'
      && (specifier.startsWith('./') || specifier.startsWith('../'))
      && !specifier.match(/\.[cm]?[jt]sx?$/)
    ) {
      return nextResolve(`${specifier}.js`, context);
    }
    throw error;
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('/src/firebase/config.js')) {
    return {
      format: 'module',
      shortCircuit: true,
      source: 'export const db = {}; export const auth = {}; export const storage = {}; export default {};',
    };
  }
  return nextLoad(url, context);
}
