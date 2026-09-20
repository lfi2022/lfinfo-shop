import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { MollieRecurringService } from './mollie-recurring.service';
@Controller('mollie-recurring') export class MollieRecurringController { constructor(private mollie: MollieRecurringService) {} @Post('webhook') @HttpCode(200) async webhook(@Body() body: { id?: string }) { if (body?.id) await this.mollie.webhook(body.id); } }
