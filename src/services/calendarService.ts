import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../config/logger';

export interface CalendarEvent {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  meetingLink?: string;
  timeZone?: string;
}

export interface CalendarProvider {
  type: 'google' | 'outlook';
  credentials: any;
  refreshToken?: string;
  accessToken?: string;
  expiryDate?: number;
}

export interface RecurringEvent extends CalendarEvent {
  recurrence: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
    count?: number;
  };
}

export class CalendarService {
  private static googleCalendar: calendar_v3.Calendar;
  private static oauth2Client: OAuth2Client;

  static async initialize() {
    try {
      // Initialize Google Calendar API
      this.oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Set credentials if available
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        this.oauth2Client.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          access_token: process.env.GOOGLE_ACCESS_TOKEN,
          expiry_date: process.env.GOOGLE_EXPIRY_DATE ? parseInt(process.env.GOOGLE_EXPIRY_DATE) : undefined
        });
      }

      this.googleCalendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      logger.info('Calendar service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize calendar service:', error);
      throw error;
    }
  }

  // Create a calendar event
  static async createEvent(eventData: CalendarEvent, provider: CalendarProvider = { type: 'google', credentials: {} }): Promise<string | null> {
    try {
      if (provider.type === 'google') {
        return await this.createGoogleEvent(eventData, provider);
      } else if (provider.type === 'outlook') {
        return await this.createOutlookEvent(eventData, provider);
      } else {
        throw new Error(`Unsupported calendar provider: ${provider.type}`);
      }
    } catch (error) {
      logger.error('Failed to create calendar event:', {
        title: eventData.title,
        startTime: eventData.startTime,
        provider: provider.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  private static async createGoogleEvent(eventData: CalendarEvent, provider: CalendarProvider): Promise<string | null> {
    try {
      // Update OAuth2 client if custom credentials provided
      if (provider.refreshToken || provider.accessToken) {
        const tempOAuth2Client = new OAuth2Client(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );

        tempOAuth2Client.setCredentials({
          refresh_token: provider.refreshToken,
          access_token: provider.accessToken,
          expiry_date: provider.expiryDate
        });

        const tempCalendar = google.calendar({ version: 'v3', auth: tempOAuth2Client });

        const eventResource: calendar_v3.Schema$Event = {
          summary: eventData.title,
          description: eventData.description,
          start: {
            dateTime: eventData.startTime.toISOString(),
            timeZone: eventData.timeZone || 'UTC'
          },
          end: {
            dateTime: eventData.endTime.toISOString(),
            timeZone: eventData.timeZone || 'UTC'
          },
          attendees: eventData.attendees.map(email => ({ email })),
          location: eventData.location,
          conferenceData: eventData.meetingLink ? {
            createRequest: {
              requestId: `meeting-${Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
          } : undefined,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 24 hours before
              { method: 'popup', minutes: 60 }       // 1 hour before
            ]
          }
        };

        const response = await tempCalendar.events.insert({
          calendarId: 'primary',
          resource: eventResource,
          conferenceDataVersion: eventData.meetingLink ? 1 : 0,
          sendUpdates: 'all'
        });

        logger.info('Google Calendar event created successfully', {
          eventId: response.data.id,
          title: eventData.title,
          startTime: eventData.startTime
        });

        return response.data.id || null;
      } else {
        // Use default OAuth2 client
        const eventResource: calendar_v3.Schema$Event = {
          summary: eventData.title,
          description: eventData.description,
          start: {
            dateTime: eventData.startTime.toISOString(),
            timeZone: eventData.timeZone || 'UTC'
          },
          end: {
            dateTime: eventData.endTime.toISOString(),
            timeZone: eventData.timeZone || 'UTC'
          },
          attendees: eventData.attendees.map(email => ({ email })),
          location: eventData.location,
          conferenceData: eventData.meetingLink ? {
            createRequest: {
              requestId: `meeting-${Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
          } : undefined,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 60 }
            ]
          }
        };

        const response = await this.googleCalendar.events.insert({
          calendarId: 'primary',
          resource: eventResource,
          conferenceDataVersion: eventData.meetingLink ? 1 : 0,
          sendUpdates: 'all'
        });

        logger.info('Google Calendar event created successfully', {
          eventId: response.data.id,
          title: eventData.title,
          startTime: eventData.startTime
        });

        return response.data.id || null;
      }
    } catch (error) {
      logger.error('Google Calendar event creation failed:', {
        title: eventData.title,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async createOutlookEvent(eventData: CalendarEvent, provider: CalendarProvider): Promise<string | null> {
    try {
      // For Outlook integration, you would typically use Microsoft Graph API
      // This is a placeholder implementation
      logger.info('Outlook calendar integration not yet implemented', {
        title: eventData.title,
        startTime: eventData.startTime
      });

      // Placeholder: In a real implementation, you would:
      // 1. Use Microsoft Graph API
      // 2. Authenticate with Azure AD
      // 3. Create the event using the Microsoft Graph SDK

      // For now, return a mock event ID
      const mockEventId = `outlook-${Date.now()}`;

      logger.info('Mock Outlook Calendar event created', {
        eventId: mockEventId,
        title: eventData.title,
        startTime: eventData.startTime
      });

      return mockEventId;
    } catch (error) {
      logger.error('Outlook Calendar event creation failed:', {
        title: eventData.title,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Update an existing calendar event
  static async updateEvent(eventId: string, eventData: Partial<CalendarEvent>, provider: CalendarProvider = { type: 'google', credentials: {} }): Promise<boolean> {
    try {
      if (provider.type === 'google') {
        return await this.updateGoogleEvent(eventId, eventData, provider);
      } else if (provider.type === 'outlook') {
        return await this.updateOutlookEvent(eventId, eventData, provider);
      } else {
        throw new Error(`Unsupported calendar provider: ${provider.type}`);
      }
    } catch (error) {
      logger.error('Failed to update calendar event:', {
        eventId,
        provider: provider.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private static async updateGoogleEvent(eventId: string, eventData: Partial<CalendarEvent>, provider: CalendarProvider): Promise<boolean> {
    try {
      const updateResource: Partial<calendar_v3.Schema$Event> = {};

      if (eventData.title) updateResource.summary = eventData.title;
      if (eventData.description) updateResource.description = eventData.description;
      if (eventData.startTime) {
        updateResource.start = {
          dateTime: eventData.startTime.toISOString(),
          timeZone: eventData.timeZone || 'UTC'
        };
      }
      if (eventData.endTime) {
        updateResource.end = {
          dateTime: eventData.endTime.toISOString(),
          timeZone: eventData.timeZone || 'UTC'
        };
      }
      if (eventData.attendees) updateResource.attendees = eventData.attendees.map(email => ({ email }));
      if (eventData.location) updateResource.location = eventData.location;

      const response = await this.googleCalendar.events.update({
        calendarId: 'primary',
        eventId,
        resource: updateResource,
        sendUpdates: 'all'
      });

      logger.info('Google Calendar event updated successfully', {
        eventId,
        title: eventData.title
      });

      return true;
    } catch (error) {
      logger.error('Google Calendar event update failed:', {
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async updateOutlookEvent(eventId: string, eventData: Partial<CalendarEvent>, provider: CalendarProvider): Promise<boolean> {
    // Placeholder for Outlook integration
    logger.info('Outlook calendar update not yet implemented', { eventId });
    return true;
  }

  // Delete a calendar event
  static async deleteEvent(eventId: string, provider: CalendarProvider = { type: 'google', credentials: {} }): Promise<boolean> {
    try {
      if (provider.type === 'google') {
        return await this.deleteGoogleEvent(eventId, provider);
      } else if (provider.type === 'outlook') {
        return await this.deleteOutlookEvent(eventId, provider);
      } else {
        throw new Error(`Unsupported calendar provider: ${provider.type}`);
      }
    } catch (error) {
      logger.error('Failed to delete calendar event:', {
        eventId,
        provider: provider.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private static async deleteGoogleEvent(eventId: string, provider: CalendarProvider): Promise<boolean> {
    try {
      await this.googleCalendar.events.delete({
        calendarId: 'primary',
        eventId,
        sendUpdates: 'all'
      });

      logger.info('Google Calendar event deleted successfully', { eventId });
      return true;
    } catch (error) {
      logger.error('Google Calendar event deletion failed:', {
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async deleteOutlookEvent(eventId: string, provider: CalendarProvider): Promise<boolean> {
    // Placeholder for Outlook integration
    logger.info('Outlook calendar deletion not yet implemented', { eventId });
    return true;
  }

  // Create a recurring event
  static async createRecurringEvent(eventData: RecurringEvent, provider: CalendarProvider = { type: 'google', credentials: {} }): Promise<string | null> {
    try {
      if (provider.type === 'google') {
        return await this.createGoogleRecurringEvent(eventData, provider);
      } else {
        throw new Error(`Recurring events not supported for provider: ${provider.type}`);
      }
    } catch (error) {
      logger.error('Failed to create recurring calendar event:', {
        title: eventData.title,
        frequency: eventData.recurrence.frequency,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  private static async createGoogleRecurringEvent(eventData: RecurringEvent, provider: CalendarProvider): Promise<string | null> {
    try {
      const recurrenceRule = this.buildGoogleRecurrenceRule(eventData.recurrence);

      const eventResource: calendar_v3.Schema$Event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: eventData.timeZone || 'UTC'
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: eventData.timeZone || 'UTC'
        },
        attendees: eventData.attendees.map(email => ({ email })),
        location: eventData.location,
        recurrence: [recurrenceRule],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 60 }
          ]
        }
      };

      const response = await this.googleCalendar.events.insert({
        calendarId: 'primary',
        resource: eventResource,
        sendUpdates: 'all'
      });

      logger.info('Google Calendar recurring event created successfully', {
        eventId: response.data.id,
        title: eventData.title,
        frequency: eventData.recurrence.frequency
      });

      return response.data.id || null;
    } catch (error) {
      logger.error('Google Calendar recurring event creation failed:', {
        title: eventData.title,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static buildGoogleRecurrenceRule(recurrence: RecurringEvent['recurrence']): string {
    let rule = `RRULE:FREQ=${recurrence.frequency.toUpperCase()}`;

    if (recurrence.interval > 1) {
      rule += `;INTERVAL=${recurrence.interval}`;
    }

    if (recurrence.count) {
      rule += `;COUNT=${recurrence.count}`;
    } else if (recurrence.endDate) {
      const endDateStr = recurrence.endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      rule += `;UNTIL=${endDateStr}`;
    }

    return rule;
  }

  // Check for calendar conflicts
  static async checkConflicts(startTime: Date, endTime: Date, attendees: string[], provider: CalendarProvider = { type: 'google', credentials: {} }): Promise<{ hasConflicts: boolean; conflicts: any[] }> {
    try {
      if (provider.type === 'google') {
        return await this.checkGoogleConflicts(startTime, endTime, attendees, provider);
      } else {
        // For other providers, return no conflicts for now
        return { hasConflicts: false, conflicts: [] };
      }
    } catch (error) {
      logger.error('Failed to check calendar conflicts:', {
        startTime,
        endTime,
        attendees,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { hasConflicts: false, conflicts: [] };
    }
  }

  private static async checkGoogleConflicts(startTime: Date, endTime: Date, attendees: string[], provider: CalendarProvider): Promise<{ hasConflicts: boolean; conflicts: any[] }> {
    try {
      const response = await this.googleCalendar.freebusy.query({
        resource: {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: attendees.map(email => ({ id: email }))
        }
      });

      const conflicts: any[] = [];
      let hasConflicts = false;

      if (response.data.calendars) {
        Object.entries(response.data.calendars).forEach(([email, calendar]) => {
          if (calendar.busy && calendar.busy.length > 0) {
            hasConflicts = true;
            conflicts.push({
              attendee: email,
              busyTimes: calendar.busy
            });
          }
        });
      }

      logger.info('Calendar conflict check completed', {
        hasConflicts,
        conflictCount: conflicts.length,
        attendees: attendees.length
      });

      return { hasConflicts, conflicts };
    } catch (error) {
      logger.error('Google Calendar conflict check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Get calendar availability
  static async getAvailability(attendees: string[], startDate: Date, endDate: Date, provider: CalendarProvider = { type: 'google', credentials: {} }): Promise<any[]> {
    try {
      const { hasConflicts, conflicts } = await this.checkConflicts(startDate, endDate, attendees, provider);

      if (!hasConflicts) {
        return [{
          start: startDate,
          end: endDate,
          available: true
        }];
      }

      // Process conflicts to find available slots
      // This is a simplified implementation
      return conflicts.map(conflict => ({
        attendee: conflict.attendee,
        busyTimes: conflict.busyTimes,
        available: false
      }));
    } catch (error) {
      logger.error('Failed to get calendar availability:', {
        attendees,
        startDate,
        endDate,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  // Generate OAuth URL for calendar authorization
  static generateAuthUrl(provider: 'google' | 'outlook' = 'google'): string {
    if (provider === 'google') {
      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ];

      return this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
      });
    } else {
      // For Outlook, you would return Microsoft OAuth URL
      return 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
    }
  }

  // Handle OAuth callback
  static async handleAuthCallback(code: string, provider: 'google' | 'outlook' = 'google'): Promise<any> {
    try {
      if (provider === 'google') {
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);

        logger.info('Google Calendar authorization successful');
        return tokens;
      } else {
        // Handle Outlook OAuth callback
        logger.info('Outlook Calendar authorization not yet implemented');
        return null;
      }
    } catch (error) {
      logger.error('Calendar authorization failed:', {
        provider,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

// Initialize calendar service when module is loaded
try {
  CalendarService.initialize();
} catch (error) {
  logger.error('Failed to initialize calendar service:', error);
}