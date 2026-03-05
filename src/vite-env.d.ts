/// <reference types="vite/client" />

declare module 'virtual:characters' {
  const characters: Array<{ id: string; name: string; spriteKey: string }>;
  export default characters;
}
