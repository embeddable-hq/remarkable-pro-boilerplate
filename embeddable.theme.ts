import { defineTheme } from "@embeddable.com/core";
import { Theme, DeepPartial } from "@embeddable.com/remarkable-pro";
import { darkThemeStyles } from "./themes/dark.theme";
import { auroraThemeStyles } from "./themes/aurora.theme";

const darkTheme: DeepPartial<Theme> = {
  styles: darkThemeStyles,
};

const auroraTheme: DeepPartial<Theme> = {
  styles: auroraThemeStyles,
};

const themeProvider = (
  clientContext: { theme?: string } | undefined,
  parentTheme: Theme
): Theme => {
  let newTheme: DeepPartial<Theme>;

  if (clientContext?.theme === "dark") {
    newTheme = darkTheme;
  } else if (clientContext?.theme === "aurora") {
    newTheme = auroraTheme;
  } else {
    // Default to parent theme
    newTheme = {};
  }
  const theme = defineTheme(parentTheme, newTheme) as Theme;
  return theme;
};

export default themeProvider;
