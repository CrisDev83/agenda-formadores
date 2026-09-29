// Importa a função 'defineConfig' do Vite, usada para fornecer suporte e autocompletar de tipos nas configurações
import { defineConfig } from 'vite';

// Importa o plugin oficial do React para o Vite, que permite compilar sintaxe JSX e suporta Fast Refresh (atualização em tempo real na tela)
import react from '@vitejs/plugin-react';

// Exporta as configurações do projeto para que o servidor do Vite possa lê-las durante o desenvolvimento e no build
export default defineConfig({
  // Define os plugins que o Vite vai utilizar durante a execução do projeto (neste caso, habilita o suporte ao React)
  plugins: [react()],
  
  // Define o caminho base dos arquivos compilados. Usar './' garante caminhos relativos para os arquivos JS e CSS, 
  // essencial para que o projeto funcione perfeitamente ao ser hospedado no GitHub Pages em uma subpasta
  base: './',
});