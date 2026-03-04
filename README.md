# Bitespeed Identity Reconciliation — Backend Assignment

This is my submission for the Bitespeed Backend Task. The goal was to build a single API endpoint `/identify` that can figure out if a customer contacting us is someone we already know, even if they use a different email or phone number than before.

---

## Video Walkthrough

I recorded a quick walkthrough where I explain my approach, go through the cases, and demo the API live.

[Watch here](https://youtu.be/8ObqCRrRp9Q)

---
<img width="1272" height="750" alt="image" src="https://github.com/user-attachments/assets/8fea884e-787d-4b73-9b5c-762a55e835ab" />


## Problem Statement

So basically the idea is — a customer might place multiple orders using different emails or phone numbers, but they're still the same person. We need to link all of those together and always return a consolidated view.

Each contact has:
- `email` (optional)
- `phoneNumber` (optional)
- `linkPrecedence` — either `primary` or `secondary`
- `linkedId` — points to the primary contact if this is a secondary

The oldest contact in a group is always the `primary`, and everything else linked to it is `secondary`.

---

## Tech Stack

- **Node.js + Express** — for the server
- **TypeScript** — type safety
- **Prisma ORM** — to talk to the database
- **PostgreSQL** (hosted on Neon) — the actual database

---

## Live Demo

The project is deployed on Render you can directly hit the endpoint without setting up anything locally:

**Base URL:** `https://bitespeed-ih0q.onrender.com`

Just open Postman (or any API client), make a `POST` request to:

```
https://bitespeed-ih0q.onrender.com/identify
```

Set the body to `raw → JSON` and send something like:

```json
{
  "email": "test@example.com",
  "phoneNumber": "9876543210"
}
```


> Note: it's on Render's free tier so the first request might take a few seconds if the server went to sleep. I can deploy it on aws but currently i am in little debt. 

---

## The only endpoint

### `POST /identify`

**Request Body:**
```json
{
  "email": "user@example.com",
  "phoneNumber": "9876543210"
}
```

At least one of `email` or `phoneNumber` must be provided. Sending neither returns a 400 error.

> Small thing I handled: if someone sends `phoneNumber` as a number (like `9876543210`) instead of a string, I convert it to string before processing. Saves a lot of headachee

**Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["virat@example.com", "kohli@example.com"],
    "phoneNumbers": ["9999999999", "8888888888"],
    "secondaryContactIds": [2, 3]
  }
}
```

The primary contact's email and phone always come first in the arrays.

---

## My Approach

I broke the whole logic into cases, and honestly thinking about it this way made it much cleaner.

### Case 1 — Completely new customer

If there's no existing contact matching the incoming email or phone number, I just create a fresh `primary` contact and return it.

Simple. No linking needed.

---

### Case 2 — Customer already exists (same info)

If the incoming email/phone already exists in the DB and there's nothing new being added, I just fetch all contacts in that group (the primary + all its secondaries) and return the consolidated data.

---

### Case 3 — Two separate contact groups need to be merged

This is the interesting one. Say someone earlier contacted us with email A and phone 1, and later contacted us with email B and phone 2. Both got stored as separate primaries. Now someone comes in with email A and phone 2 — this links the two groups together.

When I detect that the incoming request matches contacts from more than one primary group, I:
1. Sort all matched contacts by `createdAt` (oldest first)
2. Keep the oldest contact as the final `primary`
3. Demote all the newer primaries to `secondary` by setting their `linkedId` to the oldest primary's id
4. Also update any secondaries that were pointing to those newer primaries so they now point to the correct oldest primary

---

### Case 4 — Existing customer but with new info

If the incoming email or phone is something we haven't seen before, but the other piece of info already exists in our DB, I create a new `secondary` contact linked to the primary.

For example: customer uses the same phone number but a brand new email — I create a secondary contact with that new email, linked to the existing primary.

---

Both `email` and `phoneNumber` are optional because sometimes we only know one of them. `linkedId` is null for primary contacts and points to the primary's `id` for secondary ones.


## Postman Screenshots

### Brand new customer (Case 1)

<img width="650" height="400" alt="image" src="https://github.com/user-attachments/assets/9d3a26b2-fde8-4d79-b27d-6998f1447d3d" />

- This creates a new contact since nothing exists yet.
---

### Same info, existing customer (Case 2)
<img width="793" height="400" alt="image" src="https://github.com/user-attachments/assets/b4e00a85-333b-4ff1-a0dd-215c55b574f5" />

- Same request as above this time it just returns the consolidated data, no new contact created.
---

### Two groups merging (Case 3)
- First, create a second separate contact:
<img width="791" height="567" alt="image" src="https://github.com/user-attachments/assets/b9ae33b2-83b0-4885-a382-19596e2ffbc9" />

- Then fire the merge trigger, one piece from each group:
- This links both groups together. The older contact stays primary, the newer one gets demoted to secondary.

<img width="808" height="627" alt="image" src="https://github.com/user-attachments/assets/5c916cdb-960f-4838-957d-cc9df7334f8f" />

---

### New info added to existing contact (Case 4)

<img width="793" height="614" alt="image" src="https://github.com/user-attachments/assets/35938d09-5916-42a0-9b3c-3a6ef2a8ead9" />

- Same email, new phone number. A secondary contact gets created linked to the primary.
---

Thank youu 
