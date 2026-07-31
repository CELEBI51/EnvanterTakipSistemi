import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    // Yerel agdan (test PC'lerinden) erisilebilsin.
    host: true,
    /**
     * Bilincli olarak PROXY YOK.
     * Uretimde API ayri bir origin'de calisacak; gelistirmede de ayni yoldan
     * gidilirse CORS ve cookie davranisi bastan dogrulanmis olur.
     * Adres VITE_API_URL ile verilir.
     */
  },
  build: {
    outDir: 'dist',
    // Uretimde kaynak haritasi sunmuyoruz.
    sourcemap: false,
    // Tum varliklar yerel; hicbir CDN referansi olusmamali.
    assetsInlineLimit: 4096,
  },
});
