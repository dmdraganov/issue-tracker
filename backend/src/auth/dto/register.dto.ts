import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @ApiProperty({ example: 'Иван', maxLength: 100 })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ example: 'Иванов', maxLength: 100 })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  surname!: string;

  @ApiProperty({ example: 'ivan@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 40, writeOnly: true })
  @IsString()
  @Length(8, 40)
  password!: string;

  @ApiProperty({ minLength: 8, maxLength: 40, writeOnly: true })
  @IsString()
  @Length(8, 40)
  passwordConfirm!: string;
}
