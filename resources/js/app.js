import './bootstrap'; 
import '../css/app.css'; 

import { createInertiaApp, router } from '@inertiajs/react'; 
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'; 
import { createElement } from 'react'; 
import { createRoot } from 'react-dom/client'; 

const appName = import.meta.env.VITE_APP_NAME || 'Laravel'; 

createInertiaApp({ 
  title: (title) => title ? `${title} - ${appName}` : appName, 
  resolve: (name) =>
  resolvePageComponent(
    `./Pages/${name}.jsx`,
    import.meta.glob('./Pages/**/*.jsx')
  ),
  setup({ el, App, props }) {
    window.refreshCsrfToken?.(props?.initialPage?.props?.csrfToken); 

    router.on('success', (event) => {
      window.refreshCsrfToken?.(event?.detail?.page?.props?.csrfToken);
    }); 

    createRoot(el).render(createElement(App, props));
  }, 
  progress: { 
    color: '#2563eb'
  }
});
