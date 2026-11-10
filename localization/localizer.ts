import type { ReactiveControllerHost, ReactiveElement } from "lit";
import type { LocaleModule, MsgFn, MsgOptions, TemplateLike, TemplateMap } from "@lit/localize";
import { runtimeMsg } from "@lit/localize/internal/runtime-msg.js";
// @ts-ignore The Lit localization CLI generates this JavaScript module.
import { sourceLocale, targetLocales } from "./generated/locale-codes.js";

const supported = new Map<string, string>(
  [sourceLocale, ...targetLocales].map((locale: string) => [locale.toLowerCase(), locale]),
);
const defaults = new Map([
  ["bn", "bn-bd"], ["de", "de-de"], ["es", "es-es"], ["fa", "fa-ir"],
  ["fr", "fr-fr"], ["no", "nb"], ["pt", "pt-pt"],
]);

function resolveLocale(language: string): string {
  const tag = language.trim().replace(/_/g, "-").toLowerCase();
  if (!tag) return sourceLocale;
  const exact = supported.get(tag);
  if (exact) return exact;
  const [base] = tag.split("-");
  let locale = tag;
  while (locale.includes("-")) {
    const exact = supported.get(locale);
    if (exact) return exact;
    locale = locale.slice(0, locale.lastIndexOf("-"));
  }

  // Match the likely script and region before falling back to a generic language.
  try {
    const { language, script, region } = new Intl.Locale(tag).maximize();
    const likelyScript = script === "Aran" ? "arab" : script?.toLowerCase();
    const match = supported.get(`${language}-${likelyScript}`) ??
      supported.get(`${language}-${region?.toLowerCase()}`);
    if (match) return match;
  } catch {
    // Treat malformed tags like unsupported tags.
  }
  return supported.get(base) ?? supported.get(defaults.get(base) ?? "") ?? sourceLocale;
}

export const sourceMsg = ((template: TemplateLike, options?: MsgOptions) =>
  runtimeMsg(undefined, template, options)) as MsgFn;

function composedParent(element: Element): Element | null {
  const root = element.getRootNode();
  return element.assignedSlot ?? element.parentElement ?? ("host" in root ? root.host as Element : null);
}

export function nativeLanguageAttributes(element: Pick<typeof ReactiveElement, "elementProperties">, attributes: string[]) {
  // Legacy decorator metadata can reintroduce the inherited reflective language property during Lit finalization.
  element.elementProperties.set("lang", { attribute: false, noAccessor: true });
  return attributes.filter(name => name !== "lang");
}

export function effectiveLanguage(host: Element, observer?: MutationObserver): string {
  for (let element: Element | null = host; element; element = composedParent(element)) {
    observer?.observe(element, { attributes: true, attributeFilter: ["lang"] });
    const language = element.getAttribute("lang");
    if (language !== null) return language;
  }
  return "";
}

export function localizeElement(host: HTMLElement & ReactiveControllerHost, drawer = false): MsgFn {
  let templates: TemplateMap | undefined;
  let activeLocale = sourceLocale;
  let request = 0;
  let requestedLocale: string | undefined;

  const observer = new MutationObserver(updateLanguage);
  function updateLanguage() {
    observer.disconnect();
    const locale = resolveLocale(effectiveLanguage(host, observer));
    if (requestedLocale === locale) return;
    requestedLocale = locale;
    const revision = ++request;
    if (locale === activeLocale) return;
    const load = locale === sourceLocale
      ? Promise.resolve(undefined)
      : import(`./generated/${locale}.ts`) as Promise<LocaleModule>;
    void load.then(module => {
      if (revision !== request) return;
      activeLocale = locale;
      templates = module?.templates;
      host.requestUpdate();
      if (drawer) host.dispatchEvent(new Event("optionschange", { bubbles: true, composed: true }));
    }, error => {
      if (revision !== request) return;
      activeLocale = sourceLocale;
      templates = undefined;
      host.requestUpdate();
      if (drawer) host.dispatchEvent(new Event("optionschange", { bubbles: true, composed: true }));
      host.dispatchEvent(new CustomEvent("localizationerror", { detail: { locale, error } }));
    });
  }

  host.addController({
    hostConnected: updateLanguage,
    hostDisconnected() {
      observer.disconnect();
      ++request;
      requestedLocale = undefined;
    },
  });

  return ((template: TemplateLike, options?: MsgOptions) =>
    runtimeMsg(templates, template, options)) as MsgFn;
}
