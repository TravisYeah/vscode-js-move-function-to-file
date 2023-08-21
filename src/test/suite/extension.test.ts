import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as assert from "assert";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Starting tests...");

  async function testComponentToFile(
    positionLine: number,
    expectedFileName: string,
    content: string
  ) {
    const originalPath = path.join(
      __dirname,
      "../../../src/fixtures/sampleFile.jsx"
    );
    const tempFilePath = path.join(
      __dirname,
      `../../../src/fixtures/sampleFile_${expectedFileName}`
    );
    fs.copyFileSync(originalPath, tempFilePath);

    const uri = vscode.Uri.file(tempFilePath);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    const position = new vscode.Position(positionLine, 0);
    editor.selection = new vscode.Selection(position, position);

    await vscode.commands.executeCommand(
      "vscode-js-move-function-to-file.moveFunctionToFile"
    );

    const expectedFilePath = path.join(
      path.dirname(uri.fsPath),
      expectedFileName
    );
    assert.ok(fs.existsSync(expectedFilePath), "File was not created");
    assert.equal(
      fs.readFileSync(expectedFilePath, { encoding: "utf-8" }),
      content
    );

    fs.unlinkSync(expectedFilePath);
    fs.unlinkSync(tempFilePath);
  }

  test("Oneline component", async () => {
    await testComponentToFile(
      0,
      "OnelineComponent.jsx",
      "const OnelineComponent = () => { return <div>This is a test component</div>; }"
    );
  });

  test("Component with props", async () => {
    await testComponentToFile(
      1,
      "ComponentProps.jsx",
      "const ComponentProps = (props) => { return <div>This is a test component</div>; }"
    );
  });

  test("Multiline component", async () => {
    await testComponentToFile(
      2,
      "MultilineComponent.jsx",
      `const MultilineComponent = () => {
  return <div>This is a test component</div>;
}`
    );
  });

  test("Old style functional component", async () => {
    await testComponentToFile(
      5,
      "OldStyleFunction.jsx",
      `function OldStyleFunction() {
  return <div>Old style test component</div>;
}`
    );
  });
});
