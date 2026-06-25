# GTPCS Ticket System Setup

This folder contains the Google Apps Script used by the custom GTPCS request form on the website.

The website form submits to an Apps Script Web App. The script writes the request to the GTPCS Google Sheet, creates a ticket ID, sets `Ticket Status` to `New`, and emails `gtpcca@gmail.com`.

## Current GTPCS Sheet

Spreadsheet ID:

`1KzVm-sNSR8SI-3_tcHJSE9bxWvNKSWcfBymlG6Ti6L8`

Notification email:

`gtpcca@gmail.com`

## Important Form Separation

Do not embed or publicly link the internal inventory/product uploader form. That form is for GTPCS product management only.

The website should use the custom `/request/` form that posts to this Apps Script Web App.

## Setup

1. Go to https://script.new
2. Sign in as the Google account that owns the GTPCS sheet.
3. Paste the contents of `setup-gtpcs-tracking.gs`.
4. Save the project as `GTPCS Ticket System`.
5. Run `setupGTPCSTrackingSheetsStandalone`.
6. Approve permissions.
7. Click `Deploy` then `New deployment`.
8. Select type: `Web app`.
9. Set:
   - Description: `GTPCS Website Request Form`
   - Execute as: `Me`
   - Who has access: `Anyone`
10. Click `Deploy`.
11. Copy the Web App URL.
12. In website `config.js`, replace:

```js
appsScriptWebAppUrl: "PASTE_DEPLOYED_APPS_SCRIPT_WEB_APP_URL_HERE"
```

with the deployed Web App URL.

13. Submit a test request through `https://gtpcs.ca/request/`.
14. Confirm that `gtpcca@gmail.com` receives an email.
15. Confirm that the response row gets `Ticket ID` and `Ticket Status = New`.

## What The Script Does

- Handles website form submissions through `doPost`.
- Opens the GTPCS spreadsheet by ID.
- Creates or prepares `Form Responses`.
- Creates or prepares `Order Tracking`.
- Adds dropdowns for ticket, order, payment, fulfillment, and carrier statuses.
- Sends an email notification to `gtpcca@gmail.com` on each website form submission.
- Adds or updates these request fields:
  - `Ticket ID`
  - `Ticket Status`
  - `Internal Notes`
  - `Linked Order ID`

## Optional Spreadsheet Trigger

The file still includes `sendNewTicketEmail(e)` for spreadsheet form-submit trigger compatibility. The custom website form does not require that trigger because `doPost` sends the notification directly.

## Important Notes

- The website itself does not send email directly.
- GitHub Pages is static and cannot securely send email by itself.
- Email notifications are handled by Google Apps Script after website form submission.
- Do not put private keys, API keys, passwords, buyer private data, supplier data, internal costs, or profit notes in the website repository.
- This is a catalog and request workflow only. Do not add checkout or cart handling to this script.
