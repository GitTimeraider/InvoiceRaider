const CITY_FIRST_POSTAL_COUNTRIES = new Set([
  "US",
  "GB",
  "BR",
  "AU",
  "CA",
  "NZ",
  "IE",
  "MX",
]);

export function formatPostalCityLine(
  city?: string,
  postalCode?: string,
  countryCode?: string,
  format?: string,
): string {
  const place = (city || "").trim();
  const postal = (postalCode || "").trim();
  const country = (countryCode || "").trim().toUpperCase();
  
  if (!place && !postal) return "";
  if (!place && !postal) return country;
  
  let line = "";
  if (format === "city-postal") {
    line = postal ? `${place} ${postal}` : place;
  } else if (format === "postal-city") {
    line = `${postal} ${place}`;
  } else {
    if (CITY_FIRST_POSTAL_COUNTRIES.has(country)) {
      line = postal ? `${place} ${postal}` : place;
    } else {
      line = postal ? `${postal} ${place}` : place;
    }
  }
  
  return country ? `${line}, ${country}` : line;
}
