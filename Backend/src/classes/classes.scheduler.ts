import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClassesService } from './classes.service';
import { ConfigService } from '@/config/config.service';

@Injectable()
export class ClassesScheduler {
  private readonly logger = new Logger(ClassesScheduler.name);

  constructor(
    private classesService: ClassesService,
    private configService: ConfigService
  ) {
    if (!this.configService.classBookingEnabled) {
      this.logger.log('Class booking disabled by feature flag — schedulers are no-ops');
    }
  }

  /**
   * Keeps the timetable populated to the horizon and closes off classes that
   * have finished.
   *
   * Runs at 3am, an hour after the membership pass, so the two are not
   * competing for the database at the same moment.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async extendTimetable() {
    if (!this.configService.classBookingEnabled) return;

    try {
      await this.classesService.generateHorizon();
    } catch (err) {
      // A generation failure must never take the process down — the timetable
      // still holds everything already generated, and tomorrow retries.
      this.logger.error(`Could not extend the timetable: ${(err as Error).message}`);
    }

    try {
      const completed = await this.classesService.completePastSessions();
      if (completed > 0) {
        this.logger.log(`Closed ${completed} finished session(s)`);
      }
    } catch (err) {
      this.logger.error(`Could not close finished sessions: ${(err as Error).message}`);
    }
  }
}
