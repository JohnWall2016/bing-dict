'use strict';

import * as vscode from 'vscode';
import * as http from 'http';

export function activate(context: vscode.ExtensionContext) {
    const commandId = 'extension.bingDict';
    context.subscriptions.push(vscode.commands.registerCommand(commandId, async () => {
        let value = '';
        let editor: vscode.TextEditor;
        if (editor = vscode.window.activeTextEditor) {
            const selection = editor.selection;
            if (selection.start.line === selection.end.line) {
                if (selection.isEmpty) {
                    const range = editor.document.getWordRangeAtPosition(selection.start);
                    if (range) {
                        value = editor.document.getText(range);
                    }
                } else {
                    value = editor.document.getText(selection);
                }
            }
        }
        const word = await vscode.window.showInputBox({
            value, placeHolder: 'Input a word to lookup definition'
        });
        if (word) {
            const definition = await getDefinition(word);
            vscode.window.showInformationMessage(definition);
        }
    }));
}

function getDefinition(word: string) {
    return new Promise((resolve: (arg: string) => void) => {
        let result = '', definition = '', pronunciation = '';
        http.get(`http://www.bing.com/dict/search?mkt=zh-cn&q=${escape(word)}`, res => {
            res.on('data', (chunk) => { result += chunk; });
            res.on('end', () => {
                console.log(result);
                const regex = new RegExp(
                    `span class="pos.*?">(.*?)</span>.*?<span class="def">(.*?)</span></li>`, 
                    'g'
                );
                let m: RegExpExecArray;
                // definitions
                while (m = regex.exec(result)) {
                    if (definition) definition += ' | ';
                    definition += `${trimHtmlTag(m[1])} ${trimHtmlTag(m[2])}`;
                }
                // pronunciation
                if (m = /<div class="hd_prUS[^\[]*(\[.*?\])/.exec(result)) {
                    pronunciation = _unescape.replace(m[1]);
                } else if (m = /hd_p1_1" lang="en">([^<>]*?)<\/div/.exec(result)) {
                    pronunciation = _unescape.replace(m[1]);
                }
                resolve(`${word} ${pronunciation} : ${definition}`);
            });
        });
    });
}

function trimHtmlTag(str: string) {
    return str.replace(/<[^>]*>/g, '');
}

const unescapeMap = new Map<string, string|Function>([
    ['&amp;', '&'],
    ['&hellip;', '...'],
    ['&quot;', '"'],
    ['&#([0-9]*);', function(match: RegExpExecArray) {
        return String.fromCharCode(Number(match[1]));
    }]
]);

class Unescape {
    map: Map<string, string|Function>
    regexp: RegExp;

    constructor(map = unescapeMap) {
        this.map = map;
        const regex = [];
        for (const r of map.keys()) {
            regex.push(r);
        }
        this.regexp = new RegExp(regex.join('|'), 'g');
    }

    replace(str: string) {
        let ret = '';
        let index = 0;
        let m: RegExpExecArray;
        while (m = this.regexp.exec(str)) {
            ret += str.substring(index, m.index);
            for (const [key, value] of this.map.entries()) {
                if (new RegExp(`^${key}$`).test(m[0])) {
                    if (value instanceof Function) {
                        ret += value(m);
                    } else {
                        ret += value;
                    }
                    break;
                }
            }
            index = this.regexp.lastIndex;
        }
        ret += str.substring(index);
        return ret;
    }
}

const _unescape = new Unescape();
