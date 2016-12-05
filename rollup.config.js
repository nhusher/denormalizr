import babel from 'rollup-plugin-babel';

export default {
  entry: 'src/denormalizer.js',
  format: 'cjs',
  plugins: [ babel() ],
  dest: 'bundle.js'
};