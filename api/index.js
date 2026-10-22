// One explicit entry point for all API paths on Vercel.
export { default } from "../lib/handler.js";
export const config = { api: { bodyParser: false } };
