import typescript from 'rollup-plugin-typescript2'

import pkg from './package.json'

export default [
  {
    input: './src/Endpoint.ts',
    output: [{ file: pkg.main, format: 'umd', name: 'simple_rpc', exports: 'named' }],
    plugins: [
      typescript({
        check: true,
        typescript: require('typescript'),
        tsconfig: './tsconfig.build.json'
      }),
      require('rollup-plugin-uglify').uglify()
    ]
  },
  {
    input: './src/Endpoint.ts',
    output: [{ file: pkg.module, format: 'es' }],
    plugins: [
      typescript({
        check: true,
        typescript: require('typescript'),
        tsconfig: './tsconfig.build.json'
      })
    ]
  }
]
