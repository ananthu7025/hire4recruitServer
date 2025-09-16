# Authentication API Flow

This document describes the flow of project.

## Flow Overview

1. **Register Company**
   - POST `/auth/register-company`: Register a new company.
2. **Login**
   - POST `/auth/login`: User login to get a session token.
3. **After Login Actions**
   - GET `/auth/profile`: Retrieve user profile.
   - POST `/auth/invite-user`: Invite another user to the company.
   - POST `/auth/accept-invitation`: Accept an invitation to join a company.
   - POST `/auth/change-password`: Change user password.
   - POST `/auth/forgot-password`: Request a password reset link.
   - POST `/auth/reset-password`: Reset password using the link.
   - POST `/auth/logout`: Log out the user session.
   - POST `/auth/retry-payment`: Retry payment for pending subscription.
   - POST `/auth/verify-payment`: Verify payment and activate subscription.
   - GET `/auth/verify-token`: Validate the current auth token.
   - GET `/auth/permissions`: Get user permissions.
   - GET `/auth/subscription-plans`: Get available subscription plans.
   - GET `/auth/verify-email/{userId}`: Verify the user email address.

