# GTPCS Ticket System Setup

This folder contains the Google Apps Script used by the custom GTPCS request form on the website.

The website form submits to an Apps Script Web App. The script writes the request to the GTPCS purchase request sheet, creates a ticket ID, sets `Ticket Status` to `New`, and emails `gtpcca@gmail.com`.

## Current GTPCS Sheet

Spreadsheet ID:

`1IAUdWy1FdKKoTHgMCI11Kr9Ic73Vq9Skdc2vSLwxOSI`

Notification email:

`gtpcca@gmail.com`

## Important Form Separation

Do not embed or publicly link the internal inventory/product uploader form. That form is for GTPCS product management only.

The website should use the custom `/request/` form that posts to this Apps Script Web App.

The inventory spreadsheet and request spreadsheet are separate:

- Inventory/catalog sheet: used only by `CONFIG.inventoryCsvUrl` in the website.
- Purchase request sheet: used only by `TICKET_SPREADSHEET_ID` in this Apps Script.

## Setup

1. Go to https://script.new
2. Sign in as the Google account that owns the GTPCS sheet.
3. Paste the contents of `setup-gtpcs-tracking.gs`.
4. Save the project as `GTPCS Ticket System`.
5. Confirm `TICKET_SPREADSHEET_ID` is:

```txt
1IAUdWy1FdKKoTHgMCI11Kr9Ic73Vq9Skdc2vSLwxOSI
```

6. Run `setupGTPCSTrackingSheetsStandalone`.
7. Approve permissions.
8. Click `Deploy` then `New deployment`.
9. Select type: `Web app`.
10. Set:
   - Description: `GTPCS Website Request Form`
   - Execute as: `Me`
   - Who has access: `Anyone`
11. Click `Deploy`.
12. Copy the Web App URL.
13. In website `config.js`, replace:

```js
appsScriptWebAppUrl: "PASTE_DEPLOYED_APPS_SCRIPT_WEB_APP_URL_HERE"
```

with the deployed Web App URL.

14. Open the deployed Web App URL in a browser. It should say:

```txt
GTPCS Ticket System is running for spreadsheet 1IAUdWy1FdKKoTHgMCI11Kr9Ic73Vq9Skdc2vSLwxOSI.
```

If it shows a Google `Page Not Found`, permissions error, or the wrong spreadsheet ID, the website will not submit requests correctly.

15. Confirm the `PUBLIC_FORM_TOKEN` in Apps Script matches `requestFormToken` in website `config.js`.
16. Submit a test request through `https://gtpcs.ca/request/`.
17. Confirm that `gtpcca@gmail.com` receives an email.
18. Confirm that the response row appears in the purchase request sheet, not the inventory sheet.
19. Confirm that the response row gets `Ticket ID` and `Ticket Status = New`.

## What The Script Does

- Handles website form submissions through `doPost`.
- Sends a confirmation message back to the website request page after success or failure.
- Rejects filled honeypot submissions.
- Rejects missing/invalid name, email, or message submissions.
- Checks the public form token before writing to the sheet.
- Rate-limits repeated submissions with Apps Script `CacheService`.
- Opens the GTPCS purchase request spreadsheet by ID.
- Creates or prepares `Form Responses`.
- Creates or prepares `Order Tracking`.
- Adds dropdowns for ticket, order, payment, fulfillment, and carrier statuses.
- Sends an email notification to `gtpcca@gmail.com` on each website form submission.
- Adds or updates these request fields:
  - `Ticket ID`
  - `Ticket Status`
  - `Internal Notes`
  - `Linked Order ID`

## Do Not Use A Spreadsheet Trigger

This script is for the website Web App only. Do not add a spreadsheet `On form submit` trigger for this script.

If requests are still landing in the inventory sheet:

1. Open Apps Script for any old project connected to the inventory sheet.
2. Go to `Triggers`.
3. Delete old `On form submit` triggers for GTPCS ticket/email handling.
4. Open the Web App script project.
5. Confirm the code uses `TICKET_SPREADSHEET_ID = "1IAUdWy1FdKKoTHgMCI11Kr9Ic73Vq9Skdc2vSLwxOSI"`.
6. Deploy a new Web App version or edit the existing deployment to use the latest version.
7. Confirm website `config.js` uses that deployed Web App URL.

## Important Notes

- The website itself does not send email directly.
- GitHub Pages is static and cannot securely send email by itself.
- Email notifications are handled by Google Apps Script after website form submission.
- Do not put private keys, API keys, passwords, buyer private data, supplier data, internal costs, or profit notes in the website repository.
- Keep buyer request data in the private Google Sheet, not in this public website repository.
- The form token is public because it is included in static website JavaScript. It blocks basic random POSTs, but it is not a secret.
- This is a catalog and request workflow only. Do not add checkout or cart handling to this script.
