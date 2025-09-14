/* eslint-disable @typescript-eslint/ban-ts-comment */
import { pathsToModuleNameMapper } from 'ts-jest';

// @ts-ignore
import { compilerOptions } from './tsconfig.json' with { type: 'json' };

export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
