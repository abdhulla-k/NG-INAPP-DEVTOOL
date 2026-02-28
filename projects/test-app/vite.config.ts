// projects/test-app/vite.config.ts

import { defineConfig, Plugin } from 'vite';
import { exec } from 'child_process';
import { parse } from 'url';
import ts from 'typescript';
import MagicString from 'magic-string';

function openInEditorPlugin(): Plugin {
    const projectRoot = process.cwd();

    return {
        name: 'ng-open-in-editor',
        enforce: 'pre',

        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url?.startsWith('/__open-in-editor')) {
                    const { query } = parse(req.url, true);
                    const filePath = query.file as string;
                    if (!filePath) {
                        res.statusCode = 400;
                        res.end('Missing "file" query parameter.');
                        return;
                    }
                    const absolutePath = `${projectRoot}${filePath}`;
                    const command = `code --goto "${absolutePath}"`;
                    exec(command, (error) => {
                        if (error) {
                            console.error(`[DevTools] Failed to launch editor: ${error.message}`);
                            res.statusCode = 500;
                            res.end('Failed to launch editor.');
                            return;
                        }
                        res.statusCode = 200;
                        res.end('OK');
                    });
                } else {
                    next();
                }
            });
        },

        transform(code, id, options) {
            console.log("\n\nhooooooooooooooooooooooo\n\n")

            const [filePath] = id.split('?');

            if (!filePath.endsWith('.component.ts')) {
                return null;
            }

            const sourcePath = filePath.replace(projectRoot, '');
            const magicString = new MagicString(code);
            const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);

            let decoratorNode: ts.ObjectLiteralExpression | null = null;

            ts.forEachChild(sourceFile, (node) => {
                if (ts.isClassDeclaration(node) && node.modifiers) {
                    node.modifiers.forEach((modifier) => {
                        if (ts.isDecorator(modifier) && ts.isCallExpression(modifier.expression)) {
                            const expression = modifier.expression;
                            if (ts.isIdentifier(expression.expression) && expression.expression.text === 'Component') {
                                decoratorNode = expression.arguments[0] as ts.ObjectLiteralExpression;
                            }
                        }
                    });
                }
            });

            if (decoratorNode) {
                let hostProperty: ts.PropertyAssignment | undefined;
                decoratorNode.properties.forEach((prop) => {
                    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text === 'host') {
                        hostProperty = prop;
                    }
                });

                const newAttribute = `'[attr.data-ng-source]': '"${sourcePath}"'`;

                if (hostProperty && ts.isObjectLiteralExpression(hostProperty.initializer)) {
                    const initializer = hostProperty.initializer;
                    const lastProp = initializer.properties[initializer.properties.length - 1];
                    const prefix = initializer.properties.length > 0 ? ', ' : '';
                    magicString.appendLeft(lastProp?.getEnd() ?? initializer.getEnd() - 1, prefix + newAttribute);
                } else if (!hostProperty) {
                    const lastProp = decoratorNode.properties[decoratorNode.properties.length - 1];
                    const prefix = decoratorNode.properties.length > 0 ? ', ' : '';
                    magicString.appendLeft(lastProp?.getEnd() ?? decoratorNode.getEnd() - 1, `${prefix}host: { ${newAttribute} }`);
                }

                console.log(`[DevTools] Injected source path into: ${sourcePath}`);

                return {
                    code: magicString.toString(),
                    map: magicString.generateMap({ source: filePath, includeContent: true }),
                };
            }

            return null;
        },
    };
}

export default defineConfig({
    plugins: [openInEditorPlugin()],
});