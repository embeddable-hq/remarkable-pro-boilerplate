import { defineTheme, EmbeddableTheme } from '@embeddable.com/core';
import { Theme } from '@embeddable.com/remarkable-pro';
import { darkTheme } from './dark-theme';
import { embeddableTranslations } from './embeddable-translations';

type AppTheme = Theme & EmbeddableTheme;

const themeProvider = (clientContext: any, parentTheme: Theme): AppTheme => {
  const language = clientContext.language ?? 'en';

  return defineTheme<AppTheme>(parentTheme, {
    ...(clientContext.theme === 'dark'
      ? darkTheme
      : {
          // learn more here: https://docs.embeddable.com/component-libraries/remarkable-pro/theming
        }),
    i18n: { language },
    embeddableApp: {
      i18n: { language, translations: embeddableTranslations },
    },
  });
};

export default themeProvider;
