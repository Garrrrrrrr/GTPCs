# GTPCS Ticket System Setup

This folder contains the Google Apps Script used to turn GTPCS Google Form submissions into ticket notifications and a manual order tracking workflow.

Use the public `GTPCS Purchase Request` Google Form for website requests:

`https://forms.gle/6ZjVyjMfxCoT7g6G9`

Do not embed or publicly link the internal inventory/product uploader form. That form is for GTPCS product management only.

## Setup

1. Go to https://script.new
2. Sign in as the Google account that owns the GTPCS sheet/form.
3. Paste the contents of `setup-gtpcs-tracking.gs`.
4. Save the project as `GTPCS Ticket System`.
5. Run `setupGTPCSTrackingSheetsStandalone`.
6. Approve permissions.
7. Add a trigger:
   - Function: `sendNewTicketEmail`
   - Event source: `From spreadsheet`
   - Event type: `On form submit`
8. Submit a test request through the website/form.
9. Confirm that `gtpcca@gmail.com` receives an email.
10. Confirm that the response row gets `Ticket ID` and `Ticket Status = New`.

## What The Script Does

- Opens the GTPCS spreadsheet by ID.
- Creates or prepares `Form Responses`.
- Creates or prepares `Order Tracking`.
- Adds dropdowns for ticket, order, payment, fulfillment, and carrier statuses.
- Sends an email notification to `gtpcca@gmail.com` on each Google Form submission.
- Adds or updates these response-row fields:
  - `Ticket ID`
  - `Ticket Status`
  - `Internal Notes`
  - `Linked Order ID`

## Important Notes

- The website itself does not send email directly.
- GitHub Pages is static and cannot securely send email by itself.
- Email notifications are handled by Google Apps Script after Google Form submission.
- Do not put private keys, API keys, passwords, buyer private data, supplier data, internal costs, or profit notes in the website repository.
- This is a catalog and request workflow only. Do not add checkout or cart handling to this script.
