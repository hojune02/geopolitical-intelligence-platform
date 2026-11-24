import type { CountryInfo } from '../../lib/countries';

interface CountryMarkProps {
  country: CountryInfo;
}

/*
 * A monochrome country tag (e.g. "KR") instead of an emoji flag. Emoji
 * flags render as tiny images on macOS and as bare letters on Windows,
 * and their colour fights the black-and-white design.
 */
export function CountryMark({ country }: CountryMarkProps) {
  if (country.iso2 === null) {
    return null;
  }

  return (
    <abbr className="country-mark" title={country.name}>
      {country.iso2}
    </abbr>
  );
}
