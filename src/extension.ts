'use strict';

import * as vscode from 'vscode';
import * as http from 'http';

export function activate(context: vscode.ExtensionContext) {

    const commandId = 'extension.bingDict';
    
    context.subscriptions.push(vscode.commands.registerCommand(commandId, async () => {

        const word = await vscode.window.showInputBox({
            placeHolder: 'Input a word to lookup definition'
        });

        const definition = await getDefinition(word);

        vscode.window.showInformationMessage(definition);
        
    }));
}

function getDefinition(word) {
    return new Promise((resolve: (arg: string) => void, reject) => {
        let result = '', definition = '';
        http.get(`http://www.bing.com/dict/search?mkt=zh-cn&q=${escape(word)}`, res => {
            res.on('data', (chunk) => { result += chunk; });
            res.on('end', () => {
                let regex = new RegExp(
                    `span class="pos.*?">(.*?)</span>.*?<span class="def"><span>(.*?)</span></span></li>`, 
                    'g'
                );
                let m;
                while (m = regex.exec(result)) {
                    if (definition) definition += ' | ';
                    definition += `${m[1]} ${m[2]}`;
                }
                if (m = /<div class="hd_prUS[^\[]*(\[.*?\])/.exec(result)) {
                    definition = m[1] + ' ' + definition;
                } else if (m = (/hd_p1_1" lang="en">(.*?)<\/div/).exec(result)) {
                    definition = m[1] + ' ' + definition;
                }
                resolve(definition);
            });
        });
    });
}

