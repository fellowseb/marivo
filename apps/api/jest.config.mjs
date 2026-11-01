/** @type {import('jest').Config} */
const config = {
  displayName: "api",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "ESNext",
          moduleResolution: "Bundler",
          target: "ESNext",
          esModuleInterop: true,
        },
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    // Resolve workspace packages to their source so tests work without building
    "^@marivo/utils$": "<rootDir>/../../packages/utils/src/index.ts",
    "^@marivo/utils/(.*)$": "<rootDir>/../../packages/utils/src/$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};

export default config;
