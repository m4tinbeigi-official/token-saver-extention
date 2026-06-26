import * as vscode from 'vscode';
import fetch from 'node-fetch';

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('Token Saver');

  const login = async (): Promise<string | undefined> => {
    const email = await vscode.window.showInputBox({ prompt: 'Enter your Token Saver email' });
    if (!email) { return undefined; }
    const password = await vscode.window.showInputBox({ prompt: 'Enter your Token Saver password', password: true });
    if (!password) { return undefined; }
    // Placeholder: In real implementation, send credentials to server and obtain token.
    // Here we just store a dummy token.
    const token = Buffer.from(`${email}:${password}`).toString('base64');
    await context.globalState.update('tokensaverToken', token);
    vscode.window.showInformationMessage('Logged in to Token Saver');
    return token;
  };

  const getToken = async (): Promise<string> => {
    let token = context.globalState.get<string>('tokensaverToken');
    if (!token) {
      token = await login();
    }
    return token!;
  };

  const optimizeProject = async () => {
    const token = await getToken();
    if (!token) { return; }
    const folder = await vscode.window.showOpenDialog({ canSelectFolders: true, openLabel: 'Select Project Folder' });
    if (!folder || folder.length === 0) { return; }
    const projectPath = folder[0].fsPath;
    output.appendLine(`Optimizing project at ${projectPath} ...`);
    // Placeholder: Call local optimization logic or remote API.
    // Example using fetch (no actual endpoint).
    try {
      const response = await fetch('https://api.tokensaver.ir/optimize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: projectPath })
      });
      const result = await response.json();
      output.appendLine(`Optimization result: ${JSON.stringify(result)}`);
      vscode.window.showInformationMessage('Project optimization completed');
    } catch (err) {
      output.appendLine(`Optimization failed: ${err}`);
      vscode.window.showErrorMessage('Optimization failed (see output channel)');
    }
  };

  const disposable = vscode.commands.registerCommand('tokensaver.optimize', optimizeProject);
  context.subscriptions.push(disposable);
}

export function deactivate() {}
