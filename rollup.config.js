import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup'

export default {
  entry: 'src/denormalizer.js',
  plugins: [ babel(babelrc()) ],
  format: 'umd',
  moduleName: 'denormalizer',
  dest: 'dist/denormalizer.js'
};