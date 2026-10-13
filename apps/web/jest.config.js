module.exports = {
  preset: "ts-jest",
  moduleDirectories: ["node_modules", "<rootDir>/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "\\.(png|jpg|jpeg|gif|webp|svg)$": "<rootDir>/test/fileMock.js",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
        diagnostics: { ignoreCodes: [1343] },
        astTransformers: {
          before: ["<rootDir>/test/importMetaEnv.js"],
        },
      },
    ],
  },
};
