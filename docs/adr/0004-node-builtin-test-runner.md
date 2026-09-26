# Test the game rules with Node's built-in test runner

The simulation runs in Node using `node:test` and `node:assert`, so the project gains no test-framework dependency. The obvious choice — Vitest or Jest — was declined: it brings a large dependency tree, and this project is held to carrying no third-party packages beyond what React and the build tool need. The tests exercise the simulation and never open a browser, which keeps them fast; a browser-driving test layer would be a separate, later decision.
