import {
    BuilderContext,
    BuilderOutput,
    createBuilder,
} from '@angular-devkit/architect';
import { DevServerBuilderOptions, executeDevServerBuilder } from '@angular-devkit/build-angular';
import { from, Observable, switchMap } from 'rxjs';
import express from 'express';
import { exec } from 'child_process';
import cors from 'cors';
import portfinder from 'portfinder';
import { Server } from 'http';

// Create an angular builder custom server
export function buildCustomServe(
    options: DevServerBuilderOptions,
    context: BuilderContext
): Observable<BuilderOutput> {
    // Start our custom editor server
    const startEditorServer = async (): Promise<{ server: Server; port: number }> => {
        const app = express();
        app.use(cors());

        // Create an api to call from our module to open file in vs code
        app.get('/__open-in-editor', (req, res) => {
            // Get file path from the request
            const filePath = req.query.file as string;

            // Throw an error if file path not provided
            if (!filePath) {
                return res.status(400).send('Missing "file" query parameter.');
            }

            // Camand to open vscode
            const command = `code --goto "${filePath}"`;

            // Run the camand and open vs code
            exec(command, (error) => {
                // if any error
                if (error && error.code !== 1) {
                    // Show the error to to user
                    context.logger.error(`[DevTools] Failed to launch editor: ${error.message}`);
                    // Send error response once any error happened while opening vs code
                    return res.status(500).send('Failed to launch editor.');
                }

                // Send success response
                res.status(200).send('OK');
            });
        });

        const port = await portfinder.getPortPromise({ port: 4201 });

        // start the server
        const server = app.listen(port, () => {
            context.logger.info(`[DevTools] Editor server listening on http://localhost:${port}`);
        });

        // Retun server and port
        return { server, port };
    };

    return from(startEditorServer()).pipe(
        switchMap(({ server }) => {
            // Add teardown logic to stop our server
            context.addTeardown(() => {
                context.logger.info('[DevTools] Shutting down editor server.');
                server.close();
            });

            // Execute the real Angular dev server, passing along all the options.
            return executeDevServerBuilder(options, context);
        })
    );
}

export default createBuilder(buildCustomServe);