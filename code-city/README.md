# Code City

An interactive, dependency-free 3D visualization of this repository. Every source file is a building, building height represents physical lines of code, color represents file type, and top-level folders form districts. Click a building to open that file's source code with line numbers.

## Run

From the repository root:

```powershell
node code-city/generate-data.mjs
npx serve code-city
```

You can also open `code-city/index.html` directly in a browser.

Regenerate `code-data.js` after source files change to refresh the city.
