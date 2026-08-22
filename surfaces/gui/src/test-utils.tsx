// Test-only render helper: wraps components in <I18nProvider> so any component
// that calls useT() has a context. Mirrors @testing-library/react's render but
// injects the i18n provider. Tests that need to assert on localized text should
// import { render } from here instead of from "@testing-library/react".
import type { ReactElement } from "react";
import { render as rtlRender } from "@testing-library/react";
import { I18nProvider } from "./i18n/I18nProvider";

export function render(ui: ReactElement) {
  const view = rtlRender(<I18nProvider>{ui}</I18nProvider>);
  // Wrap rerender too — a bare rerender would swap out the whole tree and drop
  // the I18nProvider, crashing any useT() component on the second render.
  return {
    ...view,
    rerender: (next: ReactElement) => view.rerender(<I18nProvider>{next}</I18nProvider>),
  };
}

// Re-export the rest of the RTL surface so tests can keep one import line.
// `render` is intentionally NOT re-exported — the wrapped version above wins.
export {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";
