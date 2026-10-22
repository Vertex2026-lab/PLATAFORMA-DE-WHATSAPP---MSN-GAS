import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public", { recursive: true });
for (const file of ["index.html", "style.css", "app.js", "runtime.js"]) {
  await copyFile(file, `public/${file}`);
}
console.log(
  "Interface compilada em public/. As funções api/ são publicadas pela Vercel.",
);
