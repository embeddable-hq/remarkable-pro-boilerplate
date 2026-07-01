import { useTheme } from '@embeddable.com/react';
import { Markdown } from '@embeddable.com/remarkable-ui';
import { Theme, i18nSetup, resolveI18nProps } from '@embeddable.com/remarkable-pro';

type Props = {
  title?: string;
  markdown?: string;
};

// Even a presentational component wires the Pro i18n layer so titles/strings
// are translated and match the rest of the dashboard.
const ExampleCallout = (props: Props) => {
  const theme = useTheme() as Theme;
  i18nSetup(theme);
  const { title, markdown } = resolveI18nProps(props);

  return (
    <div style={{ padding: 16 }}>
      {title && <h3 style={{ margin: '0 0 8px', color: 'var(--em-sem-text)' }}>{title}</h3>}
      <Markdown content={markdown} />
    </div>
  );
};

export default ExampleCallout;
