import {
  Controller,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { UserDto } from '@repo/shared';
import { CurrentUser } from '../auth/auth.decorators.js';
import { VisionService } from './vision.service.js';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/**
 * Prefixo: /vision  →  POST /vision/analyze  (multipart, campo "photo"; exige login)
 */
@Controller('vision')
export class VisionController {
  constructor(private readonly vision: VisionService) {}

  @Post('analyze')
  // Cada análise gasta quota (e dinheiro) do Gemini: limite apertado por IP.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  // limits: o multer corta o upload logo (antes de ler tudo para memória).
  @UseInterceptors(
    FileInterceptor('photo', { limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 0 } }),
  )
  analyze(
    @CurrentUser() user: UserDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        // Verifica o conteúdo real (magic numbers), não só o Content-Type enviado.
        .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp|heic|heif)$/ })
        .addMaxSizeValidator({ maxSize: MAX_PHOTO_BYTES })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    photo: Express.Multer.File,
  ) {
    return this.vision.analyze(user.id, photo.buffer, photo.mimetype);
  }
}
