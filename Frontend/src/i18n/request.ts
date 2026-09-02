import { headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, isAppLocale } from "./config";
import englishMessages from "../../messages/en.json";
import arabicMessages from "../../messages/ar.json";

export default getRequestConfig(async () => {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get("x-primex-locale");
  const locale = isAppLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  const messages = locale === "ar" ? arabicMessages : englishMessages;

  return {
    locale,
    messages,
    timeZone: "Africa/Cairo",
  };
});
