# Troubleshooting Guide

## Database and Prisma Issues

### Issue 1: Survey Upload and Database Connection
**Problem**: Surveys could be viewed in Prisma Studio but not in the application. The "Uploaded Surveys" section was empty.

**Root Cause**: 
1. The application was using a mix of localStorage and database storage, causing inconsistency in data persistence
2. LocalStorage was previously used for storing large survey data, which caused memory issues

**Solution**:
1. Removed all localStorage references from the codebase
2. Updated the survey management page to use Prisma exclusively for data persistence
3. Modified the API endpoints to handle all data operations through the database
4. Ensured proper data refresh after operations by calling `loadSurveys()` after successful uploads

**Key Changes**:
1. Updated `src/app/survey-management/page.tsx`:
   - Removed localStorage operations
   - Added proper database fetching through API endpoints
   - Implemented proper state management using React state
2. Modified API endpoints to handle all data operations through Prisma

### Issue 2: Template Loading Error
**Problem**: Error when loading templates: "Failed to fetch templates" due to API endpoint mismatch

**Root Cause**: 
1. Frontend was calling `/api/mapping-templates` but the endpoint was at `/api/templates`
2. Schema mismatch between Prisma model and database (lastUsed field was removed in migration but still in schema)

**Solution**:
1. Updated API endpoint URL in frontend code
2. Removed `lastUsed` field from Prisma schema
3. Updated template sorting to use `updatedAt` instead of `lastUsed`
4. Regenerated Prisma client to reflect schema changes

**Key Changes**:
1. Updated Prisma schema to remove `lastUsed` field
2. Modified API endpoint to use correct sorting field
3. Updated frontend to use correct API endpoint path

## Best Practices Implemented

1. **Data Persistence**:
   - Use Prisma for all data operations
   - Avoid localStorage for large datasets
   - Implement proper error handling in API routes

2. **State Management**:
   - Use React state for UI components
   - Refresh data after successful operations
   - Implement proper loading states

3. **Error Handling**:
   - Add try-catch blocks in API routes
   - Show meaningful error messages to users
   - Log errors for debugging

## Current Known Issues

1. Prisma Client Type Error:
   ```typescript
   Property 'surveyTemplate' does not exist on type 'PrismaClient'
   ```
   - Need to regenerate Prisma client and verify model names match schema

2. Next.js Config Warning:
   ```
   Invalid next.config.js options detected: 
   Unrecognized key(s) in object: 'swcMinify'
   ```
   - Need to update Next.js configuration to remove deprecated options

## Upcoming Improvements

1. Implement proper error boundaries
2. Add loading states for all async operations
3. Add retry logic for failed API calls
4. Implement proper validation for all form inputs
5. Add comprehensive logging for debugging
6. Implement proper test coverage for critical paths 