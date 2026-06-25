# GTPCS Ticket And Order Tracking Reset

This script repairs the private purchase request spreadsheet used by the GTPCS website request form.

Ticket/request spreadsheet ID:

```txt
1IAUdWy1FdKKoTHgMCI11Kr9Ic73Vq9Skdc2vSLwxOSI
```

It matches the current website ticket script in `setup-gtpcs-tracking.gs`.

## Sheets It Repairs

The script repairs these tabs:

```txt
Form Responses
Order Tracking
```

## Safe Reset

Use this first.

```js
resetGTPCSTicketAndOrderTrackingSafe()
```

It will:

- Open the ticket/request spreadsheet.
- Back up the current `Form Responses` tab.
- Back up the current `Order Tracking` tab.
- Rebuild expected headers, formatting, filters, formulas, and dropdowns.
- Preserve existing rows when their columns can be matched by header name.

## Blank Reset

Only use this if the existing input is unusable and you want both tabs cleaned out.

```js
resetGTPCSTicketAndOrderTrackingBlank()
```

It will:

- Back up both current tabs.
- Rebuild the expected ticket and order tracking structure.
- Remove all ticket/order rows from the active tabs.

## Expected Form Responses Columns

```txt
Timestamp
Request Type
Name
Email
Phone
Item/SKU
Item Requested
Pickup or Shipping
Payment Method
Message
Page URL
User Agent
Ticket ID
Ticket Status
Internal Notes
Linked Order ID
```

## Expected Order Tracking Columns

```txt
Order ID
Date Created
Source Ticket ID
Customer Name
Email
Phone
Item/SKU
Item Name
Order Status
Payment Status
Payment Method
Sale Price CAD
Amount Paid CAD
Balance Due CAD
Fulfillment
Carrier
Tracking Number
Ship/Pickup Date
Follow-up Date
Internal Notes
Last Updated
```

## Setup

1. Open the ticket/request spreadsheet.
2. Go to `Extensions` -> `Apps Script`.
3. Create or open a script file.
4. Paste the contents of `reset-ticket-order-tracking.gs`.
5. Save the project.
6. Run `resetGTPCSTicketAndOrderTrackingSafe`.
7. Approve permissions.
8. Confirm both tabs look correct.
9. Submit a website test request and confirm it lands in `Form Responses`.

## Notes

- This script is for the ticket/request spreadsheet only.
- It does not touch the public inventory spreadsheet.
- It does not send email.
- It does not deploy or change the website Web App.
- Backup tabs are kept in the spreadsheet so you can manually recover data if needed.
