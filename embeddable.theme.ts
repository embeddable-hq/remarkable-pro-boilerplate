import { defineTheme } from "@embeddable.com/core";
import { Theme, DeepPartial } from "@embeddable.com/remarkable-ui";

const blueColors = [
  "#d2ecfd",
  "#a3d4fa",
  "#6bb7f5",
  "#3a99e5",
  "#2878c6",
  "#205493",
  "#17375e",
  "#0d1a26",
];

const redColors = [
  "#fde2e2",
  "#fab3b3",
  "#f57a7a",
  "#e53a3a",
  "#c62828",
  "#931f1f",
  "#6e1515",
  "#260a0a",
];

const greenColors = [
  "#d2fde9",
  "#a3fad4",
  "#6bf5b7",
  "#3ae59a",
  "#28c678",
  "#209356",
  "#176e3a",
  "#0d261a",
];

const englishTheme: DeepPartial<Theme> = {
  i18n: {
    language: "en",
    translations: {
      en: {
        translation: {
          welcomeToEmbeddable: "Welcome to Embeddable",
          // measure: {
          //   "customers.count": "NEW customers count",
          //   "orders.count": "NEW orders count",
          // },
          // dimension: {
          //   "customers.country": "NEW customers country",
          // },
        },
      },
    },
  },
  formatter: {
    locale: "en",
  },
  charts: {
    backgroundColors: greenColors,
    borderColors: greenColors,
  },
};

const germanTheme: DeepPartial<Theme> = {
  i18n: {
    language: "de",
    translations: {
      de: {
        translation: {
          welcomeToEmbeddable: "Willkommen bei Embeddable",
        },
      },
    },
  },
  formatter: {
    locale: "de",
  },
  charts: {
    backgroundColors: blueColors,
    borderColors: blueColors,
  },
};

const themeProvider = (clientContext: any, parentTheme: Theme): Theme => {
  // This allows for switching between the default and custom theme in the
  // builder based on presets/client-contexts.cc.yml. You can remove this
  // code if you don't want to do theme switching.

  // if (clientContext?.theme === "default") {
  //   return parentTheme;
  // }

  // There are 2 ways to style the theme:
  // 1. Define different themes (as js objects) and switch between them as shown below using the clientContext params
  const newTheme =
    clientContext?.theme === "german" ? germanTheme : englishTheme;

  // 2. Dynamically change parts of the theme
  // 2.1. Define new theme properties based on the clientContext params
  const newThemeBasedOnClientConter: DeepPartial<Theme> = {
    formatter: { locale: clientContext?.locale || "fr" },
    i18n: {
      language: clientContext?.language || "fr",
      translations: {
        fr: {
          translation: {
            welcomeToEmbeddable: "Bienvenue chez Embeddable",
          },
        },
      },
    },
  };

  // 2.2. Define new theme properties based on the default parent theme
  const newThemeBasedOnTheParentTheme: DeepPartial<Theme> = {
    charts: {
      chartCardMenuPro: {
        options: parentTheme.charts?.chartCardMenuPro?.options?.reverse() || [],
      },
      backgroundColors: [
        ...(parentTheme.charts?.backgroundColors ?? []),
        "red",
      ],
    },
  };

  const theme = defineTheme(parentTheme, newTheme) as Theme;
  return theme;
};

export default themeProvider;
