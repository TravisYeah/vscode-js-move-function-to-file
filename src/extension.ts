import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";

function getFunctionAtCursor() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const position = editor.selection.start;
  const document = editor.document;
  const code = document.getText();

  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript", "classProperties"],
  });

  let functionInfo: {
    name: string;
    declaration: string;
  } | null = null;

  traverse(ast, {
    enter(path) {
      const checkFunctionNode = (name: string, node: any) => {
        const funcStart = node.loc.start.line;
        const funcEnd = node.loc.end.line;

        if (position.line + 1 >= funcStart && position.line + 1 <= funcEnd) {
          const funcText = document.getText(
            new vscode.Range(
              new vscode.Position(funcStart - 1, node.loc.start.column),
              new vscode.Position(funcEnd - 1, node.loc.end.column)
            )
          );
          editor.edit((editBuilder) => {
            editBuilder.delete(
              new vscode.Range(
                new vscode.Position(funcStart - 1, 0),
                new vscode.Position(funcEnd - 1, Infinity)
              )
            );
          });

          functionInfo = {
            name,
            declaration: funcText,
          };
        }
      };

      if (path.isFunctionDeclaration() && path.node.id) {
        checkFunctionNode(path.node.id.name, path.node);
      }

      if (
        (path.isArrowFunctionExpression() || path.isFunctionExpression()) &&
        path.parentKey &&
        path.parent
      ) {
        if (
          path.parent.type === "VariableDeclarator" &&
          path.parent.id.type === "Identifier"
        ) {
          checkFunctionNode(path.parent.id.name, path.node);
        } else if (
          path.parent.type === "ObjectProperty" &&
          path.parent.key.type === "Identifier"
        ) {
          checkFunctionNode(path.parent.key.name, path.node);
        }
      }
    },
  });

  return functionInfo;
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "vscode-js-move-function-to-file.moveFunctionToFile",
    async () => {
      try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage("No active editor found");
          return;
        }

        const res = getFunctionAtCursor() || {};

        let { name: functionName, declaration: functionDeclaration } =
          res as any;

        if (!functionDeclaration.startsWith("function")) {
          functionDeclaration = `const ${functionName} = ${functionDeclaration}`;
        }

        if (!functionName || !functionDeclaration) {
          vscode.window.showErrorMessage("Failed to extract the function");
          return;
        }

        const newFilePath = path.join(
          path.dirname(editor.document.uri.fsPath),
          `${functionName}.jsx`
        );
        fs.writeFileSync(newFilePath, functionDeclaration);

        vscode.window.showInformationMessage(
          `Component ${functionName} saved to ${newFilePath}`
        );
      } catch (error) {
        const details =
          error instanceof Error
            ? `${error.message} ${error.stack}`
            : JSON.stringify(error);
        vscode.window.showErrorMessage(
          `Error saving function to file: ${details}`
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
