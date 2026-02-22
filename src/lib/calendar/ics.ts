export interface CalendarEventData {
  title: string;
  description: string;
  location?: string;
  start: Date;
  end: Date;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name: string;
    email: string;
    rsvp?: boolean;
  }>;
}

/**
 * Generate .ics file content for calendar event
 * Returns the .ics file content as a string
 */
export function generateICS(data: CalendarEventData): string {
  const {
    title,
    description,
    location,
    start,
    end,
    organizer,
    attendees,
  } = data;

  // Format dates for ICS (YYYYMMDDTHHmmssZ)
  const formatDate = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  let ics = 'BEGIN:VCALENDAR\r\n';
  ics += 'VERSION:2.0\r\n';
  ics += 'PRODID:-//Puncto//Booking System//EN\r\n';
  ics += 'CALSCALE:GREGORIAN\r\n';
  ics += 'METHOD:REQUEST\r\n';
  ics += 'BEGIN:VEVENT\r\n';
  ics += `UID:${Date.now()}-${Math.random().toString(36).substr(2, 9)}@puncto.app\r\n`;
  ics += `DTSTAMP:${formatDate(new Date())}\r\n`;
  ics += `DTSTART:${formatDate(start)}\r\n`;
  ics += `DTEND:${formatDate(end)}\r\n`;
  ics += `SUMMARY:${escapeICSValue(title)}\r\n`;
  ics += `DESCRIPTION:${escapeICSValue(description)}\r\n`;

  if (location) {
    ics += `LOCATION:${escapeICSValue(location)}\r\n`;
  }

  if (organizer) {
    ics += `ORGANIZER;CN="${escapeICSValue(organizer.name)}":MAILTO:${organizer.email}\r\n`;
  }

  if (attendees && attendees.length > 0) {
    attendees.forEach((attendee) => {
      ics += `ATTENDEE;CN="${escapeICSValue(attendee.name)}";RSVP=${attendee.rsvp ? 'TRUE' : 'FALSE'}:MAILTO:${attendee.email}\r\n`;
    });
  }

  ics += 'STATUS:CONFIRMED\r\n';
  ics += 'SEQUENCE:0\r\n';
  ics += 'END:VEVENT\r\n';
  ics += 'END:VCALENDAR\r\n';

  return ics;
}

/**
 * Escape special characters for ICS format
 */
function escapeICSValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Create download link for .ics file
 */
export function downloadICS(data: CalendarEventData, filename: string = 'event.ics'): void {
  const icsContent = generateICS(data);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
