import { defineTheme } from "@embeddable.com/core";
import { Theme, DeepPartial } from "@embeddable.com/remarkable-pro";
import { darkTheme } from "./dark-theme";

const themeProvider = (clientContext: any, parentTheme: Theme): Theme => {
  const newTheme: DeepPartial<Theme> =
    clientContext.theme === "dark"
      ? darkTheme
      : {
          styles: {
            "--em-sem-chart-color--1": "red",
          },
        };
  const theme = defineTheme(parentTheme, newTheme) as Theme;
  return theme;
};

export default themeProvider;
