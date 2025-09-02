import { defineTheme } from "@embeddable.com/core";
import { Theme, DeepPartial } from "@embeddable.com/remarkable-ui";

const colorSetBlue = [
  "#0d1a26",
  "#17375e",
  "#205493",
  "#2878c6",
  "#3a99e5",
  "#6bb7f5",
  "#a3d4fa",
  "#d2ecfd",
];

const colorSetGreen = [
  "#0d261a",
  "#176e3a",
  "#209356",
  "#28c678",
  "#3ae59a",
  "#6bf5b7",
  "#a3fad4",
  "#d2fde9",
];

const themeProvider = (clientContext: any, parentTheme: Theme): Theme => {
  /*
   * This allows for switching between the default and custom theme in the
   * builder based on presets/client-contexts.cc.yml. You can remove this
   * code if you don't want to do theme switching.
   */
  // if (clientContext?.theme === "default") {
  //   return parentTheme;
  // }

  /*
   * This theme can be as simple or complex as you need it to be
   * Full list of theme options can be found in the Theme interface
   */

  const colorSet =
    clientContext?.colorSet === "green" ? colorSetGreen : colorSetBlue;

  const newTheme: DeepPartial<Theme> = {
    i18n: {
      language: clientContext?.language || "en",
      translations: {
        en: {
          translation: {
            welcomeToEmbeddable: "Welcome to Embeddable",
          },
        },
        de: {
          translation: {
            welcomeToEmbeddable: "Willkommen bei Embeddable",
          },
        },
      },
    },
    formatter: {
      locale: clientContext?.locale || "en",
    },
    charts: {
      backgroundColors: colorSet,
      borderColors: colorSet,
    },
  };

  const theme = defineTheme(parentTheme, newTheme) as Theme;
  return theme;
};

export default themeProvider;
