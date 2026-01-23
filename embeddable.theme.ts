import { defineTheme } from "@embeddable.com/core";
import { Theme, DeepPartial } from "@embeddable.com/remarkable-pro";
import { darkTheme } from "./dark-theme";

const themeProvider = (clientContext: any, parentTheme: Theme): Theme => {
  return defineTheme(parentTheme, 
    clientContext.theme === "dark" 
      ? darkTheme 
      : {
        // learn more here: https://docs.embeddable.com/component-libraries/remarkable-pro/theming
      }
  );
};

export default themeProvider;
