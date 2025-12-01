import { defineTheme } from "@embeddable.com/core";
import { Theme, DeepPartial } from "@embeddable.com/remarkable-pro";
import { darkTheme } from "./dark-theme";
import { auroraThemeStyles } from "./aurora-theme";


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
