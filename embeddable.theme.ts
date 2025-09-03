import { defineTheme } from "@embeddable.com/core";
import { Theme, DeepPartial } from "@embeddable.com/remarkable-ui";

const blueColors = [
  "#0d1a26",
  "#17375e",
  "#205493",
  "#2878c6",
  "#3a99e5",
  "#6bb7f5",
  "#a3d4fa",
  "#d2ecfd",
];

const greenColors = [
  "#0d261a",
  "#176e3a",
  "#209356",
  "#28c678",
  "#3ae59a",
  "#6bf5b7",
  "#a3fad4",
  "#d2fde9",
];

const englishTheme: DeepPartial<Theme> = {
  id: "englishTheme", // Use id whenever you define a custom theme. This will handle the assign of colors to dimensions
  i18n: {
    language: "en",
    translations: {
      en: {
        translation: {
          welcomeToEmbeddable: "Welcome to Embeddable",
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
  id: "germanTheme", // Use id whenever you define a custom theme. This will handle the assign of colors to dimensions
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
