# BUSINESS_RULES.md

## Championship Lifecycle

draft
registration_open
registration_closed
in_progress
finished
cancelled

## Registration Rules

A team can only register when:
championship.status = registration_open

## Match Rules

A match can only start when:
championship.status = in_progress

## Winner Rules

A winner can only be declared after all required matches are completed.

## Tenant Rules

Data from one tenant must never be visible to another tenant.

## Security Rules

Passwords must never be logged.
Tokens must never be logged.
Sensitive information must never be returned in API responses.
