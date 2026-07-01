import { useTheme } from '@embeddable.com/react';
import { DataResponse, Dimension } from '@embeddable.com/core';
import {
  Theme,
  getThemeFormatter,
  resolveI18nProps,
  i18n,
  EditorCard,
  EditorCardHeaderProps,
} from '@embeddable.com/remarkable-pro';
import { SingleSelectField } from '@embeddable.com/remarkable-ui';

type Props = {
  dimension: Dimension;
  placeholder?: string;
  results: DataResponse;
  selectedValue?: string;
  setSearchValue?: (search: string) => void;
  onChange?: (selectedValue: string | null) => void;
} & EditorCardHeaderProps;

const ExampleValueDropdown = (props: Props) => {
  const theme = useTheme() as Theme;
  const themeFormatter = getThemeFormatter(theme);

  const { title, description, dimension, placeholder, tooltip } = resolveI18nProps(props);
  const { results, selectedValue, setSearchValue, onChange } = props;

  const options =
    results.data?.map((row) => ({
      value: row[dimension.name],
      label: themeFormatter.data(dimension, row[dimension.name]),
    })) ?? [];

  const showNoOptions = Boolean(!results.isLoading && (results.data?.length ?? 0) === 0);

  return (
    <EditorCard title={title} description={description} tooltip={tooltip}>
      <SingleSelectField
        clearable
        searchable
        isLoading={results.isLoading}
        value={selectedValue}
        options={options}
        placeholder={placeholder}
        noOptionsMessage={showNoOptions ? i18n.t('common.noOptionsFound') : undefined}
        // Selecting a value fires the event (-> variable). Typing calls setSearchValue (-> internal re-query).
        onChange={(newValue) => onChange?.(newValue as string | null)}
        onSearch={setSearchValue}
        avoidCollisions={false}
      />
    </EditorCard>
  );
};

export default ExampleValueDropdown;
