import { IsArray, IsISO8601, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class SendWhatsappDto {
  @IsArray()
  @MinLength(1, { each: false })
  recipients!: string[]; // E.164 numbers like +14151234567

  @IsString()
  templateName!: string; // Approved template name

  @IsString()
  language!: string; // e.g., en_US

  @IsArray()
  @IsOptional()
  variables?: string[]; // Body variables for {{1}}, {{2}}, ...

  @IsUrl({ require_tld: false })
  @IsOptional()
  mediaUrl?: string; // Optional header media (image/doc/url)

  @IsISO8601()
  @IsOptional()
  scheduleAt?: string; // ISO date for delayed send
}
