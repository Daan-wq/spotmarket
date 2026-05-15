import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { getLocaleFromHost, isLocale, type Locale, LOCALE_COOKIE_NAME } from "./routing";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const forwardedLocale = headerStore.get("x-locale");
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const host = headerStore.get("x-host") ?? headerStore.get("host");

  let locale: Locale;
  if (isLocale(forwardedLocale)) {
    locale = forwardedLocale;
  } else if (isLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    locale = getLocaleFromHost(host);
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});
