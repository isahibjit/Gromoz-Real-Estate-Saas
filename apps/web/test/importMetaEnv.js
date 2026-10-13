// Jest loads ts-jest transformers as CommonJS modules.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ts = require("typescript");

// Jest runs CommonJS; expose Vite's import.meta.env through test environment values.
module.exports = {
  name: "import-meta-env",
  version: 1,
  factory: () => (context) => {
    const visit = (node) => {
      if (
        ts.isMetaProperty(node) &&
        node.keywordToken === ts.SyntaxKind.ImportKeyword
      ) {
        return ts.factory.createObjectLiteralExpression([
          ts.factory.createPropertyAssignment(
            "env",
            ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier("process"),
              "env",
            ),
          ),
        ]);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (source) => ts.visitNode(source, visit);
  },
};
