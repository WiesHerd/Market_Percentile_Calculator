import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Ensure logs directory exists
const LOG_DIR = path.join(process.cwd(), 'logs');

async function ensureLogDir() {
  try {
    await fs.access(LOG_DIR);
  } catch {
    await fs.mkdir(LOG_DIR, { recursive: true });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, data, error, timestamp } = body;

    // Ensure log directory exists
    await ensureLogDir();

    // Create log entry
    const logEntry = {
      timestamp: timestamp || new Date().toISOString(),
      event,
      data,
      error
    };

    // Write to file
    const logFile = path.join(LOG_DIR, `specialty-mapping-${new Date().toISOString().split('T')[0]}.log`);
    await fs.appendFile(
      logFile,
      JSON.stringify(logEntry) + '\n',
      'utf-8'
    );

    // If there's an error in the log, also write to error log
    if (error) {
      const errorLogFile = path.join(LOG_DIR, `errors-${new Date().toISOString().split('T')[0]}.log`);
      await fs.appendFile(
        errorLogFile,
        JSON.stringify(logEntry) + '\n',
        'utf-8'
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Write to emergency error log if logging itself fails
    const emergencyLog = path.join(process.cwd(), 'emergency.log');
    await fs.appendFile(
      emergencyLog,
      `${new Date().toISOString()} - Logging failed: ${error}\n`,
      'utf-8'
    );

    return NextResponse.json(
      { success: false, error: 'Failed to log event' },
      { status: 500 }
    );
  }
} 