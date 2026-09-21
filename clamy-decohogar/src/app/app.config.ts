import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { authInterceptor } from './core/interceptors/auth-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Angular keeps the previous scroll offset across navigations by default,
    // so opening a product from halfway down the catalogue landed you halfway
    // down the detail page. 'enabled' scrolls to the top on a new navigation
    // but restores the saved offset on back/forward, so returning to the
    // catalogue puts you back where you left off. anchorScrolling keeps the
    // hero's "#categorias" jump working under that policy.
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
    provideClientHydration(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
  ],
};
