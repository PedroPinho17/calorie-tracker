import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config.js';

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Só para o modo de desenvolvimento sem RESEND_API_KEY: o que mostrar no terminal. */
  devPreview?: string;
};

/**
 * Envia emails pela API HTTP do Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Sem RESEND_API_KEY: em desenvolvimento escreve no terminal; em produção não envia e avisa.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey?: string;
  private readonly from: string;
  private readonly isProduction: boolean;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get('RESEND_API_KEY', { infer: true });
    this.from = config.get('MAIL_FROM', { infer: true });
    this.isProduction = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  onModuleInit() {
    if (!this.apiKey && this.isProduction) {
      this.logger.warn('RESEND_API_KEY não está definido: os emails de recuperação não vão ser enviados.');
    }
  }

  async send(mail: Mail): Promise<void> {
    if (!this.apiKey) {
      if (this.isProduction) throw new Error('Envio de email não configurado (RESEND_API_KEY).');
      // Desenvolvimento: sem conta de email, mostra o conteúdo no terminal para poderes testar.
      this.logger.warn(`[email não enviado — sem RESEND_API_KEY] Para ${mail.to}: ${mail.devPreview ?? mail.subject}`);
      return;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // O corpo do erro do Resend não tem dados sensíveis (só o motivo).
      throw new Error(`Resend respondeu ${res.status}: ${await res.text().catch(() => '')}`);
    }
  }
}
