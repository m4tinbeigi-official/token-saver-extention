"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const node_fetch_1 = __importDefault(require("node-fetch"));
function activate(context) {
    const output = vscode.window.createOutputChannel('Token Saver');
    const login = async () => {
        const email = await vscode.window.showInputBox({ prompt: 'Enter your Token Saver email' });
        if (!email) {
            return undefined;
        }
        const password = await vscode.window.showInputBox({ prompt: 'Enter your Token Saver password', password: true });
        if (!password) {
            return undefined;
        }
        // Placeholder: In real implementation, send credentials to server and obtain token.
        // Here we just store a dummy token.
        const token = Buffer.from(`${email}:${password}`).toString('base64');
        await context.globalState.update('tokensaverToken', token);
        vscode.window.showInformationMessage('Logged in to Token Saver');
        return token;
    };
    const getToken = async () => {
        let token = context.globalState.get('tokensaverToken');
        if (!token) {
            token = await login();
        }
        return token;
    };
    const optimizeProject = async () => {
        const token = await getToken();
        if (!token) {
            return;
        }
        const folder = await vscode.window.showOpenDialog({ canSelectFolders: true, openLabel: 'Select Project Folder' });
        if (!folder || folder.length === 0) {
            return;
        }
        const projectPath = folder[0].fsPath;
        output.appendLine(`Optimizing project at ${projectPath} ...`);
        // Placeholder: Call local optimization logic or remote API.
        // Example using fetch (no actual endpoint).
        try {
            const response = await (0, node_fetch_1.default)('https://api.tokensaver.ir/optimize', {
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
        }
        catch (err) {
            output.appendLine(`Optimization failed: ${err}`);
            vscode.window.showErrorMessage('Optimization failed (see output channel)');
        }
    };
    const disposable = vscode.commands.registerCommand('tokensaver.optimize', optimizeProject);
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map