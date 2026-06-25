# GTPCS Inventory Uploader Form

This script builds and maintains the private internal Google Form used to update website inventory.

It is separate from the public purchase request form.

## What It Does

The form starts with:

```txt
What do you want to do?
```

The answer branches to different sections:

- `Add new item`
- `Mark item sold / out of stock`

The `Add new item` section asks for product details needed by the website catalog.

It also asks for quantity. Use `1` for one-off PC builds or unique used items.

The add-item section includes image URL fields and the manual image upload placement note for every category.

If the category is `Gaming PCs`, the form then continues to a dedicated PC specs section for CPU, GPU, motherboard, RAM, storage, PSU, case, cooling, and OS.

If the category is `GPUs`, `Motherboards`, or `Parts`, the form skips the PC specs section and goes directly to the final submit section.

The form is generated so the add-item path does not continue into the mark-sold section.

The generated add-item section includes URL fields and a reminder to add the upload field manually. Google Forms file-upload questions must be added in the Google Forms editor.

Add a file-upload question in the `Add Inventory Item` section with this exact title:

```txt
Product images
```

Uploaded files from that question are automatically made viewable by link and written into the inventory row's `image_url` and `image_urls` fields when the form is submitted. The website can then display them through its existing Google Drive image handling.

Uploaded files are moved into a Google Drive folder named after the product before they are saved. They are also sorted by their Google Drive filename before being written to the sheet. The sorting is numeric-aware, so filenames like `1`, `2`, and `10` display in that order instead of putting `10` first.

The `Mark item sold / out of stock` section asks only for:

- the in-stock item to update
- the new status
- an optional internal note

The in-stock item list is synced from the inventory spreadsheet, so the dropdown contains current `In Stock` catalog items.

## Important Design Choice

Do not link this form's raw responses directly into the public inventory database tab.

The form stores its own responses. The Apps Script submit handler writes only clean public catalog fields into the inventory database. This prevents Google Form response columns from corrupting the website inventory table.

During setup, the script attempts to remove any existing form response destination from the uploader form. Do not reconnect the uploader form directly to the inventory database tab.

## Inventory Spreadsheet

The script updates this spreadsheet:

```txt
1KzVm-sNSR8SI-3_tcHJSE9bxWvNKSWcfBymlG6Ti6L8
```

Inventory tab gid:

```txt
190180623
```

## Setup

1. Go to https://script.new
2. Paste the contents of `setup-inventory-uploader-form.gs`.
3. Save the project as `GTPCS Inventory Uploader`.
4. Run:

```js
setupGTPCSInventoryUploaderForm()
```

5. Approve permissions.
6. Open `Executions` or `Logs`.
7. Copy the logged `Inventory uploader edit URL` and `Inventory uploader public URL`.
8. Open the edit URL and go to the `Add Inventory Item` section.
9. Add a File upload question titled exactly `Product images` directly below the `Image uploads` note.
10. Configure it for image files and the number of files you want to allow.
11. Keep the public URL private/internal. Do not put it on the website.

The setup function also installs:

- a form submit trigger for `handleGTPCSInventoryUploaderSubmit`
- an hourly sync trigger for `syncGTPCSInventoryUploaderChoices`

## Existing Form

If you want to rebuild an existing inventory uploader form instead of creating a new one:

1. Open the form edit URL.
2. Copy the long form ID from the URL.
3. Paste it into:

```js
const INVENTORY_UPLOADER_FORM_ID = "PASTE_FORM_ID_HERE";
```

4. Run:

```js
setupGTPCSInventoryUploaderForm()
```

The short `forms.gle` link is not the edit ID. Use the long edit URL.

Running `setupGTPCSInventoryUploaderForm()` rebuilds the generated form questions. If you run it again, re-add the manual `Product images` file-upload question afterward.

## Manual Sync

Run this any time you want to refresh the in-stock dropdown immediately:

```js
syncGTPCSInventoryUploaderChoices()
```

The script also syncs that dropdown hourly.

## Image Ordering

The website displays product images in the order stored in the `image_urls` cell. To manually rearrange a product gallery, reorder the lines in that cell and set `image_url` to the image you want used first on product cards.

To alphabetically re-sort an existing product's current image URLs by Google Drive filename and move the Drive files into a folder named after the product, paste the latest script into Apps Script and run:

```js
sortGTPCSInventoryImagesBySku("SKU-HERE")
```

## Notes

- This is for internal product management only.
- Do not publish or link this form publicly.
- The website continues reading inventory from the CSV URL.
- Marking an item sold updates `status` and `updated_at`.
- Adding an item appends a new row with the website's expected inventory columns.
