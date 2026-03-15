import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { contentDisposition } from './content-disposition';
import { RateLimitGuard } from './rate-limit.guard';
import { RATE_LIMITS } from './rate-limit';
import { ExportDto } from './dto/export.dto';
import { DocumentExportService } from './document-export.service';

@UseGuards(JwtAuthGuard)
@Controller('export')
export class DocumentExportController {
  constructor(private readonly documentExportService: DocumentExportService) {}

  @Post()
  @UseGuards(RateLimitGuard)
  @Throttle({ default: RATE_LIMITS.documentExport })
  async exportDocument(@Body() body: ExportDto, @Req() req: any, @Res() res: Response) {
    const imageFetchHeaders: Record<string, string> = {};
    if (req.headers.cookie) {
      imageFetchHeaders['cookie'] = req.headers.cookie;
    }

    const result = await this.documentExportService.exportMarkdown(
      body.content,
      body.format,
      body.title,
      { imageFetchHeaders },
    );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', contentDisposition(result.filename));
    res.send(result.buffer);
  }
}
