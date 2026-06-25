# GTPCS Inventory Database Reset

This script repairs the public inventory spreadsheet used by the website catalog.

Inventory spreadsheet ID:

```txt
1KzVm-sNSR8SI-3_tcHJSE9bxWvNKSWcfBymlG6Ti6L8
```

Inventory tab gid used by the website CSV URL:

```txt
190180623
```

## What It Resets

The website expects the inventory tab to have these public columns, in this order:

```txt
sku
status
category
name
price_local
price_shipped
condition
short_description
description
specs
cpu
gpu
motherboard
ram
storage
psu
case
cooling
os
image_url
image_urls
created_at
updated_at
```

## Safe Reset

Use this first.

```js
resetGTPCSInventoryDatabaseSafe()
```

It will:

- Open the inventory spreadsheet.
- Find the inventory tab by gid `190180623`.
- Make a backup copy of the current tab.
- Rebuild the expected headers, formatting, dropdowns, and date/price formats.
- Preserve existing product rows when their columns can be matched by header name.

If a previous reset failed with `Cannot delete column with form data`, use the latest version of the script and run the restore function below. The failed run should have created a backup tab before it changed the active sheet.

```js
restoreGTPCSInventoryDatabaseFromLatestBackup()
```

It will:

- Find the newest backup tab with recoverable inventory rows.
- Back up the current active inventory tab again.
- Restore the inventory structure and rows from that backup.

## Blank Reset

Only use this if the sheet data is unusable and you want a clean empty inventory tab.

```js
resetGTPCSInventoryDatabaseBlank()
```

It will:

- Make a backup copy of the current tab.
- Rebuild the expected inventory structure.
- Remove all product rows from the active inventory tab.

## Setup

1. Open the inventory spreadsheet.
2. Go to `Extensions` -> `Apps Script`.
3. Create or open a script file.
4. Paste the contents of `reset-inventory-database.gs`.
5. Save the project.
6. Run `resetGTPCSInventoryDatabaseSafe`.
7. Approve permissions.
8. Confirm the website inventory page loads again.

## Notes

- This script is for the inventory spreadsheet only.
- It does not touch the purchase request/ticket spreadsheet.
- It does not send email.
- It does not expose buyer information.
- The backup tab is kept in the spreadsheet so you can manually recover any data if needed.
- The script does not delete extra form-linked columns. It clears and hides them because Google Sheets blocks deleting columns that contain form response data.
- Filter creation is skipped automatically if Google Sheets reports that the range intersects a table.
