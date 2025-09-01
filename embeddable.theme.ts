import { defineTheme } from "@embeddable.com/core";
import { Theme } from "@embeddable.com/vanilla-components";

const themeProvider = (clientContext: any, parentTheme: Theme): Theme => {
  /*
   * This allows for switching between the default and custom theme in the
   * builder based on presets/client-contexts.cc.yml. You can remove this
   * code if you don't want to do theme switching.
   */
  if (clientContext?.theme === "default") {
    return parentTheme;
  }

  /*
   * This theme can be as simple or complex as you need it to be
   * Full list of theme options can be found in the Theme interface
   */
  const theme = defineTheme(parentTheme, {
    brand: {
      primary: "#008348",
      secondary: "#BA9653",
    },
    charts: {
      colors: [
        "#c7522a",
        "#e5c185",
        "#f0daa5",
        "#fbf2c4",
        "#b8cdab",
        "#74a892",
        "#008585",
        "#004343",
      ],
      /* Custom overrides for certain charts */
      bar: {
        borderRadius: 10,
        borderWidth: 0,
        colors: [
          "#555d8e",
          "#566f94",
          "#56819b",
          "#5494a1",
          "#62a4a7",
          "#7db2ac",
          "#97c0b0",
          "#b1ceb5",
        ],
        font: {
          size: 12,
        },
      },
      pie: {
        colors: [
          "#ffa600",
          "#ff8531",
          "#ff6361",
          "#de5a79",
          "#bc5090",
          "#8a508f",
          "#58508d",
          "#003f5c",
        ],
      },
      /* End custom chart overrides */
    },
    font: {
      family: "Noto Serif",
    },
  }) as Theme;
  return theme;
};

export default themeProvider;
