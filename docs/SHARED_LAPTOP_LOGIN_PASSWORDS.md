# Saved login suggestions on shared laptops

The dropdown in the client screenshot appears to be Chrome Password Manager. Chrome can offer credentials saved on the device or available through the signed-in Google Account. The screenshot does not establish how the entries reached that laptop. [Google's password-management guide](https://support.google.com/chrome/answer/95606?hl=en)

## Application changes

- Password and OTP login forms request `autocomplete="off"` for their identifier fields; the password field also requests it.
- The password login form no longer offers **Remember me**. Password login, two-factor verification, and standalone OTP login use the existing session-storage refresh-token option. A successful login removes the previous local-storage refresh token through the existing storage helper.
- After a password-login response, including failure or an OTP challenge, the password field is cleared and visibility is reset to hidden. The login mutation is reset after its response callbacks finish.
- Verification mutations are reset after their response callbacks. Authentication mutations use immediate garbage collection when unused, reducing retention of password/OTP request variables and errors in the query cache.
- Existing authentication schemas, API services, Redux state, shared inputs/buttons, and refresh-token storage helpers are reused.

The login frontend does not write the typed password to localStorage or sessionStorage. Refresh/session tokens are separate from passwords. The backend's authentication, password storage, cookies, token expiry, authorization rules, and mobile API contracts were not changed. Session storage does not override the backend cookie policy or guarantee logout when Chrome closes.

## Required action on the affected laptop

1. In Chrome, open **Menu → Passwords and autofill → Google Password Manager**.
2. Under **Passwords**, find the CRM website and delete the unwanted saved CRM account entries. Review the signed-in Chrome/Google Account first; entries saved to that account may also be available on its other devices.
3. Under **Settings**, turn off **Offer to save passwords and passkeys** and **Sign in automatically**.
4. Use a separate Chrome profile/Google Account for the salesperson rather than sharing an administrator's browser account. Reopen the CRM login page and verify the CRM entries are no longer suggested.

Turning off password saving alone does not delete existing entries. Turning off automatic sign-in alone does not remove the saved-account dropdown. Google's guide documents saved-password deletion, account/device storage, saving preferences, and automatic sign-in. [Google Chrome Help](https://support.google.com/chrome/answer/95606?hl=en)

## Browser limitation

`autocomplete="off"` is a browser request, not enforcement. Modern browsers may still offer to save or fill login passwords. A website cannot erase Google Password Manager entries or prevent users/extensions from saving credentials manually. Enforcing a company-wide browser rule requires administration of the employees' browsers/devices; a CRM workspace setting cannot provide that control. [MDN: turning off form autocompletion](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Turning_off_form_autocompletion)

## Verification

The three focused login/OTP/auth-service suites pass: **22 tests**. Regression assertions cover browser autocomplete hints, removal of Remember me, session-only application refresh-token storage, clearing a previously persistent token after login, password clearing on failure, and empty authentication mutation cache after completion. Focused ESLint and the web production build pass; the existing bundle-size warning remains.

Existing auth rendering assertions were updated to the current tenant-neutral `Brand Logo` accessible name; no production branding was changed. No passwords were read from or deleted in the client's browser, and the actual affected-laptop dropdown was not tested remotely.
